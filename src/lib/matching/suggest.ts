/**
 * Case suggestion logic
 * Combines pattern matching and fuzzy matching to suggest case links
 */
import { extractNames, suggestCaseName } from './patterns'
import { findMatchingCases, detectRerun, type MatchResult } from './fuzzy'
import type { Episode, Case } from '@/lib/supabase/types'

export interface CaseSuggestion {
  existingCase: Case | null
  suggestedName: string | null
  confidence: number
  extractedNames: string[]
  matchType: 'exact' | 'fuzzy' | 'new'
}

/**
 * Suggest case matches for an episode
 */
export function suggestCaseForEpisode(
  episode: { name: string; overview?: string | null },
  existingCases: Case[],
): CaseSuggestion {
  // Extract names from episode
  const extractedNames = extractNames(episode.name, episode.overview)

  // If no names found, can't suggest a case
  if (extractedNames.length === 0) {
    return {
      existingCase: null,
      suggestedName: null,
      confidence: 0,
      extractedNames: [],
      matchType: 'new',
    }
  }

  // Try to find matching existing cases
  const allMatches: MatchResult[] = []

  for (const name of extractedNames) {
    const matches = findMatchingCases(name, existingCases, 0.7)
    allMatches.push(...matches)
  }

  // Also try matching the full title
  const titleMatches = findMatchingCases(episode.name, existingCases, 0.6)
  allMatches.push(...titleMatches)

  // Sort by score and get best match
  const sortedMatches = allMatches
    .sort((a, b) => b.score - a.score)
    .filter(
      (match, index, arr) =>
        arr.findIndex((m) => m.item.id === match.item.id) === index,
    )

  if (sortedMatches.length > 0 && sortedMatches[0].score >= 0.8) {
    // High confidence match
    return {
      existingCase: sortedMatches[0].item,
      suggestedName: null,
      confidence: sortedMatches[0].score,
      extractedNames,
      matchType: 'exact',
    }
  }

  if (sortedMatches.length > 0 && sortedMatches[0].score >= 0.6) {
    // Medium confidence fuzzy match
    return {
      existingCase: sortedMatches[0].item,
      suggestedName: suggestCaseName(episode.name, episode.overview),
      confidence: sortedMatches[0].score,
      extractedNames,
      matchType: 'fuzzy',
    }
  }

  // No match found - suggest creating new case
  return {
    existingCase: null,
    suggestedName: suggestCaseName(episode.name, episode.overview),
    confidence: 0,
    extractedNames,
    matchType: 'new',
  }
}

/**
 * Check if an episode might be a rerun or update
 */
export function checkForRerun(
  episode: Episode,
  allShowEpisodes: Episode[],
): { isRerun: boolean; originalEpisode: Episode | null } {
  const original = detectRerun(episode, allShowEpisodes)

  return {
    isRerun: original !== null,
    originalEpisode: original,
  }
}

/**
 * Batch suggest cases for multiple episodes
 */
export function batchSuggestCases(
  episodes: Array<{ name: string; overview?: string | null }>,
  existingCases: Case[],
): Map<number, CaseSuggestion> {
  const suggestions = new Map<number, CaseSuggestion>()

  for (let i = 0; i < episodes.length; i++) {
    suggestions.set(i, suggestCaseForEpisode(episodes[i], existingCases))
  }

  return suggestions
}

/**
 * Get cross-coverage statistics for a case
 */
export function getCrossCoverageStats(
  caseId: number,
  episodeCases: Array<{ episode_id: number; case_id: number }>,
  episodes: Array<{ id: number; show_id: number; air_date: string | null }>,
) {
  // Get all episodes linked to this case
  const linkedEpisodeIds = episodeCases
    .filter((ec) => ec.case_id === caseId)
    .map((ec) => ec.episode_id)

  const linkedEpisodes = episodes.filter((e) => linkedEpisodeIds.includes(e.id))

  // Group by show
  const showCounts = new Map<number, number>()
  for (const episode of linkedEpisodes) {
    showCounts.set(episode.show_id, (showCounts.get(episode.show_id) || 0) + 1)
  }

  // Find first and last coverage dates
  const dates = linkedEpisodes
    .filter((e) => e.air_date)
    .map((e) => new Date(e.air_date!))
    .sort((a, b) => a.getTime() - b.getTime())

  return {
    totalEpisodes: linkedEpisodes.length,
    showCount: showCounts.size,
    showCounts: Object.fromEntries(showCounts),
    firstCoverage: dates[0] || null,
    lastCoverage: dates[dates.length - 1] || null,
    isCrossShow: showCounts.size > 1,
  }
}
