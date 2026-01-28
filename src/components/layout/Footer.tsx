/**
 * Footer Component
 * Crime scene themed footer
 */

export function Footer() {
  return (
    <footer className="bg-crime-dark border-t border-crime-elevated mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div>
            <span className="text-blood-light text-xl font-bold tracking-tight">
              Crime<span className="text-chalk">Web</span>
            </span>
            <p className="mt-2 text-chalk-dim text-sm">
              Latest episodes from your favorite true crime shows.
            </p>
          </div>

          {/* Data Attribution */}
          <div>
            <h3 className="text-chalk font-semibold mb-3 text-sm uppercase tracking-wider">
              Data Sources
            </h3>
            <p className="text-chalk-dim text-sm">
              Episode data provided by{' '}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blood-light hover:text-blood-glow transition-colors"
              >
                TMDb
              </a>
            </p>
            <p className="text-chalk-dim/50 text-xs mt-2">
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-crime-elevated text-center text-chalk-dim text-sm">
          <p>&copy; {new Date().getFullYear()} CrimeWeb</p>
        </div>
      </div>
    </footer>
  )
}
