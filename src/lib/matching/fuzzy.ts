/**
 * Fuzzy string matching utilities
 */
import { compareTwoStrings, findBestMatch } from 'string-similarity'
import type { Case, Episode } from '@/lib/supabase/types'

export interface MatchResult {
  item: Case
  score: number
  matchedOn: 'name' | 'victim' | 'perpetrator'
}

/**
 * Find cases that match the given text
 */
export function findMatchingCases(
  searchText: string,
  cases: Case[],
  threshold = 0.6,
): MatchResult[] {
  const results: MatchResult[] = []
  const searchLower = searchText.toLowerCase()

  for (const caseItem of cases) {
    // Match against case name
    const nameScore = compareTwoStrings(
      searchLower,
      caseItem.name.toLowerCase(),
    )
    if (nameScore >= threshold) {
      results.push({ item: caseItem, score: nameScore, matchedOn: 'name' })
      continue
    }

    // Match against victim names
    for (const victim of caseItem.victim_names || []) {
      const victimScore = compareTwoStrings(searchLower, victim.toLowerCase())
      if (victimScore >= threshold) {
        results.push({
          item: caseItem,
          score: victimScore,
          matchedOn: 'victim',
        })
        break
      }
    }

    // Match against perpetrator names
    for (const perp of caseItem.perpetrator_names || []) {
      const perpScore = compareTwoStrings(searchLower, perp.toLowerCase())
      if (perpScore >= threshold) {
        results.push({
          item: caseItem,
          score: perpScore,
          matchedOn: 'perpetrator',
        })
        break
      }
    }
  }

  // Sort by score descending and remove duplicates
  return results
    .sort((a, b) => b.score - a.score)
    .filter(
      (result, index, arr) =>
        arr.findIndex((r) => r.item.id === result.item.id) === index,
    )
}

/**
 * Check if two episode titles are similar enough to be the same case
 */
export function areTitlesSimilar(
  title1: string,
  title2: string,
  threshold = 0.8,
): boolean {
  return (
    compareTwoStrings(title1.toLowerCase(), title2.toLowerCase()) >= threshold
  )
}

/**
 * Find the best matching case from a list
 */
export function findBestMatchingCase(
  searchText: string,
  cases: Case[],
): { case: Case; score: number } | null {
  if (cases.length === 0) return null

  const caseNames = cases.map((c) => c.name.toLowerCase())
  const result = findBestMatch(searchText.toLowerCase(), caseNames)

  if (result.bestMatch.rating < 0.5) return null

  return {
    case: cases[result.bestMatchIndex],
    score: result.bestMatch.rating,
  }
}

/**
 * Detect if an episode is likely a rerun/update of another episode
 */
export function detectRerun(
  episode: Episode,
  showEpisodes: Episode[],
  threshold = 0.85,
): Episode | null {
  // Only check older episodes from the same show
  const olderEpisodes = showEpisodes.filter(
    (e) =>
      e.id !== episode.id &&
      e.show_id === episode.show_id &&
      e.air_date &&
      episode.air_date &&
      new Date(e.air_date) < new Date(episode.air_date),
  )

  for (const older of olderEpisodes) {
    const similarity = compareTwoStrings(
      episode.name.toLowerCase(),
      older.name.toLowerCase(),
    )

    if (similarity >= threshold) {
      return older
    }
  }

  return null
}

/**
 * Group episodes by similar titles (potential same case)
 */
export function groupSimilarEpisodes(
  episodes: Episode[],
  threshold = 0.7,
): Episode[][] {
  const groups: Episode[][] = []
  const assigned = new Set<number>()

  for (const episode of episodes) {
    if (assigned.has(episode.id)) continue

    const group = [episode]
    assigned.add(episode.id)

    for (const other of episodes) {
      if (assigned.has(other.id)) continue

      const similarity = compareTwoStrings(
        episode.name.toLowerCase(),
        other.name.toLowerCase(),
      )

      if (similarity >= threshold) {
        group.push(other)
        assigned.add(other.id)
      }
    }

    if (group.length > 1) {
      groups.push(group)
    }
  }

  return groups
}

/**
 * Calculate similarity between two strings (normalized)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  return compareTwoStrings(str1.toLowerCase(), str2.toLowerCase())
}
