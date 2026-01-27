import { describe, it, expect } from 'vitest'
import {
  areTitlesSimilar,
  calculateSimilarity,
  groupSimilarEpisodes,
  findMatchingCases,
  findBestMatchingCase,
} from '@/lib/matching/fuzzy'
import type { Case, Episode } from '@/lib/supabase/types'

// Mock data factories
function createMockCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 1,
    name: 'Test Case',
    description: null,
    victim_names: [],
    perpetrator_names: [],
    location: null,
    date_occurred: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 1,
    show_id: 1,
    tmdb_episode_id: 12345,
    name: 'Test Episode',
    overview: null,
    season_number: 1,
    episode_number: 1,
    air_date: '2024-01-15',
    still_path: null,
    runtime: 60,
    vote_average: null,
    vote_count: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('areTitlesSimilar', () => {
  it('should return true for identical titles', () => {
    expect(areTitlesSimilar('The Murder Case', 'The Murder Case')).toBe(true)
  })

  it('should return true for titles differing only in case', () => {
    expect(areTitlesSimilar('The Murder Case', 'the murder case')).toBe(true)
  })

  it('should return true for very similar titles', () => {
    expect(areTitlesSimilar('The Smith Murder', 'The Smith Murder Case')).toBe(
      true,
    )
  })

  it('should return false for completely different titles', () => {
    expect(areTitlesSimilar('The Smith Case', 'Unrelated Story')).toBe(false)
  })

  it('should respect custom threshold', () => {
    // With lower threshold, more titles match
    expect(areTitlesSimilar('Murder in the City', 'Murder in Town', 0.5)).toBe(
      true,
    )
    // With higher threshold, fewer titles match
    expect(areTitlesSimilar('Murder in the City', 'Murder in Town', 0.9)).toBe(
      false,
    )
  })
})

describe('calculateSimilarity', () => {
  it('should return 1 for identical strings', () => {
    expect(calculateSimilarity('hello', 'hello')).toBe(1)
  })

  it('should return 0 for completely different strings', () => {
    expect(calculateSimilarity('abc', 'xyz')).toBe(0)
  })

  it('should be case insensitive', () => {
    expect(calculateSimilarity('Hello', 'hello')).toBe(1)
  })

  it('should return value between 0 and 1 for partial matches', () => {
    const score = calculateSimilarity('hello world', 'hello')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
})

describe('findMatchingCases', () => {
  const mockCases: Case[] = [
    createMockCase({ id: 1, name: 'The Smith Murder Case' }),
    createMockCase({
      id: 2,
      name: 'The Johnson Case',
      victim_names: ['Mary Johnson'],
    }),
    createMockCase({
      id: 3,
      name: 'The Williams Trial',
      perpetrator_names: ['John Williams'],
    }),
  ]

  it('should find cases matching by name', () => {
    const results = findMatchingCases('Smith Murder', mockCases)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item.id).toBe(1)
    expect(results[0].matchedOn).toBe('name')
  })

  it('should find cases matching by victim name', () => {
    const results = findMatchingCases('Mary Johnson', mockCases)
    expect(results.some((r) => r.item.id === 2)).toBe(true)
  })

  it('should find cases matching by perpetrator name', () => {
    const results = findMatchingCases('John Williams', mockCases)
    expect(results.some((r) => r.item.id === 3)).toBe(true)
  })

  it('should return empty array for no matches', () => {
    const results = findMatchingCases('Completely Unrelated', mockCases)
    expect(results.length).toBe(0)
  })

  it('should sort results by score descending', () => {
    const results = findMatchingCases('Smith', mockCases, 0.3)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it('should respect custom threshold', () => {
    const strictResults = findMatchingCases('Smith Murder Case', mockCases, 0.9)
    const lenientResults = findMatchingCases(
      'Smith Murder Case',
      mockCases,
      0.3,
    )
    expect(lenientResults.length).toBeGreaterThanOrEqual(strictResults.length)
  })
})

describe('findBestMatchingCase', () => {
  const mockCases: Case[] = [
    createMockCase({ id: 1, name: 'The Smith Murder Case' }),
    createMockCase({ id: 2, name: 'The Johnson Case' }),
    createMockCase({ id: 3, name: 'Smith Family Tragedy' }),
  ]

  it('should return the best matching case', () => {
    const result = findBestMatchingCase('Smith Murder', mockCases)
    expect(result).not.toBeNull()
    expect(result?.case.id).toBe(1)
  })

  it('should return null for empty cases array', () => {
    const result = findBestMatchingCase('Smith', [])
    expect(result).toBeNull()
  })

  it('should return null for no good matches', () => {
    const result = findBestMatchingCase('XYZABC123', mockCases)
    expect(result).toBeNull()
  })

  it('should include match score', () => {
    const result = findBestMatchingCase('The Smith Murder Case', mockCases)
    expect(result?.score).toBeGreaterThan(0.5)
  })
})

describe('groupSimilarEpisodes', () => {
  it('should group episodes with similar titles', () => {
    const episodes: Episode[] = [
      createMockEpisode({
        id: 1,
        name: 'The Smith Murder',
        show_id: 1,
      }),
      createMockEpisode({
        id: 2,
        name: 'The Smith Murder Case',
        show_id: 2,
      }),
      createMockEpisode({
        id: 3,
        name: 'Unrelated Story',
        show_id: 3,
      }),
    ]

    const groups = groupSimilarEpisodes(episodes)
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.some((g) => g.length === 2)).toBe(true)
  })

  it('should return empty array when no similar episodes exist', () => {
    const episodes: Episode[] = [
      createMockEpisode({ id: 1, name: 'Alpha' }),
      createMockEpisode({ id: 2, name: 'Beta' }),
      createMockEpisode({ id: 3, name: 'Gamma' }),
    ]

    const groups = groupSimilarEpisodes(episodes)
    // Short unique words shouldn't match with default threshold
    expect(groups.length).toBe(0)
  })

  it('should not include standalone episodes in groups', () => {
    const episodes: Episode[] = [
      createMockEpisode({ id: 1, name: 'The Smith Murder' }),
      createMockEpisode({ id: 2, name: 'The Smith Murder Part 2' }),
      createMockEpisode({ id: 3, name: 'Completely Different' }),
    ]

    const groups = groupSimilarEpisodes(episodes)
    const allGroupedIds = groups.flat().map((e) => e.id)
    expect(allGroupedIds).not.toContain(3)
  })
})
