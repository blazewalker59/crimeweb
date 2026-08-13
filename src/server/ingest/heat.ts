import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Recompute the two stored Heat inputs.
 *
 * Heat itself is computed at READ time (see docs/v2-schema.md), but its inputs
 * are stored. `source_count_90d` is a SLIDING WINDOW, so it goes stale even
 * when no new coverage arrives: a Case with two Sources 89 days ago must drop
 * to one tomorrow with nothing having changed.
 *
 * That makes this a correctness requirement rather than an optimisation — it
 * has to run every cron, not only when ingest inserts something.
 *
 * Only `confirmed` coverage counts. A `proposed` link is a machine guess
 * awaiting a human (ADR-0003); letting it inflate Heat would put unreviewed
 * guesses at the top of the feed.
 */
export async function recomputeHeatInputs(): Promise<number> {
  const d = db();

  await d.run(sql`
    UPDATE cases SET
      last_coverage_at = (
        SELECT max(m.released_at)
        FROM coverage cv JOIN media_items m ON m.id = cv.media_item_id
        WHERE cv.case_id = cases.id AND cv.status = 'confirmed'
      ),
      source_count_90d = (
        SELECT count(DISTINCT m.source_id)
        FROM coverage cv JOIN media_items m ON m.id = cv.media_item_id
        WHERE cv.case_id = cases.id
          AND cv.status = 'confirmed'
          AND m.released_at >= unixepoch() - 7776000
      )
    WHERE cases.merged_into IS NULL
  `);

  const [row] = await d.all<{ n: number }>(
    sql`SELECT count(*) AS n FROM cases WHERE merged_into IS NULL`,
  );
  return row?.n ?? 0;
}
