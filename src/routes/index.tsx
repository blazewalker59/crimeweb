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
import { Calendar, Clock, Tv, Loader2, Eye } from 'lucide-react'

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
        <section className="bg-gradient-to-b from-slate-800 to-slate-900 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Latest Episodes
            </h1>
            <p className="text-slate-400">
              Recent episodes from your favorite true crime shows
            </p>
          </div>
        </section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Tv className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No episodes found</p>
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
      <section className="bg-gradient-to-b from-slate-800 to-slate-900 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Latest Episodes
          </h1>
          <p className="text-slate-400 text-sm">
            Recent episodes from your favorite true crime shows
          </p>
        </div>
      </section>

      {/* Show Tabs */}
      <div className="sticky top-16 z-40 bg-slate-900 border-b border-slate-700">
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
          ? 'border-red-500 bg-slate-800/50 text-white'
          : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
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
        <div className={`font-medium text-sm ${isActive ? 'text-white' : ''}`}>
          {show.name}
        </div>
        {show.network && (
          <div className="text-xs text-slate-500">{show.network}</div>
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
}

function ShowContent({ episodes, hasMore, isLoading, onLoadMore }: ShowContentProps) {
  // Infinite scroll - loads more when sentinel becomes visible
  const sentinelRef = useInfiniteScroll({
    onLoadMore,
    hasMore,
    isLoading,
    rootMargin: '400px', // Start loading 400px before reaching the bottom
  })

  return (
    <div>
      {/* Episode count */}
      <p className="text-slate-400 text-sm mb-4">
        {episodes.length} episode{episodes.length !== 1 ? 's' : ''} loaded
      </p>

      {/* Episodes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>

      {/* Infinite scroll sentinel & loading indicator */}
      <div ref={sentinelRef} className="mt-8 flex justify-center min-h-[60px]">
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more episodes...</span>
          </div>
        )}
        {!hasMore && episodes.length > 0 && (
          <p className="text-slate-500 text-sm">No more episodes to load</p>
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
      className={`bg-slate-800 rounded-lg overflow-hidden border transition-colors group ${
        viewed 
          ? 'border-green-600/50 hover:border-green-500' 
          : 'border-slate-700 hover:border-red-500'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-slate-700 relative overflow-hidden">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={episode.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              viewed ? 'opacity-60' : ''
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
            No Image
          </div>
        )}
        {/* Episode number badge */}
        <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs font-mono text-white">
          {formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}
        </div>
        {/* Related episodes indicator */}
        {hasRelated && (
          <div className="absolute top-2 right-2 bg-amber-500 px-2 py-1 rounded text-xs font-medium text-black">
            {relatedText}
          </div>
        )}
        {/* Viewed indicator */}
        {viewed && (
          <div className="absolute bottom-2 right-2 bg-green-600 p-1.5 rounded-full">
            <Eye className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className={`font-medium transition-colors line-clamp-2 text-sm ${
          viewed 
            ? 'text-slate-400 group-hover:text-green-400' 
            : 'text-white group-hover:text-red-400'
        }`}>
          {episode.name}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
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
