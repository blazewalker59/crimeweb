/**
 * Header Component
 * Simple navigation header for the app
 */
import { Link } from '@tanstack/react-router'

export function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-red-500 text-2xl font-bold">CrimeWeb</span>
          </Link>

          {/* Tagline */}
          <span className="hidden sm:block text-sm text-slate-400">
            Latest True Crime Episodes
          </span>
        </div>
      </div>
    </header>
  )
}
