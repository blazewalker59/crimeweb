/**
 * TMDb API Client
 * Handles all interactions with The Movie Database API
 */
import type {
  TMDbShow,
  TMDbShowDetails,
  TMDbSeasonDetails,
  TMDbSearchResult,
} from './types'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

// Rate limiting: TMDb allows ~40 requests per 10 seconds
const RATE_LIMIT_REQUESTS = 40
const RATE_LIMIT_WINDOW = 10000 // 10 seconds in ms

class TMDbClient {
  private apiKey: string
  private requestCount = 0
  private windowStart = Date.now()
  private queue: Promise<void> = Promise.resolve()

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TMDB_API_KEY || ''
    if (!this.apiKey) {
      console.warn('TMDb API key not configured')
    }
  }

  /**
   * Rate-limited fetch wrapper
   */
  private async fetch<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    // Wait for previous request in queue
    await this.queue

    // Check rate limit
    const now = Date.now()
    if (now - this.windowStart >= RATE_LIMIT_WINDOW) {
      this.requestCount = 0
      this.windowStart = now
    }

    if (this.requestCount >= RATE_LIMIT_REQUESTS) {
      const waitTime = RATE_LIMIT_WINDOW - (now - this.windowStart)
      await this.sleep(waitTime)
      this.requestCount = 0
      this.windowStart = Date.now()
    }

    this.requestCount++

    // Build URL with query params
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`)
    url.searchParams.set('api_key', this.apiKey)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(
        `TMDb API error: ${response.status} ${response.statusText}`,
      )
    }

    return response.json() as Promise<T>
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Search for TV shows
   */
  async searchShows(
    query: string,
    page = 1,
  ): Promise<TMDbSearchResult<TMDbShow>> {
    return this.fetch<TMDbSearchResult<TMDbShow>>('/search/tv', {
      query,
      page: String(page),
      include_adult: 'false',
    })
  }

  /**
   * Get TV show details by ID
   */
  async getShowDetails(showId: number): Promise<TMDbShowDetails> {
    return this.fetch<TMDbShowDetails>(`/tv/${showId}`)
  }

  /**
   * Get season details with all episodes
   */
  async getSeasonDetails(
    showId: number,
    seasonNumber: number,
  ): Promise<TMDbSeasonDetails> {
    return this.fetch<TMDbSeasonDetails>(`/tv/${showId}/season/${seasonNumber}`)
  }

  /**
   * Get all episodes for a show
   * Fetches each season sequentially to avoid rate limits
   */
  async getAllEpisodes(showId: number): Promise<TMDbSeasonDetails[]> {
    const showDetails = await this.getShowDetails(showId)
    const seasons: TMDbSeasonDetails[] = []

    for (const season of showDetails.seasons) {
      // Skip specials (season 0) unless explicitly requested
      if (season.season_number === 0) continue

      try {
        const seasonDetails = await this.getSeasonDetails(
          showId,
          season.season_number,
        )
        seasons.push(seasonDetails)
      } catch (error) {
        console.error(
          `Failed to fetch season ${season.season_number} for show ${showId}:`,
          error,
        )
      }
    }

    return seasons
  }

  /**
   * Get image URL for posters, stills, etc.
   */
  static getImageUrl(
    path: string | null,
    size:
      | 'w92'
      | 'w154'
      | 'w185'
      | 'w342'
      | 'w500'
      | 'w780'
      | 'original' = 'w342',
  ): string | null {
    if (!path) return null
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
  }

  /**
   * Get poster URL
   */
  static getPosterUrl(
    path: string | null,
    size:
      | 'w92'
      | 'w154'
      | 'w185'
      | 'w342'
      | 'w500'
      | 'w780'
      | 'original' = 'w342',
  ): string | null {
    return TMDbClient.getImageUrl(path, size)
  }

  /**
   * Get backdrop URL
   */
  static getBackdropUrl(
    path: string | null,
    size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780',
  ): string | null {
    return TMDbClient.getImageUrl(path, size as 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original')
  }

  /**
   * Get still image URL (for episode screenshots)
   */
  static getStillUrl(
    path: string | null,
    size: 'w92' | 'w185' | 'w300' | 'original' = 'w300',
  ): string | null {
    return TMDbClient.getImageUrl(path, size as 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original')
  }
}

// Export singleton instance for convenience
export const tmdb = new TMDbClient()

// Export class for custom instances
export { TMDbClient }

// Re-export types
export * from './types'
