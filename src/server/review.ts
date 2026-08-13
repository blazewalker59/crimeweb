import { createServerFn } from "@tanstack/react-start";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { currentUser } from "./auth";
import { db } from "@/db";
import { cases, coverage, graphAudit, mediaItems, sources } from "@/db/schema";

/**
 * The correction surface (issue #15, #25).
 *
 * ADR-0002 deliberately ships no approval flow and no moderation queue: the
 * audit trail plus one-click reversal IS the entire error-correction
 * mechanism. So this surface carries a lot of weight.
 *
 * The queue is ordered by confidence ASCENDING — least certain first. That is
 * exactly what `coverage_status_idx (status, confidence)` exists to serve.
 */

export interface ReviewItem {
  coverageId: string;
  confidence: number | null;
  sourceName: string;
  mediaTitle: string;
  mediaOverview: string | null;
  caseId: string;
  caseTitle: string;
  caseIsProvisional: boolean;
}

export interface ReviewedItem {
  auditId: string;
  coverageId: string;
  action: string;
  at: string;
  actorName: string | null;
  mediaTitle: string;
  caseTitle: string;
}

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

export const listReviewQueue = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<ReviewItem>> => {
    const rows = await db()
      .select({
        coverageId: coverage.id,
        confidence: coverage.confidence,
        sourceName: sources.name,
        mediaTitle: mediaItems.title,
        mediaOverview: mediaItems.overview,
        caseId: cases.id,
        caseTitle: cases.displayTitle,
        caseIsProvisional: cases.isProvisional,
      })
      .from(coverage)
      .innerJoin(mediaItems, eq(mediaItems.id, coverage.mediaItemId))
      .innerJoin(sources, eq(sources.id, mediaItems.sourceId))
      .innerJoin(cases, eq(cases.id, coverage.caseId))
      .where(eq(coverage.status, "proposed"))
      .orderBy(asc(coverage.confidence))
      .limit(100);
    return rows;
  },
);

/** Recently reviewed, so a mistake can be undone. Reversal is the only
 *  error-correction mechanism there is — it needs somewhere to happen. */
export const listRecentlyReviewed = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<ReviewedItem>> => {
    const audits = await db()
      .select()
      .from(graphAudit)
      .where(eq(graphAudit.entityType, "coverage"))
      .orderBy(desc(graphAudit.at))
      .limit(20);
    if (audits.length === 0) return [];

    const covs = await db()
      .select({
        id: coverage.id,
        mediaTitle: mediaItems.title,
        caseTitle: cases.displayTitle,
      })
      .from(coverage)
      .innerJoin(mediaItems, eq(mediaItems.id, coverage.mediaItemId))
      .innerJoin(cases, eq(cases.id, coverage.caseId))
      .where(
        inArray(
          coverage.id,
          audits.map((a) => a.entityId),
        ),
      );
    const byId = new Map(covs.map((c) => [c.id, c]));

    return audits
      .filter((a) => byId.has(a.entityId))
      .map((a) => ({
        auditId: a.id,
        coverageId: a.entityId,
        action: a.action,
        at: a.at.toISOString(),
        actorName: a.actorId,
        mediaTitle: byId.get(a.entityId)?.mediaTitle ?? "",
        caseTitle: byId.get(a.entityId)?.caseTitle ?? "",
      }));
  },
);

async function decide(coverageId: string, decision: "confirmed" | "rejected") {
  const user = await requireUser();
  const d = db();
  const now = new Date();

  const [before] = await d.select().from(coverage).where(eq(coverage.id, coverageId));
  if (!before) throw new Error("Coverage not found");

  await d
    .update(coverage)
    .set({ status: decision, reviewedBy: user.id, reviewedAt: now })
    .where(eq(coverage.id, coverageId));

  // Attribution is what makes reversal safe: the audit row carries who, what
  // and the before/after, so an undo knows what to restore.
  await d.insert(graphAudit).values({
    id: `ga_${coverageId}_${now.getTime()}`,
    entityType: "coverage",
    entityId: coverageId,
    action: decision === "confirmed" ? "confirm" : "reject",
    actorId: user.id,
    detail: { before: { status: before.status }, after: { status: decision } },
    at: now,
  });
  return { ok: true };
}

export const confirmCoverage = createServerFn({ method: "POST" })
  .inputValidator((coverageId: string) => String(coverageId))
  .handler(async ({ data }) => decide(data, "confirmed"));

export const rejectCoverage = createServerFn({ method: "POST" })
  .inputValidator((coverageId: string) => String(coverageId))
  .handler(async ({ data }) => decide(data, "rejected"));

/**
 * Undo a review. Restores the previous status from the audit row's `before`
 * and appends a `reverse` entry rather than deleting anything — history is
 * what makes reversal safe, so it must not be erasable.
 */
export const reverseReview = createServerFn({ method: "POST" })
  .inputValidator((auditId: string) => String(auditId))
  .handler(async ({ data: auditId }) => {
    const user = await requireUser();
    const d = db();
    const now = new Date();

    const [audit] = await d.select().from(graphAudit).where(eq(graphAudit.id, auditId));
    if (!audit) throw new Error("Audit entry not found");

    const detail = audit.detail as { before?: { status?: string } } | null;
    const previous = detail?.before?.status;
    if (previous !== "proposed" && previous !== "confirmed" && previous !== "rejected") {
      throw new Error("Audit entry has no restorable status");
    }

    await d
      .update(coverage)
      .set({ status: previous, reviewedBy: null, reviewedAt: null })
      .where(eq(coverage.id, audit.entityId));

    await d.insert(graphAudit).values({
      id: `ga_${audit.entityId}_${now.getTime()}`,
      entityType: "coverage",
      entityId: audit.entityId,
      action: "reverse",
      actorId: user.id,
      detail: { before: { status: audit.action }, after: { status: previous }, reversed: auditId },
      at: now,
    });
    return { ok: true };
  });
