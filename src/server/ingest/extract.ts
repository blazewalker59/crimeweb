import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import {
  MODEL_SCHEMA,
  MODEL_SYSTEM,
  normName,
  normTitle,
  parseExtraction,
  type Extracted,
} from "./parse";
import { db } from "@/db";
import { casePeople, cases, coverage, mediaItems } from "@/db/schema";

/**
 * The EXTRACTION phase of ingest.
 *
 * Replaces the v1 fuzzy matcher (ADR-0003), which had no usable operating
 * point: 19% precision at 55% recall, or 100% at 18%. It scored the Menendez
 * pair at zero despite Dateline and 20/20 sharing the literal string "The
 * Menendez Brothers", because its extractor returned no names for one and the
 * garbage term "freedom latest" for the other.
 *
 * An LLM reads title + overview and emits structured Case attributes;
 * resolution then runs over those attributes rather than over raw strings.
 * Links at or above CONFIRM_THRESHOLD apply automatically; anything below is
 * written as `proposed` for a human to judge in the correction surface.
 */

const MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

/** At or above this, a Coverage link applies without human review. */
const CONFIRM_THRESHOLD = 0.75;

/** Bounded so a run cannot exceed the Worker's CPU budget. Leftovers stay
 *  `pending` and the next cron picks them up — the queue drains over runs. */
const DEFAULT_BATCH = 25;

export async function extractOne(
  title: string,
  overview: string | null,
): Promise<Extracted | null> {
  const raw = await env.AI.run(
    MODEL as never,
    {
      messages: [
        { role: "system", content: MODEL_SYSTEM },
        { role: "user", content: `Title: ${title}\nOverview: ${overview ?? "(none)"}` },
      ],
      response_format: { type: "json_schema", json_schema: MODEL_SCHEMA },
    } as never,
  );
  return parseExtraction(raw);
}

export interface ExtractReport {
  processed: number;
  failed: number;
  casesCreated: number;
  provisional: number;
  coverageConfirmed: number;
  coverageProposed: number;
  duplicatesFlagged: number;
}

export async function extractPending(
  batch = DEFAULT_BATCH,
  now = new Date(),
): Promise<ExtractReport> {
  const d = db();
  const report: ExtractReport = {
    processed: 0,
    failed: 0,
    casesCreated: 0,
    provisional: 0,
    coverageConfirmed: 0,
    coverageProposed: 0,
    duplicatesFlagged: 0,
  };

  const pending = await d
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.extractionStatus, "pending"))
    .limit(batch);

  for (const item of pending) {
    // Within-source duplicate: same Source, same normalised title. 13% of the
    // v1 catalogue, 32 of them in The First 48. They differ only by reworded
    // prose, so this is checked before spending an LLM call.
    const siblings = await d
      .select({ id: mediaItems.id, title: mediaItems.title })
      .from(mediaItems)
      .where(
        and(
          eq(mediaItems.sourceId, item.sourceId),
          ne(mediaItems.id, item.id),
          isNull(mediaItems.duplicateOf),
          eq(mediaItems.extractionStatus, "extracted"),
        ),
      );
    const dup = siblings.find((s) => normTitle(s.title) === normTitle(item.title));
    if (dup) {
      await d
        .update(mediaItems)
        .set({ duplicateOf: dup.id, extractionStatus: "extracted", extractedAt: now })
        .where(eq(mediaItems.id, item.id));
      report.duplicatesFlagged++;
      report.processed++;
      continue;
    }

    let extracted: Extracted | null = null;
    try {
      extracted = await extractOne(item.title, item.overview);
      if (!extracted) console.error(`[extract] unparseable response for ${item.id}`);
    } catch (err) {
      console.error(
        `[extract] AI call threw for ${item.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      extracted = null;
    }

    if (!extracted) {
      await d
        .update(mediaItems)
        .set({ extractionStatus: "failed", extractedAt: now })
        .where(eq(mediaItems.id, item.id));
      report.failed++;
      report.processed++;
      continue;
    }

    // Resolve onto an existing Case by named person. Names are the most
    // available signal (~85% of items); location and year are present in only
    // 34% and 14%, so they cannot carry identity.
    const names = [...extracted.victims, ...extracted.perpetrators].map(normName).filter(Boolean);
    let caseId: string | null = null;
    if (names.length > 0) {
      const hits = await d
        .select({ caseId: casePeople.caseId, name: casePeople.name })
        .from(casePeople)
        .where(inArray(sql`lower(${casePeople.name})`, names));
      caseId = hits[0]?.caseId ?? null;
    }

    const isProvisional = names.length === 0 || extracted.confidence < 0.5;

    if (caseId === null) {
      caseId = `case_${item.tmdbId}`;
      await d.insert(cases).values({
        id: caseId,
        displayTitle: extracted.caseTitle,
        location: extracted.location,
        occurredYear: extracted.year,
        isProvisional,
        enrichmentStatus: "none",
        lastCoverageAt: item.releasedAt,
        sourceCount90d: 0,
        createdAt: now,
        updatedAt: now,
      });
      report.casesCreated++;
      if (isProvisional) report.provisional++;

      for (const [role, list] of [
        ["victim", extracted.victims],
        ["perpetrator", extracted.perpetrators],
      ] as const) {
        for (const name of list) {
          await d
            .insert(casePeople)
            .values({
              id: `cp_${item.tmdbId}_${role}_${normName(name).replace(/\s/g, "_")}`,
              caseId,
              name,
              role,
              provenance: "llm",
            })
            .onConflictDoNothing();
        }
      }
    }

    const status = extracted.confidence >= CONFIRM_THRESHOLD ? "confirmed" : "proposed";
    await d
      .insert(coverage)
      .values({
        id: `cov_${item.tmdbId}`,
        mediaItemId: item.id,
        caseId,
        confidence: extracted.confidence,
        provenance: "llm",
        status,
        createdAt: now,
      })
      .onConflictDoNothing();
    if (status === "confirmed") report.coverageConfirmed++;
    else report.coverageProposed++;

    await d
      .update(mediaItems)
      .set({ extractionStatus: "extracted", extractedAt: now })
      .where(eq(mediaItems.id, item.id));
    report.processed++;
  }

  return report;
}
