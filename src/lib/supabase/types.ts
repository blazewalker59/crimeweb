/**
 * Database Types for Supabase
 * Auto-generated types would normally come from `supabase gen types typescript`
 * These are manually defined based on our schema
 */

export interface Database {
  public: {
    Tables: {
      shows: {
        Row: {
          id: number
          tmdb_id: number
          name: string
          network: string | null
          poster_path: string | null
          backdrop_path: string | null
          first_air_date: string | null
          overview: string | null
          vote_average: number | null
          number_of_seasons: number
          number_of_episodes: number
          status: string | null
          last_synced_at: string
          created_at: string
        }
        Insert: {
          id?: number
          tmdb_id: number
          name: string
          network?: string | null
          poster_path?: string | null
          backdrop_path?: string | null
          first_air_date?: string | null
          overview?: string | null
          vote_average?: number | null
          number_of_seasons?: number
          number_of_episodes?: number
          status?: string | null
          last_synced_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          tmdb_id?: number
          name?: string
          network?: string | null
          poster_path?: string | null
          backdrop_path?: string | null
          first_air_date?: string | null
          overview?: string | null
          vote_average?: number | null
          number_of_seasons?: number
          number_of_episodes?: number
          status?: string | null
          last_synced_at?: string
          created_at?: string
        }
      }
      episodes: {
        Row: {
          id: number
          show_id: number
          tmdb_id: number | null
          season_number: number
          episode_number: number
          name: string
          overview: string | null
          air_date: string | null
          still_path: string | null
          runtime: number | null
          vote_average: number | null
          is_rerun: boolean
          original_episode_id: number | null
          created_at: string
        }
        Insert: {
          id?: number
          show_id: number
          tmdb_id?: number | null
          season_number: number
          episode_number: number
          name: string
          overview?: string | null
          air_date?: string | null
          still_path?: string | null
          runtime?: number | null
          vote_average?: number | null
          is_rerun?: boolean
          original_episode_id?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          show_id?: number
          tmdb_id?: number | null
          season_number?: number
          episode_number?: number
          name?: string
          overview?: string | null
          air_date?: string | null
          still_path?: string | null
          runtime?: number | null
          vote_average?: number | null
          is_rerun?: boolean
          original_episode_id?: number | null
          created_at?: string
        }
      }
      cases: {
        Row: {
          id: number
          name: string
          slug: string | null
          victim_names: string[]
          perpetrator_names: string[]
          location: string | null
          state: string | null
          year: number | null
          summary: string | null
          wikipedia_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          slug?: string | null
          victim_names?: string[]
          perpetrator_names?: string[]
          location?: string | null
          state?: string | null
          year?: number | null
          summary?: string | null
          wikipedia_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string | null
          victim_names?: string[]
          perpetrator_names?: string[]
          location?: string | null
          state?: string | null
          year?: number | null
          summary?: string | null
          wikipedia_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      episode_cases: {
        Row: {
          id: number
          episode_id: number
          case_id: number
          is_primary: boolean
          confidence_score: number
          linked_by: string | null
          linked_at: string
        }
        Insert: {
          id?: number
          episode_id: number
          case_id: number
          is_primary?: boolean
          confidence_score?: number
          linked_by?: string | null
          linked_at?: string
        }
        Update: {
          id?: number
          episode_id?: number
          case_id?: number
          is_primary?: boolean
          confidence_score?: number
          linked_by?: string | null
          linked_at?: string
        }
      }
      watchlist: {
        Row: {
          id: number
          user_id: string
          episode_id: number
          notes: string | null
          added_at: string
        }
        Insert: {
          id?: number
          user_id: string
          episode_id: number
          notes?: string | null
          added_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          episode_id?: number
          notes?: string | null
          added_at?: string
        }
      }
      watch_history: {
        Row: {
          id: number
          user_id: string
          episode_id: number
          watched_at: string
        }
        Insert: {
          id?: number
          user_id: string
          episode_id: number
          watched_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          episode_id?: number
          watched_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      episodes_with_show: {
        Row: {
          id: number
          show_id: number
          tmdb_id: number | null
          season_number: number
          episode_number: number
          name: string
          overview: string | null
          air_date: string | null
          still_path: string | null
          runtime: number | null
          vote_average: number | null
          is_rerun: boolean
          original_episode_id: number | null
          created_at: string
          show_name: string
          show_network: string | null
          show_poster_path: string | null
        }
      }
      cases_with_stats: {
        Row: {
          id: number
          name: string
          slug: string | null
          victim_names: string[]
          perpetrator_names: string[]
          location: string | null
          state: string | null
          year: number | null
          summary: string | null
          wikipedia_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          episode_count: number
          show_count: number
          first_coverage_date: string | null
          latest_coverage_date: string | null
        }
      }
    }
    Functions: {
      search_episodes: {
        Args: { search_query: string }
        Returns: Array<{
          id: number
          show_id: number
          season_number: number
          episode_number: number
          name: string
          overview: string | null
          air_date: string | null
          show_name: string
          show_network: string | null
          rank: number
        }>
      }
      search_cases: {
        Args: { search_query: string }
        Returns: Array<{
          id: number
          name: string
          slug: string | null
          victim_names: string[]
          perpetrator_names: string[]
          location: string | null
          year: number | null
          summary: string | null
          episode_count: number
          rank: number
        }>
      }
      get_case_coverage: {
        Args: { case_id_param: number }
        Returns: Array<{
          show_id: number
          show_name: string
          show_network: string | null
          episode_count: number
          first_air_date: string | null
          latest_air_date: string | null
        }>
      }
    }
  }
}

// Helper types for easier use
export type Show = Database['public']['Tables']['shows']['Row']
export type ShowInsert = Database['public']['Tables']['shows']['Insert']
export type ShowUpdate = Database['public']['Tables']['shows']['Update']

export type Episode = Database['public']['Tables']['episodes']['Row']
export type EpisodeInsert = Database['public']['Tables']['episodes']['Insert']
export type EpisodeUpdate = Database['public']['Tables']['episodes']['Update']

export type Case = Database['public']['Tables']['cases']['Row']
export type CaseInsert = Database['public']['Tables']['cases']['Insert']
export type CaseUpdate = Database['public']['Tables']['cases']['Update']

export type EpisodeCase = Database['public']['Tables']['episode_cases']['Row']
export type EpisodeCaseInsert =
  Database['public']['Tables']['episode_cases']['Insert']

export type WatchlistItem = Database['public']['Tables']['watchlist']['Row']
export type WatchlistInsert =
  Database['public']['Tables']['watchlist']['Insert']

export type WatchHistoryItem =
  Database['public']['Tables']['watch_history']['Row']
export type WatchHistoryInsert =
  Database['public']['Tables']['watch_history']['Insert']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type EpisodeWithShow =
  Database['public']['Views']['episodes_with_show']['Row']
export type CaseWithStats =
  Database['public']['Views']['cases_with_stats']['Row']
