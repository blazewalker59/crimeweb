/**
 * Show Grid Component
 */
import { ShowCard } from './ShowCard'
import type { Show } from '@/lib/supabase/types'

interface ShowGridProps {
  shows: Show[]
}

export function ShowGrid({ shows }: ShowGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {shows.map((show) => (
        <ShowCard key={show.id} show={show} />
      ))}
    </div>
  )
}
