/**
 * Episode Detail Route
 * Displays episode information from TMDb
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { TMDbClient } from '@/lib/tmdb'
import { getEpisodeById } from '@/lib/tmdb/server'
import { Badge, Loading } from '@/components/common'
import {
  formatDate,
  formatEpisodeNumber,
  formatRuntime,
} from '@/lib/utils/formatters'
import { ArrowLeft, Calendar, Clock, Tv } from 'lucide-react'

export const Route = createFileRoute('/episodes/$showId/$episodeId')({
  loader: async ({ params }) => {
    const showId = parseInt(params.showId, 10)
    const episodeId = parseInt(params.episodeId, 10)
    
    if (isNaN(showId) || isNaN(episodeId)) {
      throw new Error('Invalid show or episode ID')
    }
    
    const episode = await getEpisodeById({ data: { showId, episodeId } })
    return { episode }
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
  const { episode } = Route.useLoaderData()

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
    </div>
  )
}
