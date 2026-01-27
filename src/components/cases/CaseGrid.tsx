/**
 * Case Grid Component
 * Displays a grid of case cards
 */
import { CaseCard } from './CaseCard'
import type { Case, CaseWithStats } from '@/lib/supabase/types'

interface CaseGridProps {
  cases: Array<Case | CaseWithStats>
  emptyMessage?: string
}

export function CaseGrid({
  cases,
  emptyMessage = 'No cases found',
}: CaseGridProps) {
  if (cases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cases.map((caseData) => (
        <CaseCard key={caseData.id} caseData={caseData} />
      ))}
    </div>
  )
}
