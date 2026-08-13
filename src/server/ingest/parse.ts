/**
 * Pure extraction helpers — no I/O, no Workers bindings.
 *
 * Split out from extract.ts so they are unit-testable: vitest runs in node,
 * where `cloudflare:workers` cannot resolve. Keeping the parsing and
 * normalisation here also means the tricky parts (model response shapes,
 * name normalisation) are covered by tests rather than only exercised in a
 * live Worker.
 */

export interface Extracted {
  caseTitle: string;
  victims: Array<string>;
  perpetrators: Array<string>;
  location: string | null;
  year: number | null;
  confidence: number;
}

export const MODEL_SCHEMA = {
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

export const MODEL_SYSTEM = [
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

/**
 * Normalised person name, for matching across sources.
 *
 * Strips punctuation but KEEPS accented letters. An earlier version used
 * `[^a-z\s]`, which silently deleted them: "JonBenét Ramsey" became
 * "jonbent ramsey" while the SQL side compared `lower(name)` =
 * "jonbenét ramsey". They could never match, so extraction structurally could
 * not link any case whose name carried an accent — which is exactly why the
 * JonBenét Ramsey pair was minted as two Cases.
 */
export const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Normalised media title, for within-source duplicate detection. */
export const normTitle = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
