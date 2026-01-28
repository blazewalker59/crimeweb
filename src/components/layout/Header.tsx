/**
 * Header Component
 * Crime scene themed navigation header
 */
import { Link } from '@tanstack/react-router'

export function Header() {
  return (
    <header className="bg-crime-dark border-b border-crime-elevated sticky top-0 z-50">
      {/* Subtle red accent line at top */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-blood to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <span className="text-blood-light text-2xl font-bold tracking-tight group-hover:text-blood-glow transition-colors">
              Crime<span className="text-chalk">Web</span>
            </span>
          </Link>

          {/* Tagline */}
          <span className="hidden sm:block text-sm text-chalk-dim font-mono uppercase tracking-wider">
            Evidence Archive
          </span>
        </div>
      </div>
    </header>
  )
}
