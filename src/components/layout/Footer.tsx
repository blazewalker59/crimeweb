/**
 * Footer Component
 */

export function Footer() {
  return (
    <footer className="bg-slate-800 border-t border-slate-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div>
            <span className="text-red-500 text-xl font-bold">CrimeWeb</span>
            <p className="mt-2 text-slate-400 text-sm">
              Latest episodes from your favorite true crime shows.
            </p>
          </div>

          {/* Data Attribution */}
          <div>
            <h3 className="text-white font-semibold mb-3">Data Sources</h3>
            <p className="text-slate-400 text-sm">
              Episode data provided by{' '}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300"
              >
                TMDb
              </a>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} CrimeWeb</p>
        </div>
      </div>
    </footer>
  )
}
