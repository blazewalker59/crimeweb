/**
 * Watch History Route
 * User's watched episodes
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { ProtectedRoute, useAuth } from '@/components/auth'
import { Loading, Badge, EmptyState, Pagination } from '@/components/common'
import { TMDbClient } from '@/lib/tmdb'
import { formatDate, formatEpisodeNumber } from '@/lib/utils/formatters'
import { ArrowLeft, Trash2 } from 'lucide-react'
import type { EpisodeWithShow } from '@/lib/supabase/types'

export const Route = createFileRoute('/dashboard/history')({
  component: HistoryPage,
})

interface WatchedEpisode extends EpisodeWithShow {
  history_id: number
  watched_at: string
}

const EPISODES_PER_PAGE = 20

function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  )
}

function HistoryContent() {
  const { user } = useAuth()
  const [episodes, setEpisodes] = useState<WatchedEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = createBrowserClient()

  const fetchHistory = async () => {
    if (!user) return

    setLoading(true)

    try {
      // Get total count
      const { count } = await supabase
        .from('watch_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setTotalCount(count || 0)

      // Get paginated history items
      const from = (currentPage - 1) * EPISODES_PER_PAGE
      const to = from + EPISODES_PER_PAGE - 1

      const { data: historyItems } = await supabase
        .from('watch_history')
        .select('id, episode_id, watched_at')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .range(from, to)

      if (historyItems && historyItems.length > 0) {
        const episodeIds = historyItems.map((h) => h.episode_id)

        // Get episode details
        const { data: episodesData } = await supabase
          .from('episodes_with_show')
          .select('*')
          .in('id', episodeIds)

        if (episodesData) {
          // Merge history info with episode data
          const merged = historyItems.map((h) => {
            const episode = episodesData.find((e) => e.id === h.episode_id)
            return {
              ...episode!,
              history_id: h.id,
              watched_at: h.watched_at,
            }
          })
          setEpisodes(merged)
        }
      } else {
        setEpisodes([])
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [user, currentPage])

  const handleRemove = async (episodeId: number) => {
    if (!user) return

    await supabase
      .from('watch_history')
      .delete()
      .eq('user_id', user.id)
      .eq('episode_id', episodeId)

    setEpisodes((prev) => prev.filter((e) => e.id !== episodeId))
    setTotalCount((prev) => prev - 1)
  }

  const totalPages = Math.ceil(totalCount / EPISODES_PER_PAGE)

  if (loading) {
    return <Loading message="Loading watch history..." />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Watch History</h1>
        <p className="text-slate-400">
          {totalCount} {totalCount === 1 ? 'episode' : 'episodes'} watched
        </p>
      </div>

      {/* Episodes */}
      {episodes.length === 0 ? (
        <EmptyState
          title="No watch history yet"
          description="Mark episodes as watched to track what you've seen"
          actionLabel="Browse Shows"
          actionTo="/shows"
        />
      ) : (
        <>
          <div className="space-y-4">
            {episodes.map((episode) => {
              const stillUrl = TMDbClient.getStillUrl(
                episode.still_path,
                'w185',
              )

              return (
                <div
                  key={episode.id}
                  className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <Link
                      to="/episodes/$episodeId"
                      params={{ episodeId: String(episode.id) }}
                      className="flex-shrink-0 w-32 sm:w-48"
                    >
                      {stillUrl ? (
                        <img
                          src={stillUrl}
                          alt={episode.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-20 sm:h-28 bg-slate-700 flex items-center justify-center text-slate-500">
                          No Image
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="p-4 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              to="/shows/$showId"
                              params={{ showId: String(episode.show_id) }}
                              className="text-xs font-medium text-red-400 hover:text-red-300"
                            >
                              {episode.show_name}
                            </Link>
                            {episode.show_network && (
                              <Badge variant="default" size="sm">
                                {episode.show_network}
                              </Badge>
                            )}
                          </div>

                          <Link
                            to="/episodes/$episodeId"
                            params={{ episodeId: String(episode.id) }}
                            className="text-white font-medium hover:text-red-400 line-clamp-1"
                          >
                            {episode.name}
                          </Link>

                          <p className="text-sm text-slate-400">
                            {formatEpisodeNumber(
                              episode.season_number,
                              episode.episode_number,
                            )}
                            {episode.air_date && (
                              <> &bull; {formatDate(episode.air_date)}</>
                            )}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            Watched {formatDate(episode.watched_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => handleRemove(episode.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                          title="Remove from history"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
