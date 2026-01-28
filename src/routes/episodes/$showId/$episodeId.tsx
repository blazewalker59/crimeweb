/**
 * Episode Detail Route
 * Displays episode information from TMDb with related episodes
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { TMDbClient } from '@/lib/tmdb'
import { getEpisodeById, getRelatedEpisodes } from '@/lib/tmdb/server'
import { Badge, Loading } from '@/components/common'
import {
  formatDate,
  formatEpisodeNumber,
  formatRuntime,
} from '@/lib/utils/formatters'
import { ArrowLeft, Calendar, Clock, Tv, Link2, Check, X, RotateCcw, Eye, EyeOff } from 'lucide-react'
import type { MatchResult } from '@/lib/matching'
import {
  type MatchDecision,
  getDecision,
  saveDecision,
  removeDecision,
  getDeniedMatchIds,
} from '@/lib/matching'
import { isViewed, toggleViewed } from '@/lib/episodes'

export const Route = createFileRoute('/episodes/$showId/$episodeId')({
  loader: async ({ params }) => {
    const showId = parseInt(params.showId, 10)
    const episodeId = parseInt(params.episodeId, 10)
    
    if (isNaN(showId) || isNaN(episodeId)) {
      throw new Error('Invalid show or episode ID')
    }
    
    const episode = await getEpisodeById({ data: { showId, episodeId } })
    
    // Fetch related episodes in parallel
    const relatedEpisodes = await getRelatedEpisodes({
      data: {
        episodeId,
        showId,
        name: episode.name,
        overview: episode.overview,
      },
    })
    
    return { episode, relatedEpisodes }
  },
  pendingComponent: () => <Loading message="Loading episode..." />,
  errorComponent: EpisodeError,
  component: EpisodeDetailPage,
})

function EpisodeError() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center py-12">
        <Tv className="h-12 w-12 text-slate-500 mx-auto mb-4" />
        <p className="text-red-400 text-lg">Episode not found</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-4 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  )
}

function EpisodeDetailPage() {
  const { episode, relatedEpisodes } = Route.useLoaderData()
  const [deniedIds, setDeniedIds] = useState<Set<number>>(new Set())
  const [viewed, setViewed] = useState(false)
  
  // Load denied match IDs and viewed status on mount
  useEffect(() => {
    setDeniedIds(getDeniedMatchIds(episode.id))
    setViewed(isViewed(episode.id))
  }, [episode.id])

  // Filter out denied matches
  const visibleRelatedEpisodes = relatedEpisodes.filter(
    (related) => !deniedIds.has(related.episodeId)
  )

  // Callback when a match is denied - update local state immediately
  const handleMatchDenied = useCallback((matchedEpisodeId: number) => {
    setDeniedIds((prev) => new Set([...prev, matchedEpisodeId]))
  }, [])

  // Callback when a denial is undone - remove from denied set
  const handleMatchRestored = useCallback((matchedEpisodeId: number) => {
    setDeniedIds((prev) => {
      const next = new Set(prev)
      next.delete(matchedEpisodeId)
      return next
    })
  }, [])

  // Toggle viewed status
  const handleToggleViewed = () => {
    const newViewed = toggleViewed(episode.id)
    setViewed(newViewed)
  }

  const stillUrl = TMDbClient.getStillUrl(episode.stillPath, 'original')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      {/* Episode Card */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {/* Still image */}
        {stillUrl && (
          <div className="w-full">
            <img
              src={stillUrl}
              alt={episode.name}
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>
        )}

        {/* Info */}
        <div className="p-6">
          {/* Show info badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-red-400 font-medium">{episode.showName}</span>
            {episode.showNetwork && (
              <Badge variant="default">{episode.showNetwork}</Badge>
            )}
          </div>

          {/* Episode title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            {episode.name}
          </h1>

          {/* Episode meta */}
          <div className="flex flex-wrap items-center gap-4 text-slate-400 mb-4">
            <span className="font-mono text-sm bg-slate-700 px-2 py-1 rounded">
              {formatEpisodeNumber(
                episode.seasonNumber,
                episode.episodeNumber,
              )}
            </span>
            {episode.airDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(episode.airDate)}
              </span>
            )}
            {episode.runtime && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatRuntime(episode.runtime)}
              </span>
            )}
          </div>

          {/* Viewed toggle button */}
          <button
            onClick={handleToggleViewed}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewed
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            {viewed ? (
              <>
                <Eye className="h-4 w-4" />
                Viewed
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                Mark as viewed
              </>
            )}
          </button>

          {/* Overview */}
          {episode.overview && (
            <div className="border-t border-slate-700 pt-4 mt-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Overview
              </h2>
              <p className="text-slate-300 leading-relaxed">{episode.overview}</p>
            </div>
          )}
        </div>
      </div>

      {/* Related Episodes */}
      {visibleRelatedEpisodes.length > 0 && (
        <div className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Link2 className="h-5 w-5 text-red-500" />
            Related Episodes
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Other episodes that may cover the same case or story
          </p>
          <div className="space-y-3">
            {visibleRelatedEpisodes.map((related) => (
              <RelatedEpisodeCard
                key={related.episodeId}
                episode={related}
                sourceEpisodeId={episode.id}
                onDeny={handleMatchDenied}
                onRestore={handleMatchRestored}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface RelatedEpisodeCardProps {
  episode: MatchResult
  sourceEpisodeId: number
  onDeny: (matchedEpisodeId: number) => void
  onRestore: (matchedEpisodeId: number) => void
}

function RelatedEpisodeCard({
  episode,
  sourceEpisodeId,
  onDeny,
  onRestore,
}: RelatedEpisodeCardProps) {
  const stillUrl = TMDbClient.getStillUrl(episode.stillPath, 'w185')
  const matchPercent = Math.round(episode.score * 100)
  
  // Load initial decision state
  const [decision, setDecision] = useState<MatchDecision | null>(() => {
    if (typeof window === 'undefined') return null
    return getDecision(sourceEpisodeId, episode.episodeId)
  })

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    saveDecision(sourceEpisodeId, episode.episodeId, 'confirmed')
    setDecision('confirmed')
  }

  const handleDeny = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    saveDecision(sourceEpisodeId, episode.episodeId, 'denied')
    setDecision('denied')
    onDeny(episode.episodeId)
  }

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    removeDecision(sourceEpisodeId, episode.episodeId)
    setDecision(null)
    // If we're undoing a denial, notify parent
    onRestore(episode.episodeId)
  }

  const isConfirmed = decision === 'confirmed'

  return (
    <div
      className={`flex gap-4 bg-slate-800/50 rounded-lg border transition-colors p-3 group ${
        isConfirmed
          ? 'border-green-500/50'
          : 'border-slate-700 hover:border-red-500/50'
      }`}
    >
      {/* Thumbnail - clickable link */}
      <Link
        to="/episodes/$showId/$episodeId"
        params={{
          showId: String(episode.showTmdbId),
          episodeId: String(episode.episodeId),
        }}
        className="flex-shrink-0 w-24 h-16 bg-slate-700 rounded overflow-hidden"
      >
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={episode.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            No Image
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/episodes/$showId/$episodeId"
            params={{
              showId: String(episode.showTmdbId),
              episodeId: String(episode.episodeId),
            }}
            className="min-w-0"
          >
            <p className="text-xs text-slate-500 mb-0.5">
              {episode.showName} &middot;{' '}
              {formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}
            </p>
            <h3 className="font-medium text-white group-hover:text-red-400 transition-colors line-clamp-1">
              {episode.name}
            </h3>
          </Link>
          <div className="flex-shrink-0 flex items-center gap-2">
            {/* Match percentage */}
            <span
              className={`text-xs font-medium ${
                isConfirmed ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              {isConfirmed ? 'Confirmed' : `${matchPercent}% match`}
            </span>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {decision === null ? (
                <>
                  <button
                    onClick={handleConfirm}
                    className="p-1 rounded hover:bg-green-500/20 text-slate-400 hover:text-green-400 transition-colors"
                    title="Confirm this match"
                    aria-label="Confirm match"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleDeny}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Not related"
                    aria-label="Deny match"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleReset}
                  className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                  title="Reset decision"
                  aria-label="Reset match decision"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Match reason and date */}
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
          {episode.matchReason && (
            <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">
              {episode.matchReason}
            </span>
          )}
          {episode.airDate && (
            <span>{formatDate(episode.airDate)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
