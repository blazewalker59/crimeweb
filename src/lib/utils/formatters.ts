/**
 * Utility functions for formatting
 */

/**
 * Format a date string for display
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Unknown'

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a date string as relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(
  dateString: string | null | undefined,
): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Unknown'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

/**
 * Format episode number (e.g., "S01E05")
 */
export function formatEpisodeNumber(
  seasonNumber: number,
  episodeNumber: number,
): string {
  const season = String(seasonNumber).padStart(2, '0')
  const episode = String(episodeNumber).padStart(2, '0')
  return `S${season}E${episode}`
}

/**
 * Format runtime in minutes to human readable
 */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return 'Unknown'

  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(
  text: string | null | undefined,
  maxLength: number,
): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Generate slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format rating as stars or percentage
 */
export function formatRating(
  rating: number | null | undefined,
  outOf = 10,
): string {
  if (rating === null || rating === undefined) return 'N/A'
  return `${rating.toFixed(1)}/${outOf}`
}

/**
 * Pluralize a word based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  const word = count === 1 ? singular : plural || `${singular}s`
  return `${count} ${word}`
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
