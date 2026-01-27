/**
 * Home Page
 * Simple page showing latest episodes from each supported show
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loading } from '@/components/common'
import { TMDbClient } from '@/lib/tmdb'
import { getLatestEpisodes, type ShowWithEpisodes, type EpisodeData } from '@/lib/tmdb/server'
import { formatDate, formatEpisodeNumber, formatRuntime } from '@/lib/utils'
import { Calendar, Clock, Tv } from 'lucide-react'

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

  return (
    <div className="min-h-screen">
      {/* Header Section */}
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

      {/* Shows with Episodes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {shows.length === 0 ? (
          <div className="text-center py-12">
            <Tv className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No episodes found</p>
          </div>
        ) : (
          <div className="space-y-12">
            {shows.map((show) => (
              <ShowSection key={show.tmdbId} show={show} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ShowSectionProps {
  show: ShowWithEpisodes
}

function ShowSection({ show }: ShowSectionProps) {
  const posterUrl = TMDbClient.getPosterUrl(show.posterPath, 'w185')

  return (
    <section>
      {/* Show Header */}
      <div className="flex items-center gap-4 mb-4">
        {posterUrl && (
          <img
            src={posterUrl}
            alt={show.name}
            className="w-12 h-18 object-cover rounded"
          />
        )}
        <div>
          <h2 className="text-xl font-bold text-white">{show.name}</h2>
          {show.network && (
            <p className="text-sm text-slate-400">{show.network}</p>
          )}
        </div>
      </div>

      {/* Episodes Row - horizontal scroll on mobile, grid on larger screens */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-5">
        {show.episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </section>
  )
}

interface EpisodeCardProps {
  episode: EpisodeData
}

function EpisodeCard({ episode }: EpisodeCardProps) {
  const stillUrl = TMDbClient.getStillUrl(episode.stillPath, 'w300')

  return (
    <Link
      to="/episodes/$showId/$episodeId"
      params={{ 
        showId: String(episode.showTmdbId), 
        episodeId: String(episode.id) 
      }}
      className="flex-shrink-0 w-64 sm:w-auto bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-red-500 transition-colors group"
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
