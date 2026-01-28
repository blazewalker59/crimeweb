/**
 * TMDb Server Functions
 * Server-side data fetching from TMDb API
 */
import { createServerFn } from '@tanstack/react-start'
import { TMDbClient } from './client'
import { findRelatedEpisodes, type MatchResult, type Episode } from '@/lib/matching'

// Type for episode database
interface EpisodeDatabase {
  lastUpdated: string
  shows: { tmdbId: number; name: string; network: string | null }[]
  episodes: Episode[]
}

// Load episode database - will be empty if file doesn't exist
let episodeDatabase: EpisodeDatabase | null = null
try {
  // Dynamic import for JSON file
  const imported = await import('../../../data/episodes.json')
  // Handle both default export and direct properties
  episodeDatabase = imported.default || imported
  console.log('[TMDb Server] Episode database loaded:', episodeDatabase?.episodes?.length, 'episodes')
} catch {
  console.warn('Episode database not found. Run: bun scripts/fetch-episodes.ts')
}

/**
 * Crime shows to display
 */
export const CRIME_SHOWS = [
  { name: 'Dateline NBC', tmdbId: 78 },
  { name: '20/20', tmdbId: 2035 },
  { name: '48 Hours', tmdbId: 3719 },
  { name: 'Forensic Files', tmdbId: 11105 },
  { name: 'Snapped', tmdbId: 10184 },
  { name: 'The First 48', tmdbId: 5146 },
  { name: 'Cold Case Files', tmdbId: 12258 },
  { name: 'American Greed', tmdbId: 21572 },
]

export interface ShowWithEpisodes {
  tmdbId: number
  name: string
  network: string | null
  posterPath: string | null
  episodes: EpisodeData[]
}

export interface EpisodeData {
  id: number
  showTmdbId: number
  showName: string
  name: string
  overview: string | null
  stillPath: string | null
  airDate: string | null
  seasonNumber: number
  episodeNumber: number
  runtime: number | null
  relatedCount?: number // Number of related episodes found
  relatedShows?: string[] // Names of shows with related episodes (for cross-show indicator)
  relatedEpisodeIds?: number[] // IDs of related episodes (for client-side filtering)
}

/**
 * Fetch latest episodes for all supported shows
 */
export const getLatestEpisodes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ShowWithEpisodes[]> => {
    const tmdb = new TMDbClient(process.env.TMDB_API_KEY)
    const showsWithEpisodes: ShowWithEpisodes[] = []

    for (const show of CRIME_SHOWS) {
      try {
        const showDetails = await tmdb.getShowDetails(show.tmdbId)

        // Get the latest season - find the highest season number from the seasons array
        // (number_of_seasons can be inaccurate for shows with sparse season data)
        const latestSeasonNumber = showDetails.seasons
          ?.filter((s) => s.season_number > 0) // Exclude specials (season 0)
          .reduce((max, s) => Math.max(max, s.season_number), 0) ?? 0
        if (latestSeasonNumber < 1) continue

        const seasonDetails = await tmdb.getSeasonDetails(
          show.tmdbId,
          latestSeasonNumber,
        )

        // Get the most recent 10 episodes (sorted by air date descending)
        const sortedEpisodes = [...seasonDetails.episodes]
          .filter((ep) => ep.air_date) // Only episodes with air dates
          .sort((a, b) => {
            const dateA = new Date(a.air_date || 0)
            const dateB = new Date(b.air_date || 0)
            return dateB.getTime() - dateA.getTime()
          })
          .slice(0, 10)

        const episodes: EpisodeData[] = sortedEpisodes.map((ep) => {
          // Calculate related episodes count and which shows they're from
          let relatedCount = 0
          let relatedShows: string[] = []
          let relatedEpisodeIds: number[] = []
          if (episodeDatabase?.episodes) {
            const sourceEp: Episode = {
              id: ep.id,
              showTmdbId: show.tmdbId,
              showName: showDetails.name,
              name: ep.name,
              overview: ep.overview || null,
              airDate: ep.air_date || null,
              seasonNumber: ep.season_number,
              episodeNumber: ep.episode_number,
              stillPath: ep.still_path || null,
            }
            const related = findRelatedEpisodes(sourceEp, episodeDatabase.episodes, {
              maxResults: 10,
              minScore: 0.25,
              excludeSameShow: false,
            })
            relatedCount = related.length
            relatedEpisodeIds = related.map(r => r.episodeId)
            // Get unique show names from related episodes (excluding current show)
            relatedShows = [...new Set(
              related
                .filter(r => r.showTmdbId !== show.tmdbId)
                .map(r => r.showName)
            )]
          }

          return {
            id: ep.id,
            showTmdbId: show.tmdbId,
            showName: showDetails.name,
            name: ep.name,
            overview: ep.overview,
            stillPath: ep.still_path,
            airDate: ep.air_date,
            seasonNumber: ep.season_number,
            episodeNumber: ep.episode_number,
            runtime: ep.runtime,
            relatedCount,
            relatedShows,
            relatedEpisodeIds,
          }
        })

        showsWithEpisodes.push({
          tmdbId: show.tmdbId,
          name: showDetails.name,
          network: showDetails.networks?.[0]?.name ?? null,
          posterPath: showDetails.poster_path,
          episodes,
        })
      } catch (error) {
        console.error(`Failed to fetch show ${show.name}:`, error)
      }
    }

    return showsWithEpisodes
  },
)

