import { eq, sql } from "drizzle-orm";
import { fetchSeasonEpisodes, fetchSeasonNumbers } from "./tmdb";
import { db } from "@/db";
import { mediaItems, sources } from "@/db/schema";

/**
 * The REFRESH phase of ingest: pull new episodes for known Sources into
 * `media_items` as `extraction_status = 'pending'`.
 *
 * `media_items.extraction_status` IS the work queue — no Cloudflare Queue and
 * no second Worker. A crashed or timed-out run leaves rows `pending` and the
 * next run picks them up, which makes this idempotent and resumable for free.
 *
 * Discovery (finding Sources nobody told us about) is a separate, weekly phase.
 */

/**
 * Curated seed Sources. A permanent floor, never dropped by discovery.
 *
 * Only the five shows that actually return episodes. Forensic Files (11105),
 * Cold Case Files (12258) and American Greed (21572) were in the v1 list and
 * return nothing in the window — seeding them blind would create Sources with
 * no Media Items and make the catalogue look broken.
 */
export const CURATED_SOURCES = [
  { tmdbId: 78, name: "Dateline", kind: "network" as const },
  { tmdbId: 2035, name: "20/20", kind: "network" as const },
  { tmdbId: 3719, name: "48 Hours", kind: "network" as const },
  { tmdbId: 10184, name: "Snapped", kind: "network" as const },
  { tmdbId: 5146, name: "The First 48", kind: "network" as const },
];

/** How far back a refresh looks. Older material arrives via the one-off import. */
const WINDOW_DAYS = 730;

export interface RefreshReport {
  sourcesSeeded: number;
  episodesSeen: number;
  episodesInserted: number;
  emptySources: Array<string>;
  errors: Array<string>;
}

export async function seedCuratedSources(now = new Date()): Promise<number> {
  const d = db();
  let seeded = 0;
  for (const s of CURATED_SOURCES) {
    const existing = await d
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.tmdbId, s.tmdbId));
    if (existing.length > 0) continue;
    await d.insert(sources).values({
      id: `src_${s.tmdbId}`,
      tmdbId: s.tmdbId,
      name: s.name,
      kind: s.kind,
      isCurated: true,
      createdAt: now,
    });
    seeded++;
  }
  return seeded;
}

export async function refreshEpisodes(apiKey: string, now = new Date()): Promise<RefreshReport> {
  const d = db();
  const report: RefreshReport = {
    sourcesSeeded: await seedCuratedSources(now),
    episodesSeen: 0,
    episodesInserted: 0,
    emptySources: [],
    errors: [],
  };

  const cutoff = new Date(now.getTime() - WINDOW_DAYS * 86400_000);
  const rows = await d.select().from(sources);

  for (const source of rows) {
    let seenForSource = 0;
    try {
      const seasonNumbers = await fetchSeasonNumbers(source.tmdbId, apiKey);
      // Newest seasons first; a refresh only cares about recent material.
      for (const seasonNumber of seasonNumbers.slice(-3).reverse()) {
        const episodes = await fetchSeasonEpisodes(source.tmdbId, seasonNumber, apiKey);
        for (const ep of episodes) {
          if (!ep.air_date) continue;
          const airedAt = new Date(ep.air_date);
          if (Number.isNaN(airedAt.getTime()) || airedAt < cutoff) continue;

          seenForSource++;
          report.episodesSeen++;

          // Idempotent: unique(tmdb_id, kind) makes a repeat run a no-op.
          const inserted = await d
            .insert(mediaItems)
            .values({
              id: `mi_${ep.id}`,
              sourceId: source.id,
              tmdbId: ep.id,
              kind: "episode",
              title: ep.name,
              overview: ep.overview && ep.overview.length > 0 ? ep.overview : null,
              stillPath: ep.still_path,
              releasedAt: airedAt,
              seasonNumber: ep.season_number,
              episodeNumber: ep.episode_number,
              extractionStatus: "pending",
              ingestedAt: now,
            })
            .onConflictDoNothing()
            .returning({ id: mediaItems.id });
          report.episodesInserted += inserted.length;
        }
      }
    } catch (err) {
      report.errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    // A curated Source returning nothing is a signal, not a success. TMDb
    // metadata is volunteer-edited and a show id can go stale.
    if (seenForSource === 0) report.emptySources.push(source.name);
  }

  return report;
}

/** Count of items still awaiting extraction — the queue depth. */
export async function pendingCount(): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(mediaItems)
    .where(eq(mediaItems.extractionStatus, "pending"));
  return row?.n ?? 0;
}
