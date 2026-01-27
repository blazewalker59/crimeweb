/**
 * Case Timeline Component
 * Shows all episodes covering a case in chronological order
 */
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/common'
import { TMDbClient } from '@/lib/tmdb'
import { formatDate, formatEpisodeNumber } from '@/lib/utils/formatters'
import type { EpisodeWithShow } from '@/lib/supabase/types'

interface CaseTimelineProps {
  episodes: EpisodeWithShow[]
}

export function CaseTimeline({ episodes }: CaseTimelineProps) {
  // Sort by air date, oldest first
  const sortedEpisodes = [...episodes].sort((a, b) => {
    if (!a.air_date && !b.air_date) return 0
    if (!a.air_date) return 1
    if (!b.air_date) return -1
    return new Date(a.air_date).getTime() - new Date(b.air_date).getTime()
  })

  // Group episodes by show for summary
  const showCounts = sortedEpisodes.reduce(
    (acc, ep) => {
      acc[ep.show_name] = (acc[ep.show_name] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  if (sortedEpisodes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">No episodes linked to this case yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(showCounts).map(([showName, count]) => (
          <Badge key={showName} variant="info">
            {showName}: {count} {count === 1 ? 'episode' : 'episodes'}
          </Badge>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-700" />

        <div className="space-y-4">
          {sortedEpisodes.map((episode, index) => {
            const stillUrl = TMDbClient.getStillUrl(episode.still_path, 'w185')

            return (
              <div key={episode.id} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 w-10 h-10 bg-slate-800 border-2 border-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-red-400">
                    {index + 1}
                  </span>
                </div>

                {/* Episode card */}
                <Link
                  to="/episodes/$episodeId"
                  params={{ episodeId: String(episode.id) }}
                  className="flex-1 bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500 transition-colors overflow-hidden"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    {stillUrl && (
                      <div className="flex-shrink-0 w-32 h-20">
                        <img
                          src={stillUrl}
                          alt={episode.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-3 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {/* Show name and network */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-red-400">
                              {episode.show_name}
                            </span>
                            {episode.show_network && (
                              <Badge variant="default" size="sm">
                                {episode.show_network}
                              </Badge>
                            )}
                          </div>

                          {/* Episode title */}
                          <h4 className="text-sm font-medium text-white line-clamp-1">
                            {episode.name}
                          </h4>

                          {/* Episode number */}
                          <p className="text-xs text-slate-400">
                            {formatEpisodeNumber(
                              episode.season_number,
                              episode.episode_number,
                            )}
                          </p>
                        </div>

                        {/* Date */}
                        {episode.air_date && (
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {formatDate(episode.air_date)}
                          </span>
                        )}
                      </div>

                      {/* Rerun indicator */}
                      {episode.is_rerun && (
                        <Badge variant="warning" size="sm">
                          Rerun
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
