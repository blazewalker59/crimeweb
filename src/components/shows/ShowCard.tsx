/**
 * Show Card Component
 */
import { Link } from '@tanstack/react-router'
import { TMDbClient } from '@/lib/tmdb'
import { Badge } from '@/components/common'
import type { Show } from '@/lib/supabase/types'

interface ShowCardProps {
  show: Show
}

export function ShowCard({ show }: ShowCardProps) {
  const posterUrl = TMDbClient.getPosterUrl(show.poster_path, 'w342')

  return (
    <Link
      to="/shows/$showId"
      params={{ showId: String(show.id) }}
      className="group bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-red-500 transition-colors"
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-slate-700 relative overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={show.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            No Image
          </div>
        )}

        {/* Network badge */}
        {show.network && (
          <div className="absolute top-2 left-2">
            <Badge variant="default">{show.network}</Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors line-clamp-1">
          {show.name}
        </h3>

        {show.number_of_episodes > 0 && (
          <p className="text-sm text-slate-400 mt-1">
            {show.number_of_episodes} episodes
          </p>
        )}

        {show.status && (
          <Badge
            variant={show.status === 'Returning Series' ? 'success' : 'default'}
            size="sm"
          >
            {show.status}
          </Badge>
        )}
      </div>
    </Link>
  )
}
