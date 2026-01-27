import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatRelativeTime,
  formatEpisodeNumber,
  formatRuntime,
  truncate,
  slugify,
  formatNumber,
  formatRating,
  pluralize,
  titleCase,
} from '@/lib/utils/formatters'

describe('formatDate', () => {
  it('should format a valid date string', () => {
    const result = formatDate('2024-03-15')
    // Date parsing can be timezone-dependent, so check for year and month
    expect(result).toMatch(/March 1[45], 2024/)
  })

  it('should return "Unknown" for null input', () => {
    expect(formatDate(null)).toBe('Unknown')
  })

  it('should return "Unknown" for undefined input', () => {
    expect(formatDate(undefined)).toBe('Unknown')
  })

  it('should return "Unknown" for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('Unknown')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Today" for today\'s date', () => {
    const result = formatRelativeTime('2024-03-15')
    expect(result).toBe('Today')
  })

  it('should return "Yesterday" for yesterday\'s date', () => {
    const result = formatRelativeTime('2024-03-14')
    expect(result).toBe('Yesterday')
  })

  it('should return "X days ago" for recent dates', () => {
    const result = formatRelativeTime('2024-03-10')
    expect(result).toBe('5 days ago')
  })

  it('should return "X weeks ago" for dates within a month', () => {
    const result = formatRelativeTime('2024-03-01')
    expect(result).toBe('2 weeks ago')
  })

  it('should return "X months ago" for dates within a year', () => {
    const result = formatRelativeTime('2024-01-15')
    expect(result).toBe('2 months ago')
  })

  it('should return "Unknown" for null input', () => {
    expect(formatRelativeTime(null)).toBe('Unknown')
  })

  it('should return "Unknown" for undefined input', () => {
    expect(formatRelativeTime(undefined)).toBe('Unknown')
  })
})

describe('formatEpisodeNumber', () => {
  it('should format single digit season and episode', () => {
    expect(formatEpisodeNumber(1, 5)).toBe('S01E05')
  })

  it('should format double digit season and episode', () => {
    expect(formatEpisodeNumber(12, 23)).toBe('S12E23')
  })

  it('should handle season 0 (specials)', () => {
    expect(formatEpisodeNumber(0, 1)).toBe('S00E01')
  })
})

describe('formatRuntime', () => {
  it('should format minutes under an hour', () => {
    expect(formatRuntime(45)).toBe('45m')
  })

  it('should format exactly one hour', () => {
    expect(formatRuntime(60)).toBe('1h')
  })

  it('should format hours and minutes', () => {
    expect(formatRuntime(90)).toBe('1h 30m')
  })

  it('should return "Unknown" for null input', () => {
    expect(formatRuntime(null)).toBe('Unknown')
  })

  it('should return "Unknown" for undefined input', () => {
    expect(formatRuntime(undefined)).toBe('Unknown')
  })

  it('should return "Unknown" for 0 minutes', () => {
    expect(formatRuntime(0)).toBe('Unknown')
  })
})

describe('truncate', () => {
  it('should not truncate text shorter than max length', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
  })

  it('should truncate text longer than max length with ellipsis', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...')
  })

  it('should return empty string for null input', () => {
    expect(truncate(null, 10)).toBe('')
  })

  it('should return empty string for undefined input', () => {
    expect(truncate(undefined, 10)).toBe('')
  })

  it('should handle exact max length', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })
})

describe('slugify', () => {
  it('should convert text to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('should handle multiple spaces', () => {
    expect(slugify('Hello   World')).toBe('hello-world')
  })

  it('should remove special characters', () => {
    expect(slugify("The Case of John Doe's Murder!")).toBe(
      'the-case-of-john-doe-s-murder',
    )
  })

  it('should trim leading and trailing hyphens', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world')
  })
})

describe('formatNumber', () => {
  it('should format numbers with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('should handle small numbers', () => {
    expect(formatNumber(123)).toBe('123')
  })

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatRating', () => {
  it('should format rating with one decimal place', () => {
    expect(formatRating(8.5)).toBe('8.5/10')
  })

  it('should allow custom max rating', () => {
    expect(formatRating(4.5, 5)).toBe('4.5/5')
  })

  it('should return "N/A" for null input', () => {
    expect(formatRating(null)).toBe('N/A')
  })

  it('should return "N/A" for undefined input', () => {
    expect(formatRating(undefined)).toBe('N/A')
  })
})

describe('pluralize', () => {
  it('should use singular form for count of 1', () => {
    expect(pluralize(1, 'episode')).toBe('1 episode')
  })

  it('should use plural form for count > 1', () => {
    expect(pluralize(5, 'episode')).toBe('5 episodes')
  })

  it('should use custom plural form', () => {
    expect(pluralize(2, 'person', 'people')).toBe('2 people')
  })

  it('should use plural form for count of 0', () => {
    expect(pluralize(0, 'episode')).toBe('0 episodes')
  })
})

describe('titleCase', () => {
  it('should capitalize first letter of each word', () => {
    expect(titleCase('hello world')).toBe('Hello World')
  })

  it('should handle mixed case input', () => {
    expect(titleCase('hELLO wORLD')).toBe('Hello World')
  })

  it('should handle single word', () => {
    expect(titleCase('hello')).toBe('Hello')
  })
})
