/**
 * Home Page
 * Landing page with featured shows and cases
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { ShowCard } from '@/components/shows'
import { CaseCard } from '@/components/cases'
import { Loading } from '@/components/common'
import { ArrowRight, Tv, FileText, Users, Search } from 'lucide-react'
import type { Show, CaseWithStats } from '@/lib/supabase/types'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [shows, setShows] = useState<Show[]>([])
  const [cases, setCases] = useState<CaseWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    showCount: 0,
    episodeCount: 0,
    caseCount: 0,
  })

  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      try {
        // Fetch featured shows
        const { data: showsData } = await supabase
          .from('shows')
          .select('*')
          .order('number_of_episodes', { ascending: false })
          .limit(6)

        setShows(showsData || [])

        // Fetch popular cases (most covered)
        const { data: casesData } = await supabase
          .from('cases_with_stats')
          .select('*')
          .order('episode_count', { ascending: false })
          .limit(6)

        setCases(casesData || [])

        // Fetch stats
        const { count: showCount } = await supabase
          .from('shows')
          .select('*', { count: 'exact', head: true })

        const { count: episodeCount } = await supabase
          .from('episodes')
          .select('*', { count: 'exact', head: true })

        const { count: caseCount } = await supabase
          .from('cases')
          .select('*', { count: 'exact', head: true })

        setStats({
          showCount: showCount || 0,
          episodeCount: episodeCount || 0,
          caseCount: caseCount || 0,
        })
      } catch (err) {
        console.error('Error fetching home data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  if (loading) {
    return <Loading message="Loading..." />
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-800 to-slate-900 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Cross-Reference <span className="text-red-500">True Crime</span>{' '}
            Episodes
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Discover which cases have been covered by Dateline, 20/20, 48 Hours,
            Forensic Files, and more. Find updates, reruns, and related episodes
            all in one place.
          </p>

          {/* Search CTA */}
          <Link
            to="/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-lg font-medium transition-colors"
          >
            <Search className="h-5 w-5" />
            Search Episodes & Cases
          </Link>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">
                {stats.showCount}
              </p>
              <p className="text-slate-400">Shows</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">
                {stats.episodeCount.toLocaleString()}
              </p>
              <p className="text-slate-400">Episodes</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">
                {stats.caseCount.toLocaleString()}
              </p>
              <p className="text-slate-400">Cases</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="p-3 bg-red-900/30 rounded-lg w-fit mb-4">
                <Tv className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Multiple Networks
              </h3>
              <p className="text-slate-400">
                Episodes from NBC, ABC, CBS, and more true crime programs all
                indexed and searchable.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="p-3 bg-red-900/30 rounded-lg w-fit mb-4">
                <FileText className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Case Cross-Reference
              </h3>
              <p className="text-slate-400">
                See all episodes covering the same case, across different shows
                and air dates.
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="p-3 bg-red-900/30 rounded-lg w-fit mb-4">
                <Users className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Community Curated
              </h3>
              <p className="text-slate-400">
                Help link episodes to cases. Our database grows with
                contributions from crime show fans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Shows */}
      {shows.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Featured Shows</h2>
              <Link
                to="/shows"
                className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm font-medium"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {shows.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Cases */}
      {cases.length > 0 && (
        <section className="py-12 bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Most Covered Cases
              </h2>
              <Link
                to="/cases"
                className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm font-medium"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cases.map((caseData) => (
                <CaseCard key={caseData.id} caseData={caseData} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-t from-slate-800 to-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Help Build the Database
          </h2>
          <p className="text-slate-300 mb-8">
            Create an account to link episodes to cases, add new cases, and
            track your watch history. Every contribution helps fellow true crime
            fans discover more content.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/auth/register"
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Account
            </Link>
            <Link
              to="/shows"
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Browse Shows
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
