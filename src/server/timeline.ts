import { createServerFn } from "@tanstack/react-start";
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cases, coverage, mediaItems, sources } from "@/db/schema";

/**
 * The coverage timeline — every release, newest first (issue #14).
 *
 * Chronological rather than Heat-ranked. That is a presentation choice, not a
 * reversal of the ranking decision in #11: Heat still exists and still ranks
 * Cases on /cases. What the timeline adds is the TEMPORAL relationship between
 * coverage, which is what "seeing what the sources are covering lately"
 * actually means — a ranked grid puts cases in order, a timeline shows sources
 * converging.
 */

export interface TimelineSibling {
  id: string;
  sourceName: string;
  title: string;
  releasedAt: string | null;
  gapDays: number | null;
}

export interface TimelineEvent {
  id: string;
  sourceName: string;
  title: string;
  /** TMDb still path, or null. Only ~68% of items have one, and The First 48
   *  has none at all — the UI must degrade, not leave holes. */
  stillPath: string | null;
  releasedAt: string | null;
  caseId: string;
  caseTitle: string;
  isProvisional: boolean;
  proposed: boolean;
  siblings: Array<TimelineSibling>;
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export const listTimeline = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<TimelineEvent>> => {
    const rows = await db()
      .select({
        coverageId: coverage.id,
        status: coverage.status,
        mediaId: mediaItems.id,
        title: mediaItems.title,
        stillPath: mediaItems.stillPath,
        releasedAt: mediaItems.releasedAt,
        sourceName: sources.name,
        caseId: cases.id,
        caseTitle: cases.displayTitle,
        isProvisional: cases.isProvisional,
      })
      .from(coverage)
      .innerJoin(mediaItems, eq(mediaItems.id, coverage.mediaItemId))
      .innerJoin(sources, eq(sources.id, mediaItems.sourceId))
      .innerJoin(cases, eq(cases.id, coverage.caseId))
      // Merged-away cases never surface; reads follow the chain.
      .where(isNull(cases.mergedInto))
      .orderBy(desc(mediaItems.releasedAt))
      .limit(150);

    // Group by case so each event can name where else it was covered.
    const byCase = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = byCase.get(r.caseId) ?? [];
      list.push(r);
      byCase.set(r.caseId, list);
    }

    return rows.map((r) => {
      const family = byCase.get(r.caseId) ?? [];
      const siblings = family
        .filter((s) => s.mediaId !== r.mediaId && s.sourceName !== r.sourceName)
        .map((s) => ({
          id: s.mediaId,
          sourceName: s.sourceName,
          title: s.title,
          releasedAt: iso(s.releasedAt),
          gapDays:
            s.releasedAt && r.releasedAt
              ? Math.round(Math.abs(s.releasedAt.getTime() - r.releasedAt.getTime()) / 86400000)
              : null,
        }))
        .sort((a, b) => ((a.releasedAt ?? "") < (b.releasedAt ?? "") ? 1 : -1));

      return {
        id: r.coverageId,
        sourceName: r.sourceName,
        title: r.title,
        stillPath: r.stillPath,
        releasedAt: iso(r.releasedAt),
        caseId: r.caseId,
        caseTitle: r.caseTitle,
        isProvisional: r.isProvisional,
        proposed: r.status === "proposed",
        siblings,
      };
    });
  },
);
