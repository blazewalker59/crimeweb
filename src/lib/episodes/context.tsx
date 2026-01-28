/**
 * Episode Context
 * Persists episode data and UI state across navigation
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { type ShowWithEpisodes, type EpisodeData, getMoreEpisodes } from '@/lib/tmdb/server'

interface EpisodeState {
  // Initial shows data from loader
  initialShows: ShowWithEpisodes[]
  // Episodes per show (may have more than initial if user loaded more)
  showEpisodes: Record<number, EpisodeData[]>
  // Whether each show has more episodes to load
  hasMore: Record<number, boolean>
  // Loading state per show
  loadingMore: Record<number, boolean>
  // Active tab index
  activeShowIndex: number
  // Whether state has been initialized
  initialized: boolean
  // Scroll position for home page
  scrollPosition: number
}

interface EpisodeContextValue extends EpisodeState {
  initialize: (shows: ShowWithEpisodes[]) => void
  setActiveShowIndex: (index: number) => void
  loadMore: (showId: number) => Promise<void>
  saveScrollPosition: (position: number) => void
}

const EpisodeContext = createContext<EpisodeContextValue | null>(null)

export function EpisodeProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [state, setState] = useState<EpisodeState>({
    initialShows: [],
    showEpisodes: {},
    hasMore: {},
    loadingMore: {},
    activeShowIndex: 0,
    initialized: false,
    scrollPosition: 0,
  })

  // Restore scroll position when navigating back to home
  useEffect(() => {
    if (location.pathname === '/' && state.initialized && state.scrollPosition > 0) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        window.scrollTo(0, state.scrollPosition)
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [location.pathname, state.initialized, state.scrollPosition])

  const initialize = useCallback((shows: ShowWithEpisodes[]) => {
    // Only initialize if not already done or if shows changed
    setState((prev) => {
      if (prev.initialized && prev.initialShows.length === shows.length) {
        // Already initialized with same data, don't reset
        return prev
      }

      const showEpisodes: Record<number, EpisodeData[]> = {}
      const hasMore: Record<number, boolean> = {}

      for (const show of shows) {
        // Only set if we don't already have more episodes loaded
        if (!prev.showEpisodes[show.tmdbId] || prev.showEpisodes[show.tmdbId].length <= show.episodes.length) {
          showEpisodes[show.tmdbId] = show.episodes
        } else {
          showEpisodes[show.tmdbId] = prev.showEpisodes[show.tmdbId]
        }
        hasMore[show.tmdbId] = prev.hasMore[show.tmdbId] ?? show.episodes.length >= 10
      }

      return {
        ...prev,
        initialShows: shows,
        showEpisodes,
        hasMore,
        initialized: true,
      }
    })
  }, [])

  const setActiveShowIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, activeShowIndex: index }))
  }, [])

  const saveScrollPosition = useCallback((position: number) => {
    setState((prev) => ({ ...prev, scrollPosition: position }))
  }, [])

  const loadMore = useCallback(async (showId: number) => {
    if (state.loadingMore[showId]) return

    setState((prev) => ({
      ...prev,
      loadingMore: { ...prev.loadingMore, [showId]: true },
    }))

    try {
      const currentEpisodes = state.showEpisodes[showId] || []
      const result = await getMoreEpisodes({
        data: {
          showId,
          offset: currentEpisodes.length,
          limit: 10,
        },
      })

      setState((prev) => ({
        ...prev,
        showEpisodes: {
          ...prev.showEpisodes,
          [showId]: [...(prev.showEpisodes[showId] || []), ...result.episodes],
        },
        hasMore: {
          ...prev.hasMore,
          [showId]: result.hasMore,
        },
        loadingMore: { ...prev.loadingMore, [showId]: false },
      }))
    } catch (error) {
      console.error('Failed to load more episodes:', error)
      setState((prev) => ({
        ...prev,
        loadingMore: { ...prev.loadingMore, [showId]: false },
      }))
    }
  }, [state.loadingMore, state.showEpisodes])

  return (
    <EpisodeContext.Provider
      value={{
        ...state,
        initialize,
        setActiveShowIndex,
        loadMore,
        saveScrollPosition,
      }}
    >
      {children}
    </EpisodeContext.Provider>
  )
}

export function useEpisodes() {
  const context = useContext(EpisodeContext)
  if (!context) {
    throw new Error('useEpisodes must be used within an EpisodeProvider')
  }
  return context
}
