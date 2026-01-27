/**
 * TMDb Sync Logic
 * Handles syncing show and episode data from TMDb to Supabase
 */
import { TMDbClient } from './client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ShowInsert, EpisodeInsert } from '@/lib/supabase/types'
import type { TMDbSeasonDetails } from './types'

interface SyncResult {
  success: boolean
  showsAdded: number
  episodesAdded: number
  episodesUpdated: number
  errors: string[]
}

/**
 * Sync a single show and all its episodes from TMDb
 */
export async function syncShow(tmdbId: number): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    showsAdded: 0,
    episodesAdded: 0,
    episodesUpdated: 0,
    errors: [],
  }

  const tmdb = new TMDbClient(process.env.TMDB_API_KEY)
  const supabase = createServiceRoleClient()

  try {
    // Fetch show details from TMDb
    const showDetails = await tmdb.getShowDetails(tmdbId)

    // Prepare show data for insert
    const showData: ShowInsert = {
      tmdb_id: showDetails.id,
      name: showDetails.name,
      network: showDetails.networks?.[0]?.name ?? null,
      poster_path: showDetails.poster_path,
      backdrop_path: showDetails.backdrop_path,
      first_air_date: showDetails.first_air_date,
      overview: showDetails.overview,
      vote_average: showDetails.vote_average,
      number_of_seasons: showDetails.number_of_seasons,
      number_of_episodes: showDetails.number_of_episodes,
      status: showDetails.status,
      last_synced_at: new Date().toISOString(),
    }

    // Upsert show
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: show, error: showError } = await (supabase as any)
      .from('shows')
      .upsert(showData, { onConflict: 'tmdb_id' })
      .select()
      .single()

    if (showError) {
      result.errors.push(`Failed to upsert show: ${showError.message}`)
      return result
    }

    result.showsAdded = 1

    // Fetch all seasons and episodes
    const seasons = await tmdb.getAllEpisodes(tmdbId)

    // Sync episodes for each season
    for (const season of seasons) {
      const episodeResult = await syncSeasonEpisodes(show.id, season, supabase)
      result.episodesAdded += episodeResult.added
      result.episodesUpdated += episodeResult.updated
      result.errors.push(...episodeResult.errors)
    }

    result.success = true
  } catch (error) {
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  return result
}

/**
 * Sync episodes for a single season
 */
async function syncSeasonEpisodes(
  showId: number,
  season: TMDbSeasonDetails,
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<{ added: number; updated: number; errors: string[] }> {
  const result = { added: 0, updated: 0, errors: [] as string[] }

  for (const episode of season.episodes) {
    const episodeData: EpisodeInsert = {
      show_id: showId,
      tmdb_id: episode.id,
      season_number: episode.season_number,
      episode_number: episode.episode_number,
      name: episode.name,
      overview: episode.overview,
      air_date: episode.air_date,
      still_path: episode.still_path,
      runtime: episode.runtime,
      vote_average: episode.vote_average,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('episodes').upsert(episodeData, {
      onConflict: 'show_id,season_number,episode_number',
    })

    if (error) {
      result.errors.push(
        `Failed to sync episode S${episode.season_number}E${episode.episode_number}: ${error.message}`,
      )
    } else {
      result.added++
    }
  }

  return result
}

/**
 * Sync multiple shows by their TMDb IDs
 */
export async function syncShows(tmdbIds: number[]): Promise<SyncResult> {
  const totalResult: SyncResult = {
    success: true,
    showsAdded: 0,
    episodesAdded: 0,
    episodesUpdated: 0,
    errors: [],
  }

  for (const tmdbId of tmdbIds) {
    const result = await syncShow(tmdbId)
    totalResult.showsAdded += result.showsAdded
    totalResult.episodesAdded += result.episodesAdded
    totalResult.episodesUpdated += result.episodesUpdated
    totalResult.errors.push(...result.errors)

    if (!result.success) {
      totalResult.success = false
    }

    // Small delay between shows to be nice to the API
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return totalResult
}

/**
 * Default crime shows to sync
 */
export const DEFAULT_CRIME_SHOWS = [
  { name: 'Dateline NBC', tmdbId: 4614 },
  { name: '20/20', tmdbId: 4619 },
  { name: '48 Hours', tmdbId: 4613 },
  { name: 'Forensic Files', tmdbId: 1581 },
  { name: 'Cold Case Files', tmdbId: 10882 },
  { name: 'Snapped', tmdbId: 1608 },
  { name: 'The First 48', tmdbId: 20415 },
  { name: 'American Greed', tmdbId: 33742 },
]

/**
 * Sync all default crime shows
 */
export async function syncAllDefaultShows(): Promise<SyncResult> {
  const tmdbIds = DEFAULT_CRIME_SHOWS.map((s) => s.tmdbId)
  return syncShows(tmdbIds)
}
