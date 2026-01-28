/**
 * Episode Detail Route
 * Displays episode information from TMDb with related episodes
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { TMDbClient } from '@/lib/tmdb'
import { getEpisodeById, getRelatedEpisodes } from '@/lib/tmdb/server'
import { Badge, Loading } from '@/components/common'
import {
  formatDate,
  formatEpisodeNumber,
  formatRuntime,
} from '@/lib/utils/formatters'
import { ArrowLeft, Calendar, Clock, Tv, Link2 } from 'lucide-react'
import type { MatchResult } from '@/lib/matching'

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
      {relatedEpisodes.length > 0 && (
        <div className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Link2 className="h-5 w-5 text-red-500" />
            Related Episodes
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Other episodes that may cover the same case or story
          </p>
          <div className="space-y-3">
            {relatedEpisodes.map((related) => (
              <RelatedEpisodeCard key={related.episodeId} episode={related} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface RelatedEpisodeCardProps {
  episode: MatchResult
}

function RelatedEpisodeCard({ episode }: RelatedEpisodeCardProps) {
  const stillUrl = TMDbClient.getStillUrl(episode.stillPath, 'w185')
  const matchPercent = Math.round(episode.score * 100)

  return (
    <Link
      to="/episodes/$showId/$episodeId"
      params={{
        showId: String(episode.showTmdbId),
        episodeId: String(episode.episodeId),
      }}
      className="flex gap-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-red-500/50 transition-colors p-3 group"
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-24 h-16 bg-slate-700 rounded overflow-hidden">
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
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">
              {episode.showName} &middot;{' '}
              {formatEpisodeNumber(episode.seasonNumber, episode.episodeNumber)}
            </p>
            <h3 className="font-medium text-white group-hover:text-red-400 transition-colors line-clamp-1">
              {episode.name}
            </h3>
          </div>
          <div className="flex-shrink-0 text-right">
            <span className="text-xs font-medium text-amber-400">
              {matchPercent}% match
            </span>
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
    </Link>
  )
}
