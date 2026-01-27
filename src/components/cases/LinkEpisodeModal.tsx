/**
 * Link Episode Modal Component
 * Allows users to link an episode to an existing case
 */
import { useState, useEffect } from 'react'
import { X, Search, Link as LinkIcon } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { Badge } from '@/components/common'
import type { Case, CaseWithStats } from '@/lib/supabase/types'

interface LinkEpisodeModalProps {
  isOpen: boolean
  onClose: () => void
  episodeId: number
  episodeName: string
  onLink: (caseId: number) => Promise<void>
  suggestedCases?: CaseWithStats[]
}

export function LinkEpisodeModal({
  isOpen,
  onClose,
  episodeId,
  episodeName,
  onLink,
  suggestedCases = [],
}: LinkEpisodeModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CaseWithStats[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  // Search cases when query changes
  useEffect(() => {
    const searchCases = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      setError(null)

      try {
        const { data, error: searchError } = await supabase.rpc(
          'search_cases',
          {
            search_query: searchQuery,
          },
        )

        if (searchError) throw searchError
        setSearchResults(data as CaseWithStats[])
      } catch (err) {
        console.error('Search error:', err)
        setError('Failed to search cases')
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchCases, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, supabase])

  const handleLink = async (caseId: number) => {
    setIsLinking(true)
    setError(null)

    try {
      await onLink(caseId)
      onClose()
    } catch (err) {
      console.error('Link error:', err)
      setError('Failed to link episode to case')
    } finally {
      setIsLinking(false)
    }
  }

  if (!isOpen) return null

  const casesToShow = searchQuery.trim()
    ? searchResults
    : suggestedCases.slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Link Episode to Case
            </h2>
            <p className="text-sm text-slate-400 line-clamp-1">{episodeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a case..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {isSearching ? (
            <div className="text-center py-8 text-slate-400">Searching...</div>
          ) : casesToShow.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">
                {searchQuery.trim()
                  ? 'No cases found matching your search'
                  : 'Start typing to search for cases'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {!searchQuery.trim() && suggestedCases.length > 0 && (
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                  Suggested matches
                </p>
              )}

              {casesToShow.map((caseData) => (
                <button
                  key={caseData.id}
                  onClick={() => handleLink(caseData.id)}
                  disabled={isLinking}
                  className="w-full text-left p-3 bg-slate-900 hover:bg-slate-700 border border-slate-700 hover:border-red-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-white line-clamp-1">
                        {caseData.name}
                      </h3>
                      {(caseData.location || caseData.state) && (
                        <p className="text-sm text-slate-400">
                          {[caseData.location, caseData.state]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {caseData.year && (
                        <Badge variant="default" size="sm">
                          {caseData.year}
                        </Badge>
                      )}
                      <LinkIcon className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  {'episode_count' in caseData && (
                    <p className="text-xs text-slate-500 mt-1">
                      {caseData.episode_count} episodes, {caseData.show_count}{' '}
                      shows
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
