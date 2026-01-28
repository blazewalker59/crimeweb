/**
 * Home Page
 * Simple page showing latest episodes from each supported show
 * Mobile: Tabbed interface to switch between shows
 * Desktop: Same tabbed interface for consistency
 */
import { useState, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loading } from '@/components/common'
import { TMDbClient } from '@/lib/tmdb'
import { getLatestEpisodes, getMoreEpisodes, type ShowWithEpisodes, type EpisodeData } from '@/lib/tmdb/server'
import { formatDate, formatEpisodeNumber, formatRuntime } from '@/lib/utils'
import { Calendar, Clock, Tv, Link2, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/')({
  loader: async () => {
    const shows = await getLatestEpisodes()
    return { shows }
  },
  pendingComponent: () => <Loading message="Loading latest episodes..." />,
  component: HomePage,
})

function HomePage() {
  const { shows: initialShows } = Route.useLoaderData()
  const [activeShowIndex, setActiveShowIndex] = useState(0)
  
  // Track episodes and loading state per show
  const [showEpisodes, setShowEpisodes] = useState<Record<number, EpisodeData[]>>(() => {
    const initial: Record<number, EpisodeData[]> = {}
    for (const show of initialShows) {
      initial[show.tmdbId] = show.episodes
    }
    return initial
  })
  
  const [hasMore, setHasMore] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {}
    for (const show of initialShows) {
      // Assume there's more if we got the full initial batch (10)
      initial[show.tmdbId] = show.episodes.length >= 10
    }
    return initial
  })
  
  const [loadingMore, setLoadingMore] = useState<Record<number, boolean>>({})

  const loadMore = useCallback(async (showId: number) => {
    if (loadingMore[showId]) return
    
    setLoadingMore((prev) => ({ ...prev, [showId]: true }))
    
    try {
      const currentEpisodes = showEpisodes[showId] || []
      const result = await getMoreEpisodes({
        data: {
          showId,
          offset: currentEpisodes.length,
          limit: 5,
        },
      })
      
      setShowEpisodes((prev) => ({
        ...prev,
        [showId]: [...(prev[showId] || []), ...result.episodes],
      }))
      
      setHasMore((prev) => ({
        ...prev,
        [showId]: result.hasMore,
      }))
    } catch (error) {
      console.error('Failed to load more episodes:', error)
    } finally {
      setLoadingMore((prev) => ({ ...prev, [showId]: false }))
    }
  }, [showEpisodes, loadingMore])

  if (initialShows.length === 0) {
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

  const activeShow = initialShows[activeShowIndex]
  const activeEpisodes = showEpisodes[activeShow.tmdbId] || []
  const activeHasMore = hasMore[activeShow.tmdbId] ?? false
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
            {initialShows.map((show, index) => (
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

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:opacity-50 border border-slate-600 hover:border-slate-500 rounded-lg text-white font-medium transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Episodes'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

interface EpisodeCardProps {
  episode: EpisodeData
}

function EpisodeCard({ episode }: EpisodeCardProps) {
  const stillUrl = TMDbClient.getStillUrl(episode.stillPath, 'w300')
  const hasRelated = (episode.relatedCount ?? 0) > 0

  return (
    <Link
      to="/episodes/$showId/$episodeId"
      params={{ 
        showId: String(episode.showTmdbId), 
        episodeId: String(episode.id) 
      }}
      className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-red-500 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-slate-700 relative overflow-hidden">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={episode.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
          <div className="absolute top-2 right-2 bg-amber-500/90 px-2 py-1 rounded text-xs font-medium text-black flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            {episode.relatedCount}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-white group-hover:text-red-400 transition-colors line-clamp-2 text-sm">
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
