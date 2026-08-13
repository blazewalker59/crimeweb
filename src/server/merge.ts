import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { currentUser } from "./auth";
import { db } from "@/db";
import { casePeople, cases, coverage, graphAudit, mediaItems, sources } from "@/db/schema";

/**
 * Merge and the Provisional Case lifecycle (issue #26).
 *
 * Merge is the primary correction operation on the case graph (ADR-0001).
 * It closes the gap extraction leaves: where two Media Items describe the same
 * incident but name it differently, extraction mints two Cases, and only a
 * human can see they are one.
 *
 * Candidates are suggested by shared person name — the same signal extraction
 * resolves on, applied across already-minted Cases rather than at ingest.
 */

export interface CoverageDetail {
  sourceName: string;
  mediaTitle: string;
  mediaOverview: string | null;
  releasedAt: string | null;
  status: string;
  confidence: number | null;
}

export interface MergeCandidate {
  caseId: string;
  displayTitle: string;
  summary: string | null;
  location: string | null;
  occurredYear: number | null;
  isProvisional: boolean;
  coverageCount: number;
  /** Victims and perpetrators, with role — the primary judgement material. */
  people: Array<{ name: string; role: string }>;
  /** The actual episodes behind the Case. Without these there is nothing to
   *  decide on: a title and a count cannot tell you whether two Cases are one
   *  incident, or whether a provisional Case is real. */
  coverage: Array<CoverageDetail>;
}

export interface MergePair {
  sharedName: string;
  left: MergeCandidate;
  right: MergeCandidate;
}

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

async function candidate(caseId: string): Promise<MergeCandidate | null> {
  const d = db();
  const [c] = await d
    .select({
      id: cases.id,
      displayTitle: cases.displayTitle,
      summary: cases.summary,
      location: cases.location,
      occurredYear: cases.occurredYear,
      isProvisional: cases.isProvisional,
    })
    .from(cases)
    .where(eq(cases.id, caseId));
  if (!c) return null;

  const people = await d
    .select({ name: casePeople.name, role: casePeople.role })
    .from(casePeople)
    .where(eq(casePeople.caseId, caseId));

  const covs = await d
    .select({
      sourceName: sources.name,
      mediaTitle: mediaItems.title,
      mediaOverview: mediaItems.overview,
      releasedAt: mediaItems.releasedAt,
      status: coverage.status,
      confidence: coverage.confidence,
    })
    .from(coverage)
    .innerJoin(mediaItems, eq(mediaItems.id, coverage.mediaItemId))
    .innerJoin(sources, eq(sources.id, mediaItems.sourceId))
    .where(eq(coverage.caseId, caseId));

  return {
    caseId: c.id,
    displayTitle: c.displayTitle,
    summary: c.summary,
    location: c.location,
    occurredYear: c.occurredYear,
    isProvisional: c.isProvisional,
    coverageCount: covs.length,
    people: people.map((p) => ({ name: p.name, role: p.role })),
    coverage: covs.map((cv) => ({
      sourceName: cv.sourceName,
      mediaTitle: cv.mediaTitle,
      mediaOverview: cv.mediaOverview,
      releasedAt: cv.releasedAt ? cv.releasedAt.toISOString().slice(0, 10) : null,
      status: cv.status,
      confidence: cv.confidence,
    })),
  };
}

/**
 * Case pairs sharing a person name — the merge queue.
 *
 * Judging a merge needs both cases visible side by side, which no discovery
 * surface provides. That was variant B of the correction-surface prototype: it
 * lost as the primary surface, but it is the right shape for this decision.
 */
export const listMergeCandidates = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<MergePair>> => {
    const rows = await db().all<{ nm: string; ids: string }>(sql`
      SELECT lower(cp.name) AS nm, group_concat(DISTINCT cp.case_id) AS ids
      FROM case_people cp
      JOIN cases c ON c.id = cp.case_id AND c.merged_into IS NULL
      GROUP BY lower(cp.name)
      HAVING count(DISTINCT cp.case_id) > 1
      LIMIT 25
    `);

    const pairs: Array<MergePair> = [];
    for (const r of rows) {
      const [a, b] = r.ids.split(",");
      if (!a || !b) continue;
      const left = await candidate(a);
      const right = await candidate(b);
      if (left && right) pairs.push({ sharedName: r.nm, left, right });
    }
    return pairs;
  },
);

