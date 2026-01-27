/**
 * TMDb Server Functions
 * Server-side data fetching from TMDb API
 */
import { createServerFn } from '@tanstack/react-start'
import { TMDbClient } from './client'

/**
 * Crime shows to display
 */
export const CRIME_SHOWS = [
  { name: 'Dateline NBC', tmdbId: 78 },
  { name: '20/20', tmdbId: 2035 },
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

        // Get the most recent 5 episodes (sorted by air date descending)
        const sortedEpisodes = [...seasonDetails.episodes]
          .filter((ep) => ep.air_date) // Only episodes with air dates
          .sort((a, b) => {
            const dateA = new Date(a.air_date || 0)
            const dateB = new Date(b.air_date || 0)
            return dateB.getTime() - dateA.getTime()
          })
          .slice(0, 5)

        const episodes: EpisodeData[] = sortedEpisodes.map((ep) => ({
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
        }))

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

    // Search through seasons for this episode (start from latest)
    for (
      let seasonNum = showDetails.number_of_seasons;
      seasonNum >= 1;
      seasonNum--
    ) {
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