/**
 * Load more episodes for a specific show
 * Returns episodes starting from offset, with fuzzy match counts
 */
export const getMoreEpisodes = createServerFn({ method: 'GET' })
  .inputValidator((d: { showId: number; offset: number; limit?: number }) => d)
  .handler(async ({ data }): Promise<{ episodes: EpisodeData[]; hasMore: boolean }> => {
    const tmdb = new TMDbClient(process.env.TMDB_API_KEY)
    const limit = data.limit ?? 10

    const showDetails = await tmdb.getShowDetails(data.showId)

    // Collect all episodes across seasons (newest first)
    const allEpisodes: Array<{
      episode: {
        id: number
        name: string
        overview: string | null
        still_path: string | null
        air_date: string | null
        season_number: number
        episode_number: number
        runtime: number | null
      }
      showName: string
    }> = []

    // Get actual season numbers from the seasons array (sorted newest first)
    // This handles shows with sparse/non-consecutive season numbers like 20/20
    const seasonNumbers = showDetails.seasons
      ?.filter((s) => s.season_number > 0)
      .map((s) => s.season_number)
      .sort((a, b) => b - a) ?? []

    // Fetch seasons from newest to oldest until we have enough episodes
    for (const seasonNum of seasonNumbers) {
      try {
        const seasonDetails = await tmdb.getSeasonDetails(data.showId, seasonNum)
        
        // Add episodes with air dates, sorted newest first
        const seasonEpisodes = seasonDetails.episodes
          .filter((ep) => ep.air_date)
          .sort((a, b) => new Date(b.air_date || 0).getTime() - new Date(a.air_date || 0).getTime())
          .map((ep) => ({
            episode: {
              id: ep.id,
              name: ep.name,
              overview: ep.overview || null,
              still_path: ep.still_path || null,
              air_date: ep.air_date || null,
              season_number: ep.season_number,
              episode_number: ep.episode_number,
              runtime: ep.runtime || null,
            },
            showName: showDetails.name,
          }))

        allEpisodes.push(...seasonEpisodes)

        // If we have enough episodes past the offset + limit, we can stop
        if (allEpisodes.length >= data.offset + limit + 1) {
          break
        }
      } catch {
        // Continue to next season
      }
    }

    // Sort all collected episodes by air date (newest first)
    allEpisodes.sort((a, b) => {
      const dateA = new Date(a.episode.air_date || 0).getTime()
      const dateB = new Date(b.episode.air_date || 0).getTime()
      return dateB - dateA
    })

    // Get the slice we need
    const slicedEpisodes = allEpisodes.slice(data.offset, data.offset + limit)
    const hasMore = allEpisodes.length > data.offset + limit

    // Map to EpisodeData with related counts
    const episodes: EpisodeData[] = slicedEpisodes.map(({ episode, showName }) => {
      let relatedCount = 0
      let relatedShows: string[] = []
      let relatedEpisodeIds: number[] = []
      if (episodeDatabase?.episodes) {
        const sourceEp: Episode = {
          id: episode.id,
          showTmdbId: data.showId,
          showName,
          name: episode.name,
          overview: episode.overview,
          airDate: episode.air_date,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
          stillPath: episode.still_path,
        }
        const related = findRelatedEpisodes(sourceEp, episodeDatabase.episodes, {
          maxResults: 10,
          minScore: 0.25,
          excludeSameShow: false,
        })
        relatedCount = related.length
        relatedEpisodeIds = related.map(r => r.episodeId)
        // Get unique show names from related episodes (excluding current show)
        relatedShows = [...new Set(
          related
            .filter(r => r.showTmdbId !== data.showId)
            .map(r => r.showName)
        )]
      }

      return {
        id: episode.id,
        showTmdbId: data.showId,
        showName,
        name: episode.name,
        overview: episode.overview,
        stillPath: episode.still_path,
        airDate: episode.air_date,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        runtime: episode.runtime,
        relatedCount,
        relatedShows,
        relatedEpisodeIds,
      }
    })

    return { episodes, hasMore }
  })