export const listProvisionalCases = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<MergeCandidate>> => {
    const rows = await db()
      .select({ id: cases.id })
      .from(cases)
      .where(and(eq(cases.isProvisional, true), isNull(cases.mergedInto)))
      .limit(50);
    const out: Array<MergeCandidate> = [];
    for (const r of rows) {
      const c = await candidate(r.id);
      if (c) out.push(c);
    }
    return out;
  },
);

/**
 * Merge `loser` into `survivor`: Coverage moves across, `merged_into` is set.
 * Nothing is deleted — reads follow the chain and merged-away Cases simply
 * never surface, which is what makes the merge reversible.
 */
export const mergeCases = createServerFn({ method: "POST" })
  .inputValidator((input: { loserId: string; survivorId: string }) => input)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const d = db();
    const now = new Date();
    if (data.loserId === data.survivorId) throw new Error("Cannot merge a case into itself");

    const moved = await d
      .update(coverage)
      .set({ caseId: data.survivorId })
      .where(eq(coverage.caseId, data.loserId))
      .returning({ id: coverage.id });

    await d
      .update(cases)
      .set({ mergedInto: data.survivorId, updatedAt: now })
      .where(eq(cases.id, data.loserId));

    await d.insert(graphAudit).values({
      id: `ga_merge_${data.loserId}_${now.getTime()}`,
      entityType: "case",
      entityId: data.loserId,
      action: "merge",
      actorId: user.id,
      detail: {
        before: { mergedInto: null },
        after: { mergedInto: data.survivorId },
        movedCoverage: moved.map((m) => m.id),
      },
      at: now,
    });
    return { ok: true, moved: moved.length };
  });

/** Undo a merge: Coverage returns to the loser and `merged_into` is cleared. */
export const reverseMerge = createServerFn({ method: "POST" })
  .inputValidator((auditId: string) => String(auditId))
  .handler(async ({ data: auditId }) => {
    const user = await requireUser();
    const d = db();
    const now = new Date();

    const [audit] = await d.select().from(graphAudit).where(eq(graphAudit.id, auditId));
    if (!audit || audit.action !== "merge") throw new Error("Not a merge audit entry");
    const detail = audit.detail as { movedCoverage?: Array<string> } | null;

    for (const covId of detail?.movedCoverage ?? []) {
      await d.update(coverage).set({ caseId: audit.entityId }).where(eq(coverage.id, covId));
    }
    await d
      .update(cases)
      .set({ mergedInto: null, updatedAt: now })
      .where(eq(cases.id, audit.entityId));

    await d.insert(graphAudit).values({
      id: `ga_unmerge_${audit.entityId}_${now.getTime()}`,
      entityType: "case",
      entityId: audit.entityId,
      action: "reverse",
      actorId: user.id,
      detail: { reversed: auditId },
      at: now,
    });
    return { ok: true };
  });

/** A Provisional Case stops being provisional when a human confirms it. */
export const confirmProvisional = createServerFn({ method: "POST" })
  .inputValidator((caseId: string) => String(caseId))
  .handler(async ({ data: caseId }) => {
    const user = await requireUser();
    const d = db();
    const now = new Date();

    await d
      .update(cases)
      .set({ isProvisional: false, updatedAt: now })
      .where(and(eq(cases.id, caseId), ne(cases.isProvisional, false)));

    await d.insert(graphAudit).values({
      id: `ga_conf_${caseId}_${now.getTime()}`,
      entityType: "case",
      entityId: caseId,
      action: "confirm",
      actorId: user.id,
      detail: { before: { isProvisional: true }, after: { isProvisional: false } },
      at: now,
    });
    return { ok: true };
  });
