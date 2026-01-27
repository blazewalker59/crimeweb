/**
 * Pattern matching for extracting names from episode titles and descriptions
 */

// Common patterns found in crime show episode titles
const NAME_PATTERNS = [
  // "The [Name] Case" or "The [Name] Murder Case"
  /the\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?:murder\s+)?case/gi,

  // "Who Killed [Name]?" or "Who Murdered [Name]?"
  /who\s+(?:killed|murdered)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\??/gi,

  // "[Name] Murder" or "Murder of [Name]"
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+murder/gi,
  /murder\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,

  // "Justice for [Name]"
  /justice\s+for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,

  // "The [Name] Mystery"
  /the\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+mystery/gi,

  // "Death of [Name]" or "[Name]'s Death"
  /death\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\s+death/gi,

  // "The Disappearance of [Name]"
  /disappearance\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,

  // "Searching for [Name]"
  /searching\s+for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi,

  // Names in quotes "John Doe" or 'John Doe'
  /"([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})"/g,
  /'([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})'/g,

  // "The [FirstName] [LastName] Story"
  /the\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+story/gi,
]

// Common words to filter out (not names)
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'case',
  'murder',
  'mystery',
  'death',
  'killer',
  'victim',
  'police',
  'investigation',
  'true',
  'crime',
  'story',
  'part',
  'episode',
  'season',
  'special',
])

// Common location words that might be mistaken for names
const LOCATION_WORDS = new Set([
  'street',
  'avenue',
  'road',
  'lane',
  'drive',
  'court',
  'place',
  'circle',
  'boulevard',
  'highway',
  'freeway',
  'county',
  'city',
  'town',
  'village',
  'park',
  'lake',
  'river',
  'mountain',
  'beach',
  'island',
  'forest',
])

/**
 * Extract potential names from text using patterns
 */
export function extractNames(
  title: string,
  overview?: string | null,
): string[] {
  const names = new Set<string>()
  const text = `${title} ${overview || ''}`

  for (const pattern of NAME_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0

    let match
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim()
      if (name && isValidName(name)) {
        names.add(normalizeName(name))
      }
    }
  }

  return Array.from(names)
}

/**
 * Check if a string looks like a valid name
 */
function isValidName(name: string): boolean {
  const lower = name.toLowerCase()

  // Filter out stop words
  if (STOP_WORDS.has(lower)) return false

  // Filter out location words
  const words = lower.split(/\s+/)
  if (words.some((w) => LOCATION_WORDS.has(w))) return false

  // Must start with a capital letter
  if (!/^[A-Z]/.test(name)) return false

  // Must be reasonable length (2-50 chars)
  if (name.length < 2 || name.length > 50) return false

  // Should not be all caps (likely an acronym)
  if (name === name.toUpperCase() && name.length > 3) return false

  return true
}

/**
 * Normalize a name for comparison
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Extract case-related keywords from text
 */
export function extractKeywords(text: string): string[] {
  const keywords = new Set<string>()
  const lower = text.toLowerCase()

  // Look for location patterns
  const locationPatterns = [
    /in\s+([A-Z][a-z]+(?:,?\s+[A-Z]{2})?)/g,
    /from\s+([A-Z][a-z]+(?:,?\s+[A-Z]{2})?)/g,
  ]

  for (const pattern of locationPatterns) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(text)) !== null) {
      const location = match[1]?.trim()
      if (location && location.length > 2) {
        keywords.add(location)
      }
    }
  }

  // Look for year patterns
  const yearMatch = text.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) {
    keywords.add(yearMatch[0])
  }

  return Array.from(keywords)
}

/**
 * Generate a case name suggestion from episode info
 */
export function suggestCaseName(
  title: string,
  overview?: string | null,
): string | null {
  const names = extractNames(title, overview)

  if (names.length === 0) return null

  // Use the first extracted name as the basis
  const primaryName = names[0]

  // Check if it looks like a victim name in the title
  if (
    title.toLowerCase().includes('murder') ||
    title.toLowerCase().includes('death') ||
    title.toLowerCase().includes('killed')
  ) {
    return `The ${primaryName} Case`
  }

  return `${primaryName} Case`
}
