/**
 * Show Detail Route
 * Displays show information and episode list
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { TMDbClient } from '@/lib/tmdb'
import { EpisodeList } from '@/components/shows'
import { Badge, Loading, Pagination } from '@/components/common'
import { formatDate } from '@/lib/utils/formatters'
import type { Show, Episode } from '@/lib/supabase/types'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/shows/$showId')({
  component: ShowDetailPage,
})

const EPISODES_PER_PAGE = 20

function ShowDetailPage() {
  const { showId } = Route.useParams()
  const [show, setShow] = useState<Show | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalEpisodes, setTotalEpisodes] = useState(0)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [seasons, setSeasons] = useState<number[]>([])

  const supabase = createBrowserClient()

  // Fetch show data
  useEffect(() => {
    const fetchShow = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('shows')
          .select('*')
          .eq('id', showId)
          .single()

        if (fetchError) throw fetchError
        setShow(data)
      } catch (err) {
        console.error('Error fetching show:', err)
        setError('Show not found')
      }
    }

    fetchShow()
  }, [supabase, showId])

  // Fetch seasons
  useEffect(() => {
    if (!show) return

    const fetchSeasons = async () => {
      const { data } = await supabase
        .from('episodes')
        .select('season_number')
        .eq('show_id', show.id)
        .order('season_number')

      if (data) {
        const uniqueSeasons = [...new Set(data.map((ep) => ep.season_number))]
        setSeasons(uniqueSeasons)
      }
    }

    fetchSeasons()
  }, [supabase, show])

  // Fetch episodes
  useEffect(() => {
    if (!show) return

    const fetchEpisodes = async () => {
      setLoading(true)

      try {
        let query = supabase
          .from('episodes')
          .select('*', { count: 'exact' })
          .eq('show_id', show.id)
          .order('season_number', { ascending: false })
          .order('episode_number', { ascending: false })

        // Filter by season if selected
        if (selectedSeason !== null) {
          query = query.eq('season_number', selectedSeason)
        }

        // Apply pagination
        const from = (currentPage - 1) * EPISODES_PER_PAGE
        const to = from + EPISODES_PER_PAGE - 1
        query = query.range(from, to)

        const { data, error: fetchError, count } = await query

        if (fetchError) throw fetchError

        setEpisodes(data || [])
        setTotalEpisodes(count || 0)
      } catch (err) {
        console.error('Error fetching episodes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEpisodes()
  }, [supabase, show, selectedSeason, currentPage])

  // Reset page when season changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedSeason])

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">{error}</p>
          <Link
            to="/shows"
            className="inline-flex items-center gap-2 mt-4 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to shows
          </Link>
        </div>
      </div>
    )
  }

  if (!show) {
    return <Loading message="Loading show..." />
  }

  const backdropUrl = TMDbClient.getBackdropUrl(show.backdrop_path, 'w1280')
  const posterUrl = TMDbClient.getPosterUrl(show.poster_path, 'w342')
  const totalPages = Math.ceil(totalEpisodes / EPISODES_PER_PAGE)

  return (
    <div>
      {/* Hero section with backdrop */}
      <div className="relative">
        {/* Backdrop image */}
        {backdropUrl && (
          <div className="absolute inset-0 h-64 md:h-80">
            <img
              src={backdropUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-24">
          {/* Back link */}
          <Link
            to="/shows"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> All Shows
          </Link>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Poster */}
            {posterUrl && (
              <div className="flex-shrink-0 w-48 mx-auto md:mx-0">
                <img
                  src={posterUrl}
                  alt={show.name}
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
            )}

            {/* Show info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {show.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                {show.network && <Badge variant="info">{show.network}</Badge>}
                {show.status && (
                  <Badge
                    variant={
                      show.status === 'Returning Series' ? 'success' : 'default'
                    }
                  >
                    {show.status}
                  </Badge>
                )}
                {show.first_air_date && (
                  <span className="text-slate-400 text-sm">
                    Since {formatDate(show.first_air_date, { year: 'numeric' })}
                  </span>
                )}
              </div>

              {show.overview && (
                <p className="text-slate-300 leading-relaxed mb-4 max-w-2xl">
                  {show.overview}
                </p>
              )}

              <div className="flex items-center gap-6 text-sm text-slate-400">
                <span>
                  <strong className="text-white">
                    {show.number_of_seasons}
                  </strong>{' '}
                  seasons
                </span>
                <span>
                  <strong className="text-white">
                    {show.number_of_episodes}
                  </strong>{' '}
                  episodes
                </span>
                {show.vote_average && show.vote_average > 0 && (
                  <span>
                    <strong className="text-white">
                      {show.vote_average.toFixed(1)}
                    </strong>{' '}
                    rating
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white">Episodes</h2>

          {/* Season filter */}
          {seasons.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Season:</span>
              <select
                value={selectedSeason ?? ''}
                onChange={(e) =>
                  setSelectedSeason(
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-500"
              >
                <option value="">All Seasons</option>
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    Season {season}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <Loading message="Loading episodes..." />
        ) : (
          <>
            <EpisodeList
              episodes={episodes}
              showName={show.name}
              emptyMessage="No episodes found"
            />

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

            {/* Total count */}
            {totalEpisodes > 0 && (
              <p className="text-center text-slate-500 text-sm mt-4">
                Showing {episodes.length} of {totalEpisodes} episodes
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
