/**
 * Shows Index Route
 * Lists all available crime shows
 */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { ShowGrid } from '@/components/shows'
import { Loading, SearchBar, Pagination } from '@/components/common'
import type { Show } from '@/lib/supabase/types'

export const Route = createFileRoute('/shows/')({
  component: ShowsPage,
})

const SHOWS_PER_PAGE = 12

function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchShows = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('shows')
          .select('*', { count: 'exact' })
          .order('name')

        // Apply search filter
        if (searchQuery.trim()) {
          query = query.ilike('name', `%${searchQuery}%`)
        }

        // Apply pagination
        const from = (currentPage - 1) * SHOWS_PER_PAGE
        const to = from + SHOWS_PER_PAGE - 1
        query = query.range(from, to)

        const { data, error: fetchError, count } = await query

        if (fetchError) throw fetchError

        setShows(data || [])
        setTotalCount(count || 0)
      } catch (err) {
        console.error('Error fetching shows:', err)
        setError('Failed to load shows')
      } finally {
        setLoading(false)
      }
    }

    fetchShows()
  }, [supabase, searchQuery, currentPage])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.ceil(totalCount / SHOWS_PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Crime Shows</h1>
        <p className="text-slate-400">
          Browse episodes from the biggest true crime programs
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search shows..."
        />
      </div>

      {/* Content */}
      {loading ? (
        <Loading message="Loading shows..." />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400">{error}</p>
        </div>
      ) : (
        <>
          <ShowGrid
            shows={shows}
            emptyMessage={
              searchQuery
                ? 'No shows found matching your search'
                : 'No shows available'
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
              Showing {shows.length} of {totalCount} shows
            </p>
          )}
        </>
      )}
    </div>
  )
}
