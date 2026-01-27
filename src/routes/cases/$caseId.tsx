/**
 * Case Detail Route
 * Displays case information and episode coverage timeline
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { CaseTimeline } from '@/components/cases'
import { Badge, Loading } from '@/components/common'
import { useAuth } from '@/components/auth'
import { ArrowLeft, ExternalLink, Edit2 } from 'lucide-react'
import type { Case, EpisodeWithShow } from '@/lib/supabase/types'

export const Route = createFileRoute('/cases/$caseId')({
  component: CaseDetailPage,
})

interface CaseCoverage {
  show_id: number
  show_name: string
  show_network: string | null
  episode_count: number
  first_air_date: string | null
  latest_air_date: string | null
}

function CaseDetailPage() {
  const { caseId } = Route.useParams()
  const { user } = useAuth()
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeWithShow[]>([])
  const [coverage, setCoverage] = useState<CaseCoverage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchCaseData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch case
        const { data: caseResult, error: caseError } = await supabase
          .from('cases')
          .select('*')
          .eq('id', caseId)
          .single()

        if (caseError) throw caseError
        setCaseData(caseResult)

        // Fetch episodes linked to this case
        const { data: episodeCases } = await supabase
          .from('episode_cases')
          .select('episode_id')
          .eq('case_id', caseId)

        if (episodeCases && episodeCases.length > 0) {
          const episodeIds = episodeCases.map((ec) => ec.episode_id)

          const { data: episodesResult } = await supabase
            .from('episodes_with_show')
            .select('*')
            .in('id', episodeIds)
            .order('air_date', { ascending: true })

          setEpisodes(episodesResult || [])
        }

        // Fetch coverage stats
        const { data: coverageResult } = await supabase.rpc(
          'get_case_coverage',
          {
            case_id_param: parseInt(caseId, 10),
          },
        )

        setCoverage(coverageResult || [])
      } catch (err) {
        console.error('Error fetching case:', err)
        setError('Case not found')
      } finally {
        setLoading(false)
      }
    }

    fetchCaseData()
  }, [supabase, caseId])

  if (loading) {
    return <Loading message="Loading case..." />
  }

  if (error || !caseData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">{error || 'Case not found'}</p>
          <Link
            to="/cases"
            className="inline-flex items-center gap-2 mt-4 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to cases
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        to="/cases"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> All Cases
      </Link>

      {/* Case Header */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">
              {caseData.name}
            </h1>

            {/* Location and year */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {caseData.year && (
                <Badge variant="default">{caseData.year}</Badge>
              )}
              {(caseData.location || caseData.state) && (
                <span className="text-slate-400">
                  {[caseData.location, caseData.state]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              )}
            </div>

            {/* Summary */}
            {caseData.summary && (
              <p className="text-slate-300 leading-relaxed mb-4 max-w-3xl">
                {caseData.summary}
              </p>
            )}

            {/* Victims and Perpetrators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {caseData.victim_names && caseData.victim_names.length > 0 && (
                <div>
                  <h3 className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Victims
                  </h3>
                  <p className="text-white">
                    {caseData.victim_names.join(', ')}
                  </p>
                </div>
              )}
              {caseData.perpetrator_names &&
                caseData.perpetrator_names.length > 0 && (
                  <div>
                    <h3 className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                      Perpetrators
                    </h3>
                    <p className="text-white">
                      {caseData.perpetrator_names.join(', ')}
                    </p>
                  </div>
                )}
            </div>

            {/* Wikipedia link */}
            {caseData.wikipedia_url && (
              <a
                href={caseData.wikipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Wikipedia
              </a>
            )}
          </div>

          {/* Edit button (for authorized users) */}
          {user && caseData.created_by === user.id && (
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm">
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Coverage Stats */}
      {coverage.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Coverage by Show
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coverage.map((show) => (
              <Link
                key={show.show_id}
                to="/shows/$showId"
                params={{ showId: String(show.show_id) }}
                className="bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500 p-4 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">{show.show_name}</h3>
                  {show.show_network && (
                    <Badge variant="default" size="sm">
                      {show.show_network}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  <span className="text-red-400 font-semibold">
                    {show.episode_count}
                  </span>{' '}
                  {show.episode_count === 1 ? 'episode' : 'episodes'}
                </p>
                {show.first_air_date && (
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(show.first_air_date).getFullYear()}
                    {show.latest_air_date &&
                      show.first_air_date !== show.latest_air_date && (
                        <> - {new Date(show.latest_air_date).getFullYear()}</>
                      )}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Episode Timeline */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Episode Timeline
        </h2>
        <CaseTimeline episodes={episodes} />
      </div>
    </div>
  )
}
