/**
 * Case Card Component
 * Displays a case preview in a card format
 */
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/common'
import type { Case, CaseWithStats } from '@/lib/supabase/types'

interface CaseCardProps {
  caseData: Case | CaseWithStats
}

function isCaseWithStats(c: Case | CaseWithStats): c is CaseWithStats {
  return 'episode_count' in c
}

export function CaseCard({ caseData }: CaseCardProps) {
  const hasStats = isCaseWithStats(caseData)

  return (
    <Link
      to="/cases/$caseId"
      params={{ caseId: String(caseData.id) }}
      className="group bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-red-500 transition-colors p-4"
    >
      {/* Header with year badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors line-clamp-2">
          {caseData.name}
        </h3>
        {caseData.year && (
          <Badge variant="default" size="sm">
            {caseData.year}
          </Badge>
        )}
      </div>

      {/* Location */}
      {(caseData.location || caseData.state) && (
        <p className="text-sm text-slate-400 mt-1">
          {[caseData.location, caseData.state].filter(Boolean).join(', ')}
        </p>
      )}

      {/* Victims */}
      {caseData.victim_names && caseData.victim_names.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            Victims
          </p>
          <p className="text-sm text-slate-300 line-clamp-1">
            {caseData.victim_names.join(', ')}
          </p>
        </div>
      )}

      {/* Summary preview */}
      {caseData.summary && (
        <p className="text-sm text-slate-400 mt-2 line-clamp-2">
          {caseData.summary}
        </p>
      )}

      {/* Stats (only for CaseWithStats) */}
      {hasStats && (
        <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold text-red-400">
              {caseData.episode_count}
            </span>
            <span className="text-xs text-slate-500">
              {caseData.episode_count === 1 ? 'episode' : 'episodes'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold text-slate-300">
              {caseData.show_count}
            </span>
            <span className="text-xs text-slate-500">
              {caseData.show_count === 1 ? 'show' : 'shows'}
            </span>
          </div>
        </div>
      )}

      {/* Coverage date range */}
      {hasStats && caseData.first_coverage_date && (
        <p className="text-xs text-slate-500 mt-2">
          Covered: {new Date(caseData.first_coverage_date).getFullYear()}
          {caseData.latest_coverage_date &&
            caseData.first_coverage_date !== caseData.latest_coverage_date && (
              <> - {new Date(caseData.latest_coverage_date).getFullYear()}</>
            )}
        </p>
      )}
    </Link>
  )
}
