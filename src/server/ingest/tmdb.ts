/**
 * Minimal TMDb client for ingest.
 *
 * Two deliberate differences from the v1 script this replaces
 * (`scripts/fetch-episodes.ts`), both from docs/research/tmdb-discovery-surface.md:
 *
 * 1. **No artificial throttle.** v1 slept between requests for a rate limit
 *    TMDb disabled in December 2019. The real ceiling is roughly 10x higher,
 *    so the sleep bought nothing and made a full refresh needlessly slow.
 * 2. **Assert on payload shape, not HTTP status.** TMDb endpoints — `/discover`
 *    especially — fail open and quiet: invalid parameters return HTTP 200 with
 *    plausible-looking data. A 200 is not evidence the query did what we asked.
 */

const BASE = "https://api.themoviedb.org/3";

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string | null;
  air_date: string | null;
  season_number: number;
  episode_number: number;
  still_path: string | null;
}

interface TmdbSeasonSummary {
  season_number: number;
}

export class TmdbError extends Error {}

async function get<T>(path: string, apiKey: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}api_key=${apiKey}`);
  if (!res.ok) {
    throw new TmdbError(`TMDb ${res.status} for ${path}`);
  }
  return await res.json();
}

/** Season numbers for a show. Throws if the show has none — a 200 with an
 *  empty payload means our show id is wrong, not that the show is empty. */
export async function fetchSeasonNumbers(showId: number, apiKey: string): Promise<Array<number>> {
  const show = await get<{ seasons?: Array<TmdbSeasonSummary> }>(`/tv/${showId}`, apiKey);
  const seasons = (show.seasons ?? [])
    .map((s) => s.season_number)
    .filter((n) => typeof n === "number" && n > 0);
  if (seasons.length === 0) {
    throw new TmdbError(`Show ${showId} returned no seasons — check the show id`);
  }
  return seasons;
}

export async function fetchSeasonEpisodes(
  showId: number,
  seasonNumber: number,
  apiKey: string,
): Promise<Array<TmdbEpisode>> {
  const season = await get<{ episodes?: Array<TmdbEpisode> }>(
    `/tv/${showId}/season/${seasonNumber}`,
    apiKey,
  );
  return season.episodes ?? [];
}
