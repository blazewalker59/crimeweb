import { createServerFn } from "@tanstack/react-start";
import { desc, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * Cases ordered by Heat.
 *
 * Heat is computed at READ time from the two stored inputs, so it never goes
 * stale between cron runs — see docs/v2-schema.md and issue #11. The 7776000 is
 * the 90-day decay window in seconds, taken from the measured 50-day median
 * span between first and last coverage of the same case.
 *
 * Merged-away cases are excluded; reads follow `merged_into`.
 */
export const listCasesByHeat = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db()
    .select({
      id: cases.id,
      displayTitle: cases.displayTitle,
      summary: cases.summary,
      location: cases.location,
      occurredYear: cases.occurredYear,
      isProvisional: cases.isProvisional,
      lastCoverageAt: cases.lastCoverageAt,
      sourceCount90d: cases.sourceCount90d,
      heat: sql<number>`
        (1.0 + 2.0 * ${cases.sourceCount90d})
        * exp(-(unixepoch() - coalesce(${cases.lastCoverageAt}, 0)) / 7776000.0)
      `.as("heat"),
    })
    .from(cases)
    .where(isNull(cases.mergedInto))
    .orderBy(desc(sql`heat`));

  return rows;
});
