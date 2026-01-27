/**
 * Dashboard Index Route
 * User dashboard with stats and recent activity
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { ProtectedRoute, useAuth } from '@/components/auth'
import { Loading, Badge } from '@/components/common'
import { Bookmark, Clock, FileText, User } from 'lucide-react'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
})

interface DashboardStats {
  watchlistCount: number
  watchedCount: number
  linkedCasesCount: number
}

function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    watchlistCount: 0,
    watchedCount: 0,
    linkedCasesCount: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient()

  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      setLoading(true)

      try {
        // Get watchlist count
        const { count: watchlistCount } = await supabase
          .from('watchlist')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // Get watch history count
        const { count: watchedCount } = await supabase
          .from('watch_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // Get linked cases count
        const { count: linkedCasesCount } = await supabase
          .from('episode_cases')
          .select('*', { count: 'exact', head: true })
          .eq('linked_by', user.id)

        setStats({
          watchlistCount: watchlistCount || 0,
          watchedCount: watchedCount || 0,
          linkedCasesCount: linkedCasesCount || 0,
        })
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase, user])

  if (loading) {
    return <Loading message="Loading dashboard..." />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">
          Welcome back, {profile?.display_name || user?.email?.split('@')[0]}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          to="/dashboard/watchlist"
          className="bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500 p-6 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900/30 rounded-lg">
              <Bookmark className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.watchlistCount}
              </p>
              <p className="text-sm text-slate-400">In Watchlist</p>
            </div>
          </div>
        </Link>

        <Link
          to="/dashboard/history"
          className="bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500 p-6 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-900/30 rounded-lg">
              <Clock className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.watchedCount}
              </p>
              <p className="text-sm text-slate-400">Episodes Watched</p>
            </div>
          </div>
        </Link>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.linkedCasesCount}
              </p>
              <p className="text-sm text-slate-400">Cases Linked</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-700 rounded-lg">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white truncate">
                {user?.email}
              </p>
              <p className="text-sm text-slate-400">
                {profile?.username ? `@${profile.username}` : 'Member'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              to="/shows"
              className="block p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-white font-medium">Browse Shows</span>
              <p className="text-sm text-slate-400">
                Explore episodes from true crime programs
              </p>
            </Link>
            <Link
              to="/cases"
              className="block p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-white font-medium">Browse Cases</span>
              <p className="text-sm text-slate-400">
                Find cases covered by multiple shows
              </p>
            </Link>
            <Link
              to="/search"
              className="block p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-white font-medium">Search</span>
              <p className="text-sm text-slate-400">
                Find specific episodes or cases
              </p>
            </Link>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Contribute to CrimeWeb
          </h2>
          <p className="text-slate-300 mb-4">
            Help build the database by linking episodes to cases. When you watch
            an episode, check if the case is already in our system or add it if
            it's new!
          </p>
          <div className="space-y-2 text-sm text-slate-400">
            <p>1. Browse to an episode detail page</p>
            <p>2. Click "Link Case" to connect it to an existing case</p>
            <p>3. Or click "New Case" to add a case we don't have yet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
