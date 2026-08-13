import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
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

export interface Extracted {
  caseTitle: string;
  victims: Array<string>;
  perpetrators: Array<string>;
  location: string | null;
  year: number | null;
  confidence: number;
}

const SCHEMA = {
  type: "object",
  properties: {
    caseTitle: { type: "string" },
    victims: { type: "array", items: { type: "string" } },
    perpetrators: { type: "array", items: { type: "string" } },
    location: { type: ["string", "null"] },
    year: { type: ["number", "null"] },
    confidence: { type: "number" },
  },
  required: ["caseTitle", "victims", "perpetrators", "location", "year", "confidence"],
} as const;

const SYSTEM = [
  "You extract structured facts about a single criminal case from true crime TV metadata.",
  "A Case is ONE criminal incident, regardless of how many victims or perpetrators.",
  "Use only names that appear in the supplied text. Never guess or infer a name.",
  "caseTitle: a short neutral label, e.g. 'Murder of Jane Doe' or a descriptive phrase when no name is given.",
  "location: place of the crime if stated, else null. year: year of the CRIME if stated, else null.",
  "confidence: 0..1, how confidently this text identifies one specific real case.",
  "If no person is named and the incident is described only generically, use a descriptive caseTitle and confidence below 0.5.",
].join(" ");

/** Strict parse. A malformed response is a failure, not something to salvage —
 *  guessing here is how wrong links reach a graph that has no moderation. */
/**
 * Workers AI response shape varies by model. llama-4-scout returns the
 * OpenAI-style `choices[0].message.content`; other models return
 * `{ response }`, and some return a bare string. Normalise here rather than
 * hunting for JSON between braces, which is what dinnertable's ai.ts had to do.
 */
function responseText(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (typeof raw !== "object" || raw === null) return null;

  const r = raw as {
    response?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  if (typeof r.response === "string") return r.response;
  const content = r.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  return null;
}

export function parseExtraction(raw: unknown): Extracted | null {
  const text = responseText(raw);
  if (text === null) return null;

  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  const o = obj as Partial<Extracted>;
  if (typeof o.caseTitle !== "string" || o.caseTitle.trim().length === 0) return null;
  if (!Array.isArray(o.victims) || !Array.isArray(o.perpetrators)) return null;
  if (typeof o.confidence !== "number" || Number.isNaN(o.confidence)) return null;

  return {
    caseTitle: o.caseTitle.trim(),
    victims: o.victims.filter((v): v is string => typeof v === "string" && v.trim().length > 0),
    perpetrators: o.perpetrators.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    ),
    location: typeof o.location === "string" && o.location.length > 0 ? o.location : null,
    year: typeof o.year === "number" && o.year > 1800 && o.year < 2100 ? o.year : null,
    confidence: Math.max(0, Math.min(1, o.confidence)),
  };
}

export async function extractOne(
  title: string,
  overview: string | null,
): Promise<Extracted | null> {
  const raw = await env.AI.run(
    MODEL as never,
    {
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Title: ${title}\nOverview: ${overview ?? "(none)"}` },
      ],
      response_format: { type: "json_schema", json_schema: SCHEMA },
    } as never,
  );
  return parseExtraction(raw);
}

/** Normalised person name, for matching across sources. */
export const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Normalised media title, for within-source duplicate detection. */
export const normTitle = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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
