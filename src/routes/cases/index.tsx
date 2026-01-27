/**
 * Cases Index Route
 * Lists all cases in the database
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { CaseGrid } from '@/components/cases'
import { CreateCaseModal } from '@/components/cases'
import { Loading, SearchBar, Pagination } from '@/components/common'
import { useAuth } from '@/components/auth'
import { Plus } from 'lucide-react'
import type { CaseWithStats } from '@/lib/supabase/types'

export const Route = createFileRoute('/cases/')({
  component: CasesPage,
})

const CASES_PER_PAGE = 12

function CasesPage() {
  const { user } = useAuth()
  const [cases, setCases] = useState<CaseWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const supabase = createBrowserClient()

  const fetchCases = async () => {
    setLoading(true)
    setError(null)

    try {
      // If searching, use the search function
      if (searchQuery.trim()) {
        const { data, error: searchError } = await supabase.rpc(
          'search_cases',
          {
            search_query: searchQuery,
          },
        )

        if (searchError) throw searchError

        // Apply client-side pagination for search results
        const start = (currentPage - 1) * CASES_PER_PAGE
        const paginatedData = (data || []).slice(start, start + CASES_PER_PAGE)

        setCases(paginatedData as CaseWithStats[])
        setTotalCount(data?.length || 0)
      } else {
        // Regular query with server-side pagination
        const from = (currentPage - 1) * CASES_PER_PAGE
        const to = from + CASES_PER_PAGE - 1

        const {
          data,
          error: fetchError,
          count,
        } = await supabase
          .from('cases_with_stats')
          .select('*', { count: 'exact' })
          .order('episode_count', { ascending: false })
          .range(from, to)

        if (fetchError) throw fetchError

        setCases(data || [])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error fetching cases:', err)
      setError('Failed to load cases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [supabase, searchQuery, currentPage])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.ceil(totalCount / CASES_PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Crime Cases</h1>
          <p className="text-slate-400">
            Browse cases covered by true crime shows
          </p>
        </div>

        {/* Create button (only for logged in users) */}
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Case
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search cases by name, victim, or location..."
        />
      </div>

      {/* Content */}
      {loading ? (
        <Loading message="Loading cases..." />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400">{error}</p>
        </div>
      ) : (
        <>
          <CaseGrid
            cases={cases}
            emptyMessage={
              searchQuery
                ? 'No cases found matching your search'
                : 'No cases have been added yet. Be the first to add one!'
            }
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
          {!loading && totalCount > 0 && (
            <p className="text-center text-slate-500 text-sm mt-4">
              Showing {cases.length} of {totalCount} cases
            </p>
          )}
        </>
      )}

      {/* Create Case Modal */}
      <CreateCaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false)
          fetchCases()
        }}
      />
    </div>
  )
}
