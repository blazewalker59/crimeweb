/**
 * Search Route
 * Unified search across episodes and cases
 */
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Loading, Badge, SearchBar } from '@/components/common'
import { TMDbClient } from '@/lib/tmdb'
import { formatDate, formatEpisodeNumber } from '@/lib/utils/formatters'
import { Tv, FileText } from 'lucide-react'

// Search params type
interface SearchParams {
  q?: string
  type?: 'all' | 'episodes' | 'cases'
}

export const Route = createFileRoute('/search')({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: typeof search.q === 'string' ? search.q : undefined,
      type:
        search.type === 'episodes' || search.type === 'cases'
          ? search.type
          : 'all',
    }
  },
})

interface EpisodeResult {
  id: number
  show_id: number
  season_number: number
  episode_number: number
  name: string
  overview: string | null
  air_date: string | null
  show_name: string
  show_network: string | null
  rank: number
}

interface CaseResult {
  id: number
  name: string
  slug: string | null
  victim_names: string[]
  perpetrator_names: string[]
  location: string | null
  year: number | null
  summary: string | null
  episode_count: number
  rank: number
}

function SearchPage() {
  const { q, type = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [searchQuery, setSearchQuery] = useState(q || '')
  const [searchType, setSearchType] = useState<'all' | 'episodes' | 'cases'>(
    type,
  )
  const [episodeResults, setEpisodeResults] = useState<EpisodeResult[]>([])
  const [caseResults, setCaseResults] = useState<CaseResult[]>([])
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient()

  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (!q || q.trim().length < 2) {
        setEpisodeResults([])
        setCaseResults([])
        return
      }

      setLoading(true)

      try {
        // Search episodes
        if (searchType === 'all' || searchType === 'episodes') {
          const { data: episodes } = await supabase.rpc('search_episodes', {
            search_query: q,
          })
          setEpisodeResults((episodes as EpisodeResult[]) || [])
        } else {
          setEpisodeResults([])
        }

        // Search cases
        if (searchType === 'all' || searchType === 'cases') {
          const { data: cases } = await supabase.rpc('search_cases', {
            search_query: q,
          })
          setCaseResults((cases as CaseResult[]) || [])
        } else {
          setCaseResults([])
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [q, searchType, supabase])

  // Handle search submit
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    navigate({
      search: {
        q: query || undefined,
        type: searchType === 'all' ? undefined : searchType,
      },
    })
  }

  // Handle type change
  const handleTypeChange = (newType: 'all' | 'episodes' | 'cases') => {
    setSearchType(newType)
    if (searchQuery) {
      navigate({
        search: {
          q: searchQuery,
          type: newType === 'all' ? undefined : newType,
        },
      })
    }
  }

  const totalResults = episodeResults.length + caseResults.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
        <p className="text-slate-400">
          Find episodes and cases across all crime shows
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search episodes, cases, victims..."
          autoFocus
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'episodes', 'cases'] as const).map((filterType) => (
          <button
            key={filterType}
            onClick={() => handleTypeChange(filterType)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              searchType === filterType
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {filterType === 'all'
              ? 'All'
              : filterType === 'episodes'
                ? 'Episodes'
                : 'Cases'}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <Loading message="Searching..." />
      ) : !q || q.trim().length < 2 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">
            Enter at least 2 characters to search
          </p>
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No results found for "{q}"</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Episode Results */}
          {episodeResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Tv className="h-5 w-5 text-red-400" />
                <h2 className="text-xl font-semibold text-white">
                  Episodes ({episodeResults.length})
                </h2>
              </div>

              <div className="space-y-3">
                {episodeResults.slice(0, 10).map((episode) => (
                  <Link
                    key={episode.id}
                    to="/episodes/$episodeId"
                    params={{ episodeId: String(episode.id) }}
                    className="block bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500 p-4 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
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

                        <h3 className="text-white font-medium line-clamp-1">
                          {episode.name}
                        </h3>

                        <p className="text-sm text-slate-400">
                          {formatEpisodeNumber(
                            episode.season_number,
                            episode.episode_number,
                          )}
                          {episode.air_date && (
                            <> &bull; {formatDate(episode.air_date)}</>
                          )}
                        </p>

                        {episode.overview && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {episode.overview}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}

                {episodeResults.length > 10 && (
                  <p className="text-center text-slate-500 text-sm">
                    Showing 10 of {episodeResults.length} episode results
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Case Results */}
          {caseResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-red-400" />
                <h2 className="text-xl font-semibold text-white">
                  Cases ({caseResults.length})
                </h2>
              </div>

              <div className="space-y-3">
                {caseResults.slice(0, 10).map((caseData) => (
                  <Link
                    key={caseData.id}
                    to="/cases/$caseId"
                    params={{ caseId: String(caseData.id) }}
                    className="block bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500 p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-white font-medium line-clamp-1">
                          {caseData.name}
                        </h3>

                        {(caseData.location || caseData.year) && (
                          <p className="text-sm text-slate-400">
                            {[caseData.location, caseData.year]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        )}

                        {caseData.victim_names &&
                          caseData.victim_names.length > 0 && (
                            <p className="text-sm text-slate-500 mt-1">
                              Victims: {caseData.victim_names.join(', ')}
                            </p>
                          )}

                        {caseData.summary && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {caseData.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {caseData.year && (
                          <Badge variant="default" size="sm">
                            {caseData.year}
                          </Badge>
                        )}
                        {caseData.episode_count > 0 && (
                          <Badge variant="info" size="sm">
                            {caseData.episode_count} eps
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}

                {caseResults.length > 10 && (
                  <p className="text-center text-slate-500 text-sm">
                    Showing 10 of {caseResults.length} case results
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
