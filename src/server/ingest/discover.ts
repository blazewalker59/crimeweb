import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaItems, sources } from "@/db/schema";

/**
 * The DISCOVERY phase of ingest — finding true crime programming nobody told
 * us to look for. Weekly, distinct from the daily refresh.
 *
 * Discovery provides BREADTH; the curated source list stays as a permanent
 * FLOOR. A union of 5 queries reaches 25 of 26 known titles, but no single
 * query beats 21/26, and the best one misses 20/20 outright because TMDb has
 * it untagged for Crime. Those are volunteer metadata gaps, so a
 * discovery-only pipeline is one anonymous edit away from dropping a flagship
 * show. See docs/research/tmdb-discovery-surface.md.
 */

const BASE = "https://api.themoviedb.org/3";

/** Keyword IDs verified against /search/keyword — see the research doc. */
const KW = {
  trueCrime: 33722,
  crimeDocumentary: 307587,
  coldCase: 210662,
  murderInvestigation: 161982,
} as const;

const GENRE_DOCUMENTARY = 99;
const GENRE_CRIME = 80;

/**
 * The five queries whose union reaches 96%. Deliberately overlapping: each
 * covers a different metadata gap, and no one of them is sufficient.
 */
const QUERIES: Array<{ path: "tv" | "movie"; params: string; why: string }> = [
  {
    path: "tv",
    params: `with_genres=${GENRE_DOCUMENTARY},${GENRE_CRIME}`,
    why: "documentary AND crime",
  },
  { path: "tv", params: `with_keywords=${KW.trueCrime}`, why: "true crime keyword" },
  {
    path: "tv",
    params: `with_keywords=${KW.crimeDocumentary}|${KW.coldCase}|${KW.murderInvestigation}`,
    why: "catches 20/20, which lacks the Crime genre",
  },
  {
    path: "movie",
    params: `with_genres=${GENRE_DOCUMENTARY},${GENRE_CRIME}`,
    why: "documentary films",
  },
  { path: "movie", params: `with_keywords=${KW.trueCrime}`, why: "streaming originals" },
];

interface DiscoverResult {
  id: number;
  name?: string;
  title?: string;
  overview: string | null;
  first_air_date?: string;
  release_date?: string;
  backdrop_path: string | null;
}

export interface DiscoverReport {
  queriesRun: number;
  resultsSeen: number;
  sourcesAdded: number;
  filmsAdded: number;
  emptyQueries: Array<string>;
}

/**
 * TMDb `/discover` FAILS OPEN: invalid sorts, unknown provider IDs and a
 * missing watch_region all return HTTP 200 with plausible-looking data. A 200
 * is not evidence the query did what we asked, so assert on result counts.
 */
async function runQuery(
  q: (typeof QUERIES)[number],
  apiKey: string,
): Promise<Array<DiscoverResult>> {
  const url = `${BASE}/discover/${q.path}?${q.params}&sort_by=first_air_date.desc&page=1&api_key=${apiKey}`;
  const res = await fetch(
    url.replace(
      "first_air_date.desc",
      q.path === "tv" ? "first_air_date.desc" : "release_date.desc",
    ),
  );
  if (!res.ok) throw new Error(`discover ${q.path} (${q.why}) returned ${res.status}`);
  const body = (await res.json()) as { results?: Array<DiscoverResult>; total_results?: number };
  return body.results ?? [];
}

export async function discover(apiKey: string, now = new Date()): Promise<DiscoverReport> {
  const d = db();
  const report: DiscoverReport = {
    queriesRun: 0,
    resultsSeen: 0,
    sourcesAdded: 0,
    filmsAdded: 0,
    emptyQueries: [],
  };

  for (const q of QUERIES) {
    let results: Array<DiscoverResult>;
    try {
      results = await runQuery(q, apiKey);
    } catch {
      report.emptyQueries.push(`${q.path}: ${q.why} (error)`);
      continue;
    }
    report.queriesRun++;
    report.resultsSeen += results.length;

    // A query returning nothing is a signal, not a success — see the fails-open
    // note above.
    if (results.length === 0) {
      report.emptyQueries.push(`${q.path}: ${q.why}`);
      continue;
    }

    for (const r of results) {
      if (q.path === "tv") {
        // New Sources are added but NOT marked curated: the curated list is a
        // hand-maintained floor, and discovery must not silently grow it.
        const existing = await d
          .select({ id: sources.id })
          .from(sources)
          .where(eq(sources.tmdbId, r.id));
        if (existing.length > 0) continue;
        await d
          .insert(sources)
          .values({
            id: `src_${r.id}`,
            tmdbId: r.id,
            name: r.name ?? `Show ${r.id}`,
            kind: "network",
            isCurated: false,
            createdAt: now,
          })
          .onConflictDoNothing();
        report.sourcesAdded++;
      } else {
        // Films need a Source to hang from; group them under a synthetic one.
        await d
          .insert(sources)
          .values({
            id: "src_films",
            tmdbId: -1,
            name: "Documentary films",
            kind: "streamer",
            isCurated: false,
            createdAt: now,
          })
          .onConflictDoNothing();

        const released = r.release_date ? new Date(r.release_date) : null;
        const inserted = await d
          .insert(mediaItems)
          .values({
            id: `mi_film_${r.id}`,
            sourceId: "src_films",
            tmdbId: r.id,
            kind: "film",
            title: r.title ?? `Film ${r.id}`,
            overview: r.overview && r.overview.length > 0 ? r.overview : null,
            stillPath: r.backdrop_path,
            releasedAt: released && !Number.isNaN(released.getTime()) ? released : null,
            extractionStatus: "pending",
            ingestedAt: now,
          })
          .onConflictDoNothing()
          .returning({ id: mediaItems.id });
        report.filmsAdded += inserted.length;
      }
    }
  }

  return report;
}