/**
 * Fetch a specific episode by show ID, season, and episode number
 */
export const getEpisode = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: { showId: number; seasonNumber: number; episodeNumber: number }) => d,
  )
  .handler(async ({ data }) => {
    const tmdb = new TMDbClient(process.env.TMDB_API_KEY)

    const [showDetails, seasonDetails] = await Promise.all([
      tmdb.getShowDetails(data.showId),
      tmdb.getSeasonDetails(data.showId, data.seasonNumber),
    ])

    const episode = seasonDetails.episodes.find(
      (ep) => ep.episode_number === data.episodeNumber,
    )

    if (!episode) {
      throw new Error('Episode not found')
    }

    return {
      id: episode.id,
      showTmdbId: data.showId,
      showName: showDetails.name,
      showNetwork: showDetails.networks?.[0]?.name ?? null,
      name: episode.name,
      overview: episode.overview,
      stillPath: episode.still_path,
      airDate: episode.air_date,
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      runtime: episode.runtime,
    }
  })

/**
 * Fetch episode by TMDb episode ID and show ID
 */
export const getEpisodeById = createServerFn({ method: 'GET' })
  .inputValidator((d: { episodeId: number; showId: number }) => d)
  .handler(async ({ data }) => {
    const tmdb = new TMDbClient(process.env.TMDB_API_KEY)

    const showDetails = await tmdb.getShowDetails(data.showId)

    // Get all season numbers from the seasons array (more reliable than number_of_seasons)
    const seasonNumbers = showDetails.seasons
      ?.filter((s) => s.season_number > 0)
      .map((s) => s.season_number)
      .sort((a, b) => b - a) ?? [] // Sort descending to check newest first

    // Search through seasons for this episode
    for (const seasonNum of seasonNumbers) {
      try {
        const seasonDetails = await tmdb.getSeasonDetails(data.showId, seasonNum)
        const episode = seasonDetails.episodes.find(
          (ep) => ep.id === data.episodeId,
        )

        if (episode) {
          return {
            id: episode.id,
            showTmdbId: data.showId,
            showName: showDetails.name,
            showNetwork: showDetails.networks?.[0]?.name ?? null,
            name: episode.name,
            overview: episode.overview,
            stillPath: episode.still_path,
            airDate: episode.air_date,
            seasonNumber: episode.season_number,
            episodeNumber: episode.episode_number,
            runtime: episode.runtime,
          }
        }
      } catch {
        // Continue to next season
      }
    }

    throw new Error('Episode not found')
  })

/**
 * Find related episodes for a given episode using fuzzy matching
 */
export const getRelatedEpisodes = createServerFn({ method: 'GET' })
  .inputValidator((d: { episodeId: number; showId: number; name: string; overview: string | null }) => d)
  .handler(async ({ data }): Promise<MatchResult[]> => {
    if (!episodeDatabase || !episodeDatabase.episodes) {
      console.warn('Episode database not loaded')
      return []
    }

    // Create episode object for matching
    const sourceEpisode: Episode = {
      id: data.episodeId,
      showTmdbId: data.showId,
      showName: '', // Not needed for matching
      name: data.name,
      overview: data.overview,
      airDate: null,
      seasonNumber: 0,
      episodeNumber: 0,
      stillPath: null,
    }

    // Find related episodes
    const related = findRelatedEpisodes(sourceEpisode, episodeDatabase.episodes, {
      maxResults: 5,
      minScore: 0.25,
      excludeSameShow: false, // Include same show to find follow-ups
    })

    return related
  })
