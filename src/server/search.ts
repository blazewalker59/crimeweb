import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Full-text search over Cases and Media Items, backed by D1's FTS5.
 *
 * Raw SQL because Drizzle does not model virtual tables. Both indexes are
 * external-content, so the FTS tables hold no duplicate text and the triggers
 * in drizzle/0001_fts.sql keep them in step.
 */

export interface CaseHit {
  id: string;
  displayTitle: string;
  summary: string | null;
  location: string | null;
  isProvisional: boolean;
  sourceCount90d: number;
}

export interface MediaHit {
  id: string;
  title: string;
  overview: string | null;
  sourceName: string;
  releasedAt: string | null;
  caseId: string | null;
  caseTitle: string | null;
}

/** FTS5 treats punctuation as syntax, so a raw query can be a syntax error. */
function toMatchQuery(raw: string): string | null {
  const terms = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (terms.length === 0) return null;
  // Prefix-match the last term so search feels responsive as you type.
  return terms.map((t, i) => (i === terms.length - 1 ? `${t}*` : t)).join(" AND ");
}

export const search = createServerFn({ method: "GET" })
  .inputValidator((q: string) => String(q))
  .handler(async ({ data }): Promise<{ cases: Array<CaseHit>; media: Array<MediaHit> }> => {
    const match = toMatchQuery(data);
    if (!match) return { cases: [], media: [] };
    const d = db();

    const cases = await d.all<CaseHit>(sql`
      SELECT c.id, c.display_title AS displayTitle, c.summary, c.location,
             c.is_provisional AS isProvisional, c.source_count_90d AS sourceCount90d
      FROM cases_fts f
      JOIN cases c ON c.rowid = f.rowid
      WHERE cases_fts MATCH ${match} AND c.merged_into IS NULL
      ORDER BY rank
      LIMIT 25
    `);

    const media = await d.all<MediaHit>(sql`
      SELECT m.id, m.title, m.overview, s.name AS sourceName,
             CASE WHEN m.released_at IS NULL THEN NULL
                  ELSE date(m.released_at, 'unixepoch') END AS releasedAt,
             cv.case_id AS caseId, c.display_title AS caseTitle
      FROM media_fts f
      JOIN media_items m ON m.rowid = f.rowid
      JOIN sources s ON s.id = m.source_id
      LEFT JOIN coverage cv ON cv.media_item_id = m.id
      LEFT JOIN cases c ON c.id = cv.case_id
      WHERE media_fts MATCH ${match}
      ORDER BY rank
      LIMIT 25
    `);

    return { cases, media };
  });
