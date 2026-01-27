/**
 * Episode List Component
 */
import { Link } from '@tanstack/react-router'
import { TMDbClient } from '@/lib/tmdb'
import { formatDate, formatEpisodeNumber, formatRuntime } from '@/lib/utils'
import { Badge } from '@/components/common'
import { Calendar, Clock, ExternalLink } from 'lucide-react'
import type { Episode } from '@/lib/supabase/types'

interface EpisodeListProps {
  episodes: Episode[]
  showName?: string
}

export function EpisodeList({ episodes, showName }: EpisodeListProps) {
  return (
    <div className="space-y-3">
      {episodes.map((episode) => (
        <EpisodeListItem
          key={episode.id}
          episode={episode}
          showName={showName}
        />
      ))}
    </div>
  )
}

interface EpisodeListItemProps {
  episode: Episode
  showName?: string
}

function EpisodeListItem({ episode, showName }: EpisodeListItemProps) {
  const stillUrl = TMDbClient.getStillUrl(episode.still_path, 'w300')

  return (
    <Link
      to="/episodes/$episodeId"
      params={{ episodeId: String(episode.id) }}
      className="flex gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="w-40 h-24 flex-shrink-0 bg-slate-700 rounded overflow-hidden">
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
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
              <span className="font-mono">
                {formatEpisodeNumber(
                  episode.season_number,
                  episode.episode_number,
                )}
              </span>
              {showName && (
                <>
                  <span>•</span>
                  <span className="truncate">{showName}</span>
                </>
              )}
            </div>
            <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors line-clamp-1">
              {episode.name}
            </h3>
          </div>

          {/* Badges */}
          <div className="flex flex-shrink-0 gap-2">
            {episode.is_rerun && <Badge variant="warning">Rerun</Badge>}
          </div>
        </div>

        {/* Description */}
        {episode.overview && (
          <p className="text-sm text-slate-400 mt-2 line-clamp-2">
            {episode.overview}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
          {episode.air_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(episode.air_date)}
            </span>
          )}
          {episode.runtime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatRuntime(episode.runtime)}
            </span>
          )}
        </div>
      </div>

      <ExternalLink className="h-5 w-5 text-slate-500 group-hover:text-red-400 transition-colors flex-shrink-0" />
    </Link>
  )
}

export { EpisodeListItem }
