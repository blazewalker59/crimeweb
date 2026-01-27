/**
 * Watchlist Route
 * User's saved episodes to watch later
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { ProtectedRoute, useAuth } from '@/components/auth'
import { Loading, Badge, EmptyState } from '@/components/common'
import { TMDbClient } from '@/lib/tmdb'
import { formatDate, formatEpisodeNumber } from '@/lib/utils/formatters'
import { ArrowLeft, Trash2, Check } from 'lucide-react'
import type { EpisodeWithShow } from '@/lib/supabase/types'

export const Route = createFileRoute('/dashboard/watchlist')({
  component: WatchlistPage,
})

interface WatchlistEpisode extends EpisodeWithShow {
  watchlist_id: number
  added_at: string
}

function WatchlistPage() {
  return (
    <ProtectedRoute>
      <WatchlistContent />
    </ProtectedRoute>
  )
}

function WatchlistContent() {
  const { user } = useAuth()
  const [episodes, setEpisodes] = useState<WatchlistEpisode[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient()

  const fetchWatchlist = async () => {
    if (!user) return

    setLoading(true)

    try {
      // Get watchlist items
      const { data: watchlistItems } = await supabase
        .from('watchlist')
        .select('id, episode_id, added_at')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })

      if (watchlistItems && watchlistItems.length > 0) {
        const episodeIds = watchlistItems.map((w) => w.episode_id)

        // Get episode details
        const { data: episodesData } = await supabase
          .from('episodes_with_show')
          .select('*')
          .in('id', episodeIds)

        if (episodesData) {
          // Merge watchlist info with episode data
          const merged = watchlistItems.map((w) => {
            const episode = episodesData.find((e) => e.id === w.episode_id)
            return {
              ...episode!,
              watchlist_id: w.id,
              added_at: w.added_at,
            }
          })
          setEpisodes(merged)
        }
      } else {
        setEpisodes([])
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
  }, [user])

  const handleRemove = async (episodeId: number) => {
    if (!user) return

    await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('episode_id', episodeId)

    setEpisodes((prev) => prev.filter((e) => e.id !== episodeId))
  }

  const handleMarkWatched = async (episode: WatchlistEpisode) => {
    if (!user) return

    // Add to watch history
    await supabase.from('watch_history').insert({
      user_id: user.id,
      episode_id: episode.id,
    })

    // Remove from watchlist
    await handleRemove(episode.id)
  }

  if (loading) {
    return <Loading message="Loading watchlist..." />
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
        <h1 className="text-3xl font-bold text-white mb-2">Watchlist</h1>
        <p className="text-slate-400">
          {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}{' '}
          saved
        </p>
      </div>

      {/* Episodes */}
      {episodes.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          description="Browse shows and add episodes you want to watch later"
          actionLabel="Browse Shows"
          actionTo="/shows"
        />
      ) : (
        <div className="space-y-4">
          {episodes.map((episode) => {
            const stillUrl = TMDbClient.getStillUrl(episode.still_path, 'w185')

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
                          Added {formatDate(episode.added_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleMarkWatched(episode)}
                          className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Mark as watched"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRemove(episode.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
