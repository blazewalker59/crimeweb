/**
 * Episode Detail Route
 * Displays episode information and linked cases
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { TMDbClient } from '@/lib/tmdb'
import { Badge, Loading } from '@/components/common'
import { CaseCard, LinkEpisodeModal, CreateCaseModal } from '@/components/cases'
import { useAuth } from '@/components/auth'
import {
  formatDate,
  formatEpisodeNumber,
  formatRuntime,
} from '@/lib/utils/formatters'
import { findMatchingCases } from '@/lib/matching'
import {
  ArrowLeft,
  Link as LinkIcon,
  Plus,
  Bookmark,
  Check,
  Clock,
} from 'lucide-react'
import type { EpisodeWithShow, Case, CaseWithStats } from '@/lib/supabase/types'

export const Route = createFileRoute('/episodes/$episodeId')({
  component: EpisodeDetailPage,
})

function EpisodeDetailPage() {
  const { episodeId } = Route.useParams()
  const { user } = useAuth()
  const [episode, setEpisode] = useState<EpisodeWithShow | null>(null)
  const [linkedCases, setLinkedCases] = useState<Case[]>([])
  const [suggestedCases, setSuggestedCases] = useState<CaseWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [isWatched, setIsWatched] = useState(false)

  const supabase = createBrowserClient()

  const fetchEpisodeData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch episode
      const { data: episodeResult, error: episodeError } = await supabase
        .from('episodes_with_show')
        .select('*')
        .eq('id', episodeId)
        .single()

      if (episodeError) throw episodeError
      setEpisode(episodeResult)

      // Fetch linked cases
      const { data: episodeCases } = await supabase
        .from('episode_cases')
        .select('case_id')
        .eq('episode_id', episodeId)

      if (episodeCases && episodeCases.length > 0) {
        const caseIds = episodeCases.map((ec) => ec.case_id)
        const { data: casesResult } = await supabase
          .from('cases')
          .select('*')
          .in('id', caseIds)

        setLinkedCases(casesResult || [])
      }

      // Check watchlist status
      if (user) {
        const { data: watchlistItem } = await supabase
          .from('watchlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('episode_id', episodeId)
          .single()

        setIsInWatchlist(!!watchlistItem)

        const { data: watchedItem } = await supabase
          .from('watch_history')
          .select('id')
          .eq('user_id', user.id)
          .eq('episode_id', episodeId)
          .single()

        setIsWatched(!!watchedItem)
      }

      // Get suggested cases based on episode title
      if (episodeResult) {
        const { data: allCases } = await supabase
          .from('cases_with_stats')
          .select('*')
          .limit(100)

        if (allCases) {
          // Use findMatchingCases to get suggestions
          const matches = findMatchingCases(episodeResult.name, allCases, 0.3)
          setSuggestedCases(
            matches.slice(0, 5).map((m) => m.item as CaseWithStats),
          )
        }
      }
    } catch (err) {
      console.error('Error fetching episode:', err)
      setError('Episode not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEpisodeData()
  }, [supabase, episodeId, user])

  const handleLinkCase = async (caseId: number) => {
    if (!user) return

    await supabase.from('episode_cases').insert({
      episode_id: parseInt(episodeId, 10),
      case_id: caseId,
      is_primary: linkedCases.length === 0,
      confidence_score: 1.0,
      linked_by: user.id,
    })

    fetchEpisodeData()
  }

  const handleToggleWatchlist = async () => {
    if (!user || !episode) return

    if (isInWatchlist) {
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('episode_id', episode.id)
    } else {
      await supabase.from('watchlist').insert({
        user_id: user.id,
        episode_id: episode.id,
      })
    }

    setIsInWatchlist(!isInWatchlist)
  }

  const handleMarkWatched = async () => {
    if (!user || !episode) return

    if (isWatched) {
      await supabase
        .from('watch_history')
        .delete()
        .eq('user_id', user.id)
        .eq('episode_id', episode.id)
    } else {
      await supabase.from('watch_history').insert({
        user_id: user.id,
        episode_id: episode.id,
      })
      // Remove from watchlist when marking as watched
      if (isInWatchlist) {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('episode_id', episode.id)
        setIsInWatchlist(false)
      }
    }

    setIsWatched(!isWatched)
  }

  if (loading) {
    return <Loading message="Loading episode..." />
  }

  if (error || !episode) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">{error || 'Episode not found'}</p>
          <Link
            to="/shows"
            className="inline-flex items-center gap-2 mt-4 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Browse shows
          </Link>
        </div>
      </div>
    )
  }

  const stillUrl = TMDbClient.getStillUrl(episode.still_path, 'w500')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        to="/shows/$showId"
        params={{ showId: String(episode.show_id) }}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {episode.show_name}
      </Link>

      {/* Episode Header */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden mb-8">
        <div className="md:flex">
          {/* Still image */}
          {stillUrl && (
            <div className="md:w-1/3 flex-shrink-0">
              <img
                src={stillUrl}
                alt={episode.name}
                className="w-full h-48 md:h-full object-cover"
              />
            </div>
          )}

          {/* Info */}
          <div className="p-6 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Link
                to="/shows/$showId"
                params={{ showId: String(episode.show_id) }}
                className="text-red-400 hover:text-red-300 font-medium"
              >
                {episode.show_name}
              </Link>
              {episode.show_network && (
                <Badge variant="default">{episode.show_network}</Badge>
              )}
              {episode.is_rerun && <Badge variant="warning">Rerun</Badge>}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {episode.name}
            </h1>

            <p className="text-slate-400 mb-4">
              {formatEpisodeNumber(
                episode.season_number,
                episode.episode_number,
              )}
              {episode.air_date && <> &bull; {formatDate(episode.air_date)}</>}
              {episode.runtime && <> &bull; {formatRuntime(episode.runtime)}</>}
            </p>

            {episode.overview && (
              <p className="text-slate-300 leading-relaxed mb-4">
                {episode.overview}
              </p>
            )}

            {/* Action buttons */}
            {user && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleToggleWatchlist}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isInWatchlist
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                </button>

                <button
                  onClick={handleMarkWatched}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isWatched
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {isWatched ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  {isWatched ? 'Watched' : 'Mark as Watched'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linked Cases */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Linked Cases</h2>
          {user && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                <LinkIcon className="h-4 w-4" />
                Link Case
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Case
              </button>
            </div>
          )}
        </div>

        {linkedCases.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {linkedCases.map((caseData) => (
              <CaseCard key={caseData.id} caseData={caseData} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
            <p className="text-slate-400 mb-4">
              No cases linked to this episode yet.
            </p>
            {user && (
              <p className="text-slate-500 text-sm">
                Know what case this episode covers? Link it or create a new one!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <LinkEpisodeModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        episodeId={parseInt(episodeId, 10)}
        episodeName={episode.name}
        onLink={handleLinkCase}
        suggestedCases={suggestedCases}
      />

      <CreateCaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        episodeIdToLink={parseInt(episodeId, 10)}
        onCreated={() => {
          setShowCreateModal(false)
          fetchEpisodeData()
        }}
      />
    </div>
  )
}
