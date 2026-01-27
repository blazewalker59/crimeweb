/**
 * TMDb API Types
 */

export interface TMDbShow {
  id: number
  name: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string | null
  vote_average: number
  vote_count: number
  popularity: number
  origin_country: string[]
  original_language: string
  original_name: string
  genre_ids?: number[]
  networks?: TMDbNetwork[]
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
}

export interface TMDbNetwork {
  id: number
  name: string
  logo_path: string | null
  origin_country: string
}

export interface TMDbSeason {
  id: number
  name: string
  overview: string | null
  poster_path: string | null
  season_number: number
  episode_count: number
  air_date: string | null
  vote_average: number
}

export interface TMDbEpisode {
  id: number
  name: string
  overview: string | null
  still_path: string | null
  air_date: string | null
  episode_number: number
  season_number: number
  runtime: number | null
  vote_average: number
  vote_count: number
  production_code: string | null
  show_id?: number
}

export interface TMDbShowDetails extends TMDbShow {
  seasons: TMDbSeason[]
  networks: TMDbNetwork[]
  number_of_seasons: number
  number_of_episodes: number
  status: string
  tagline: string | null
  type: string
  created_by: Array<{
    id: number
    name: string
    profile_path: string | null
  }>
}

export interface TMDbSeasonDetails {
  id: number
  name: string
  overview: string | null
  poster_path: string | null
  season_number: number
  air_date: string | null
  episodes: TMDbEpisode[]
}

export interface TMDbSearchResult<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export interface TMDbImageConfig {
  base_url: string
  secure_base_url: string
  backdrop_sizes: string[]
  logo_sizes: string[]
  poster_sizes: string[]
  profile_sizes: string[]
  still_sizes: string[]
}
