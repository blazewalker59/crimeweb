/**
 * User match decisions storage
 * 
 * Stores user confirmations/denials of episode relationships in localStorage.
 * Decisions persist across page refreshes.
 */

export type MatchDecision = 'confirmed' | 'denied'

export interface MatchDecisionRecord {
  /** The source episode ID */
  sourceEpisodeId: number
  /** The matched episode ID */
  matchedEpisodeId: number
  /** User's decision */
  decision: MatchDecision
  /** When the decision was made */
  timestamp: number
}

const STORAGE_KEY = 'crimeweb_match_decisions'

/**
 * Generate a unique key for a match pair (order-independent)
 */
function getMatchKey(episodeId1: number, episodeId2: number): string {
  const sorted = [episodeId1, episodeId2].sort((a, b) => a - b)
  return `${sorted[0]}_${sorted[1]}`
}

/**
 * Get all stored match decisions
 */
export function getAllDecisions(): Map<string, MatchDecisionRecord> {
  if (typeof window === 'undefined') {
    return new Map()
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Map()
    
    const parsed = JSON.parse(stored) as Record<string, MatchDecisionRecord>
    return new Map(Object.entries(parsed))
  } catch {
    return new Map()
  }
}

/**
 * Get the decision for a specific match pair
 */
export function getDecision(
  sourceEpisodeId: number,
  matchedEpisodeId: number
): MatchDecision | null {
  const decisions = getAllDecisions()
  const key = getMatchKey(sourceEpisodeId, matchedEpisodeId)
  const record = decisions.get(key)
  return record?.decision ?? null
}

/**
 * Save a match decision
 */
export function saveDecision(
  sourceEpisodeId: number,
  matchedEpisodeId: number,
  decision: MatchDecision
): void {
  if (typeof window === 'undefined') return
  
  const decisions = getAllDecisions()
  const key = getMatchKey(sourceEpisodeId, matchedEpisodeId)
  
  const record: MatchDecisionRecord = {
    sourceEpisodeId,
    matchedEpisodeId,
    decision,
    timestamp: Date.now(),
  }
  
  decisions.set(key, record)
  
  const obj = Object.fromEntries(decisions)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

/**
 * Remove a match decision (reset to auto-detected state)
 */
export function removeDecision(
  sourceEpisodeId: number,
  matchedEpisodeId: number
): void {
  if (typeof window === 'undefined') return
  
  const decisions = getAllDecisions()
  const key = getMatchKey(sourceEpisodeId, matchedEpisodeId)
  
  decisions.delete(key)
  
  const obj = Object.fromEntries(decisions)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

/**
 * Get all denied match IDs for a source episode
 * Used to filter out denied matches from display
 */
export function getDeniedMatchIds(sourceEpisodeId: number): Set<number> {
  const decisions = getAllDecisions()
  const deniedIds = new Set<number>()
  
  for (const record of decisions.values()) {
    if (record.decision === 'denied') {
      if (record.sourceEpisodeId === sourceEpisodeId) {
        deniedIds.add(record.matchedEpisodeId)
      } else if (record.matchedEpisodeId === sourceEpisodeId) {
        deniedIds.add(record.sourceEpisodeId)
      }
    }
  }
  
  return deniedIds
}

/**
 * Get all confirmed match IDs for an episode
 * Used to mark related episodes as viewed
 */
export function getConfirmedMatchIds(episodeId: number): Set<number> {
  const decisions = getAllDecisions()
  const confirmedIds = new Set<number>()
  
  for (const record of decisions.values()) {
    if (record.decision === 'confirmed') {
      if (record.sourceEpisodeId === episodeId) {
        confirmedIds.add(record.matchedEpisodeId)
      } else if (record.matchedEpisodeId === episodeId) {
        confirmedIds.add(record.sourceEpisodeId)
      }
    }
  }
  
  return confirmedIds
}

/**
 * Check if a match is confirmed by the user
 */
export function isMatchConfirmed(
  sourceEpisodeId: number,
  matchedEpisodeId: number
): boolean {
  return getDecision(sourceEpisodeId, matchedEpisodeId) === 'confirmed'
}

/**
 * Check if a match is denied by the user
 */
export function isMatchDenied(
  sourceEpisodeId: number,
  matchedEpisodeId: number
): boolean {
  return getDecision(sourceEpisodeId, matchedEpisodeId) === 'denied'
}
