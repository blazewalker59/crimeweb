/**
 * Viewed episodes storage
 * 
 * Stores which episodes the user has marked as viewed in localStorage.
 * Persists across page refreshes.
 */

import { getConfirmedMatchIds } from '@/lib/matching'

export interface ViewedRecord {
  episodeId: number
  viewedAt: number
}

const STORAGE_KEY = 'crimeweb_viewed_episodes'

/**
 * Get all viewed episode records
 */
export function getAllViewed(): Map<number, ViewedRecord> {
  if (typeof window === 'undefined') {
    return new Map()
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Map()
    
    const parsed = JSON.parse(stored) as Record<string, ViewedRecord>
    return new Map(Object.entries(parsed).map(([k, v]) => [Number(k), v]))
  } catch {
    return new Map()
  }
}

/**
 * Get all viewed episode IDs as a Set
 */
export function getViewedIds(): Set<number> {
  const viewed = getAllViewed()
  return new Set(viewed.keys())
}

/**
 * Check if an episode is marked as viewed (directly or via confirmed relation)
 */
export function isViewed(episodeId: number): boolean {
  const viewed = getAllViewed()
  if (viewed.has(episodeId)) {
    return true
  }
  
  // Check if any confirmed related episode is viewed
  const confirmedIds = getConfirmedMatchIds(episodeId)
  for (const confirmedId of confirmedIds) {
    if (viewed.has(confirmedId)) {
      return true
    }
  }
  
  return false
}

/**
 * Mark an episode as viewed, along with any confirmed related episodes
 */
export function markAsViewed(episodeId: number): void {
  if (typeof window === 'undefined') return
  
  const viewed = getAllViewed()
  const now = Date.now()
  
  // Mark the episode itself
  viewed.set(episodeId, {
    episodeId,
    viewedAt: now,
  })
  
  // Also mark any confirmed related episodes
  const confirmedIds = getConfirmedMatchIds(episodeId)
  for (const confirmedId of confirmedIds) {
    if (!viewed.has(confirmedId)) {
      viewed.set(confirmedId, {
        episodeId: confirmedId,
        viewedAt: now,
      })
    }
  }
  
  const obj = Object.fromEntries(viewed)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

/**
 * Remove viewed status from an episode and any confirmed related episodes
 */
export function markAsUnviewed(episodeId: number): void {
  if (typeof window === 'undefined') return
  
  const viewed = getAllViewed()
  
  // Remove the episode itself
  viewed.delete(episodeId)
  
  // Also remove any confirmed related episodes
  const confirmedIds = getConfirmedMatchIds(episodeId)
  for (const confirmedId of confirmedIds) {
    viewed.delete(confirmedId)
  }
  
  const obj = Object.fromEntries(viewed)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

/**
 * Toggle viewed status for an episode
 * When marking as viewed, also marks confirmed related episodes
 * Returns the new viewed state
 */
export function toggleViewed(episodeId: number): boolean {
  // Check direct viewed status only for toggle (not transitive)
  const viewed = getAllViewed()
  if (viewed.has(episodeId)) {
    markAsUnviewed(episodeId)
    return false
  } else {
    markAsViewed(episodeId)
    return true
  }
}
