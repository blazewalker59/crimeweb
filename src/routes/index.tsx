/**
 * Home Page
 * Simple page showing latest episodes from each supported show
 * Mobile: Tabbed interface to switch between shows
 * Desktop: Same tabbed interface for consistency
 */
import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loading } from '@/components/common'
import { TMDbClient } from '@/lib/tmdb'
import { getLatestEpisodes, type ShowWithEpisodes, type EpisodeData } from '@/lib/tmdb/server'
import { useEpisodes, isViewed } from '@/lib/episodes'
import { useInfiniteScroll } from '@/lib/hooks'
import { formatDate, formatEpisodeNumber, formatRuntime } from '@/lib/utils'
import { getDeniedMatchIds } from '@/lib/matching'
import { Calendar, Clock, Tv, Loader2, Eye, EyeOff } from 'lucide-react'

type ViewFilter = 'all' | 'unviewed' | 'viewed'

export const Route = createFileRoute('/')({
  loader: async () => {
    const shows = await getLatestEpisodes()
    return { shows }
  },
  pendingComponent: () => <Loading message="Loading latest episodes..." />,
  component: HomePage,
})

function HomePage() {
  const { shows } = Route.useLoaderData()
  const {
    initialShows,
    showEpisodes,
    hasMore,
    loadingMore,
    activeShowIndex,
    initialized,
    initialize,
    setActiveShowIndex,
    loadMore,
    saveScrollPosition,
  } = useEpisodes()

  // View filter state - persisted in localStorage
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  // Counter to force re-evaluation of isViewed when returning to page
  const [, setRefreshKey] = useState(0)

  // Load filter preference on mount
  useEffect(() => {
    const savedFilter = localStorage.getItem('crimeweb_view_filter') as ViewFilter
    if (savedFilter && ['all', 'unviewed', 'viewed'].includes(savedFilter)) {
      setViewFilter(savedFilter)
    }
  }, [])

  // Save filter preference when it changes
  const handleFilterChange = (filter: ViewFilter) => {
    setViewFilter(filter)
    localStorage.setItem('crimeweb_view_filter', filter)
  }

  // Force refresh when page regains focus (to pick up viewed changes from detail page)
  useEffect(() => {
    const handleFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Initialize context with loader data (only if not already initialized with data)
  useEffect(() => {
    if (shows.length > 0) {
      initialize(shows)
    }
  }, [shows, initialize])

  // Save scroll position when leaving the page
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [saveScrollPosition])

  // Use context data if initialized, otherwise fall back to loader data
  const displayShows = initialized ? initialShows : shows

  if (displayShows.length === 0) {
    return (
      <div className="min-h-screen">
        <section className="bg-gradient-to-b from-crime-surface to-crime-black py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl md:text-4xl font-bold text-chalk mb-2">
              Latest Episodes
            </h1>
            <p className="text-chalk-muted">
              Recent episodes from your favorite true crime shows
            </p>
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Tv className="h-12 w-12 text-chalk-dim mx-auto mb-4" />
            <p className="text-chalk-muted">No episodes found</p>
          </div>
        </div>
      </div>
    )
  }

  const activeShow = displayShows[activeShowIndex] || displayShows[0]
  const activeEpisodes = showEpisodes[activeShow.tmdbId] || activeShow.episodes
  const activeHasMore = hasMore[activeShow.tmdbId] ?? activeShow.episodes.length >= 10
  const activeLoading = loadingMore[activeShow.tmdbId] ?? false

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-b from-crime-surface to-crime-black pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-chalk mb-1">
            Latest Episodes
          </h1>
          <p className="text-chalk-dim text-sm">
            Recent episodes from your favorite true crime shows
          </p>
        </div>
      </section>

      {/* Show Tabs */}
      <div className="sticky top-16 z-40 bg-crime-black border-b border-crime-elevated">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide">
            {displayShows.map((show, index) => (
              <ShowTab
                key={show.tmdbId}
                show={show}
                isActive={index === activeShowIndex}
                onClick={() => setActiveShowIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Active Show Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ShowContent 
          episodes={activeEpisodes}
          hasMore={activeHasMore}
          isLoading={activeLoading}
          onLoadMore={() => loadMore(activeShow.tmdbId)}
          viewFilter={viewFilter}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  )
}

interface ShowTabProps {
  show: ShowWithEpisodes
  isActive: boolean
  onClick: () => void
}

function ShowTab({ show, isActive, onClick }: ShowTabProps) {
  const posterUrl = TMDbClient.getPosterUrl(show.posterPath, 'w92')

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
        isActive
          ? 'border-blood bg-crime-surface text-chalk'
          : 'border-transparent text-chalk-dim hover:text-chalk hover:bg-crime-surface/50'
      }`}
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt={show.name}
          className="w-8 h-12 object-cover rounded"
        />
      )}
      <div className="text-left">
        <div className={`font-medium text-sm ${isActive ? 'text-chalk' : ''}`}>
          {show.name}
        </div>
        {show.network && (
          <div className="text-xs text-chalk-dim">{show.network}</div>
        )}
      </div>
    </button>
  )
}

interface ShowContentProps {
  episodes: EpisodeData[]
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  viewFilter: ViewFilter
  onFilterChange: (filter: ViewFilter) => void
}

function ShowContent({ episodes, hasMore, isLoading, onLoadMore, viewFilter, onFilterChange }: ShowContentProps) {
  // Only enable infinite scroll when showing all episodes
  // (filtering would cause endless loading as new unfiltered results keep triggering loads)
  const shouldLoadMore = viewFilter === 'all' && hasMore
  
  // Infinite scroll - loads more when sentinel becomes visible
  const sentinelRef = useInfiniteScroll({
    onLoadMore,
    hasMore: shouldLoadMore,
    isLoading,
    rootMargin: '400px', // Start loading 400px before reaching the bottom
  })

  // Filter episodes based on view filter (using isViewed for transitive checks)
  const filteredEpisodes = episodes.filter((episode) => {
    if (viewFilter === 'all') return true
    const episodeViewed = isViewed(episode.id)
    return viewFilter === 'viewed' ? episodeViewed : !episodeViewed
  })

  return (
    <div>
      {/* Filter controls */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-chalk-dim text-sm">
          {filteredEpisodes.length} of {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
          {viewFilter !== 'all' && ` (${viewFilter})`}
        </p>
        
        {/* View filter toggle */}
        <div className="flex items-center gap-1 bg-crime-surface rounded-lg p-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewFilter === 'all'
                ? 'bg-crime-elevated text-chalk'
                : 'text-chalk-dim hover:text-chalk'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange('unviewed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
              viewFilter === 'unviewed'
                ? 'bg-crime-elevated text-chalk'
                : 'text-chalk-dim hover:text-chalk'
            }`}
          >
            <EyeOff className="h-3 w-3" />
            Unviewed
          </button>
          <button
            onClick={() => onFilterChange('viewed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
              viewFilter === 'viewed'
                ? 'bg-green-700 text-chalk'
                : 'text-chalk-dim hover:text-chalk'
            }`}
          >
            <Eye className="h-3 w-3" />
            Viewed
          </button>
        </div>
      </div>

      {/* Episodes Grid */}
      {filteredEpisodes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEpisodes.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-chalk-dim mb-2">
            {viewFilter === 'viewed' ? (
              <Eye className="h-8 w-8 mx-auto" />
            ) : (
              <EyeOff className="h-8 w-8 mx-auto" />
            )}
          </div>
          <p className="text-chalk-muted">
            {viewFilter === 'viewed' 
              ? "No episodes marked as viewed yet"
              : "All episodes have been viewed"}
          </p>
        </div>
      )}

      {/* Infinite scroll sentinel & loading indicator */}
      <div ref={sentinelRef} className="mt-8 flex justify-center min-h-[60px]">
        {isLoading && viewFilter === 'all' && (
          <div className="flex items-center gap-2 text-chalk-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more episodes...</span>
          </div>
        )}
        {viewFilter === 'all' && !hasMore && episodes.length > 0 && (
          <p className="text-chalk-dim text-sm">No more episodes to load</p>
        )}
        {viewFilter !== 'all' && filteredEpisodes.length > 0 && (
          <p className="text-chalk-dim text-sm">
            Showing {filteredEpisodes.length} {viewFilter} episode{filteredEpisodes.length !== 1 ? 's' : ''} from {episodes.length} loaded
          </p>
        )}
      </div>
    </div>
  )
}

interface EpisodeCardProps {
  episode: EpisodeData
}

function EpisodeCard({ episode }: EpisodeCardProps) {
  const stillUrl = TMDbClient.getStillUrl(episode.stillPath, 'w300')
  
  // Get denied match IDs to filter out from related count
  const [deniedIds, setDeniedIds] = useState<Set<number>>(new Set())
  const [viewed, setViewed] = useState(false)
  
  useEffect(() => {
    setDeniedIds(getDeniedMatchIds(episode.id))
    setViewed(isViewed(episode.id))
  }, [episode.id])
  
  // Filter related episode IDs by removing denied ones
  const relatedIds = episode.relatedEpisodeIds ?? []
  const filteredRelatedIds = relatedIds.filter(id => !deniedIds.has(id))
  const hasRelated = filteredRelatedIds.length > 0
  
  // Build the indicator text based on filtered count
  let relatedText = ''
  if (hasRelated) {
    const relatedShows = episode.relatedShows ?? []
    if (relatedShows.length > 0) {
      // Cross-show match - show the other show name
      relatedText = `Also on ${relatedShows[0]}`
    } else {
      // Same-show match only
      relatedText = `+${filteredRelatedIds.length} related`
    }
  }

  return (
    <Link
      to="/episodes/$showId/$episodeId"
      params={{ 
        showId: String(episode.showTmdbId), 
        episodeId: String(episode.id) 
      }}
      className={`bg-crime-surface rounded-lg overflow-hidden border transition-all group ${
        viewed 
          ? 'border-green-700/50 hover:border-green-600' 
          : 'border-crime-elevated hover:border-blood'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-crime-dark relative overflow-hidden">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={episode.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              viewed ? 'opacity-50' : ''
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-chalk-dim text-sm">
            No Image
          </div>
        )}
        {/* Episode number badge */}
        <div className="absolute top-2 left-2 bg-crime-black/80 px-2 py-1 rounded text-xs font-mono text-chalk">
          {formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}
        </div>
        {/* Related episodes indicator */}
        {hasRelated && (
          <div className="absolute top-2 right-2 bg-tape px-2 py-1 rounded text-xs font-medium text-crime-black">
            {relatedText}
          </div>
        )}
        {/* Viewed indicator */}
        {viewed && (
          <div className="absolute bottom-2 right-2 bg-green-700 p-1.5 rounded-full">
            <Eye className="h-3 w-3 text-chalk" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className={`font-medium transition-colors line-clamp-2 text-sm ${
          viewed 
            ? 'text-chalk-muted group-hover:text-green-400' 
            : 'text-chalk group-hover:text-blood-light'
        }`}>
          {episode.name}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2 text-xs text-chalk-dim">
          {episode.airDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(episode.airDate)}
            </span>
          )}
          {episode.runtime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRuntime(episode.runtime)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
