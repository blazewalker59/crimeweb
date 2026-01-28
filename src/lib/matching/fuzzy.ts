/**
 * Fuzzy matching logic for finding related episodes
 * 
 * Focus on extracting and matching:
 * 1. Person names (victims, perpetrators)
 * 2. Locations (cities, states, counties)
 * 3. Years/dates of crimes
 * 4. Case-specific identifiers
 */

export interface MatchResult {
  episodeId: number
  showTmdbId: number
  showName: string
  name: string
  overview: string | null
  airDate: string | null
  seasonNumber: number
  episodeNumber: number
  stillPath: string | null
  score: number
  matchReason: string
}

export interface Episode {
  id: number
  showTmdbId: number
  showName: string
  name: string
  overview: string | null
  airDate: string | null
  seasonNumber: number
  episodeNumber: number
  stillPath: string | null
}

// Common words to filter out when extracting names
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'he', 'she', 'they',
  'them', 'his', 'her', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'then', 'once', 'after', 'before', 'being', 'into', 'through', 'during', 'until',
  'while', 'about', 'against', 'between', 'under', 'over', 'again', 'further',
  'part', 'story', 'mystery', 'murder', 'death', 'killer', 'killing', 'crime',
  'investigation', 'police', 'detective', 'victim', 'suspect', 'accused', 'trial',
  'episode', 'special', 'update', 'new', 'exclusive', 'inside', 'behind', 'true',
  'real', 'deadly', 'dark', 'secret', 'secrets', 'hidden', 'revealed', 'untold',
  'case', 'family', 'found', 'young', 'woman', 'man', 'mother', 'father', 'husband',
  'wife', 'daughter', 'son', 'friend', 'home', 'night', 'day', 'year', 'years',
  'time', 'life', 'body', 'scene', 'evidence', 'first', 'last', 'one', 'two',
  // Common title words that aren't names
  'trouble', 'hunt', 'perfect', 'morning', 'spring', 'summer', 'fall', 'winter',
  'cold', 'hot', 'final', 'last', 'fatal', 'deadly', 'dangerous', 'missing',
  'lost', 'gone', 'taken', 'vanished', 'disappeared', 'justice', 'verdict',
  'trial', 'truth', 'lies', 'betrayal', 'love', 'hate', 'evil', 'innocent',
  'guilty', 'accused', 'devil', 'angel', 'saint', 'sinner', 'stranger'
])

// US States and common location words
const US_STATES = new Set([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
  'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
  'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
  'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'hampshire',
  'jersey', 'mexico', 'york', 'carolina', 'dakota', 'ohio', 'oklahoma', 'oregon',
  'pennsylvania', 'island', 'tennessee', 'texas', 'utah', 'vermont', 'virginia',
  'washington', 'wisconsin', 'wyoming'
])

/**
 * Extract person names from text
 * Looks for patterns like "FirstName LastName" in the description
 */
function extractNames(text: string): string[] {
  if (!text) return []
  
  const namesSet = new Set<string>()
  
  // Pattern 1: Full names - two capitalized words (FirstName LastName)
  // This catches: "Sarah Hartsfield", "Karina Cooper", "Ryan Cooper", etc.
  const fullNamePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g
  let match
  
  while ((match = fullNamePattern.exec(text)) !== null) {
    const firstName = match[1].toLowerCase()
    const lastName = match[2].toLowerCase()
    
    // Skip if first and last name are the same (artifact of title+overview concatenation)
    if (firstName === lastName) continue
    
    // Skip if either part is a stop word or state name
    if (STOP_WORDS.has(firstName) || STOP_WORDS.has(lastName)) continue
    if (US_STATES.has(firstName) || US_STATES.has(lastName)) continue
    
    // Skip common non-name pairs (geographic, etc.)
    const skipPairs = ['blue mountains', 'fort bragg', 'tarpon springs', 'north carolina', 
      'south carolina', 'north dakota', 'south dakota', 'new york', 'new jersey', 
      'new mexico', 'new hampshire', 'west virginia', 'rhode island']
    const fullName = `${firstName} ${lastName}`
    if (skipPairs.includes(fullName)) continue
    
    namesSet.add(fullName)
  }
  
  // Pattern 2: Names with possessive - "Name's" often indicates a key person
  // e.g., "Sarah Hartsfield's husband" - but only add if we don't already have the full name
  const possessivePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\b/g
  while ((match = possessivePattern.exec(text)) !== null) {
    const name = match[1].toLowerCase()
    const words = name.split(/\s+/)
    // Check it's not a stop word
    if (words.some(w => STOP_WORDS.has(w) || US_STATES.has(w))) continue
    
    // Only add if it's a full name (first + last) that we don't already have
    if (words.length >= 2 && !namesSet.has(name)) {
      namesSet.add(name)
    }
  }
  
  // Pattern 3: Names after key phrases
  // e.g., "victim John Smith", "24-year-old Holly Wimunc"
  const contextPattern = /(?:victim|accused|suspect|defendant|nurse|doctor|Dr\.|specialist)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\b/gi
  while ((match = contextPattern.exec(text)) !== null) {
    const name = match[1].toLowerCase()
    const words = name.split(/\s+/)
    if (words.some(w => STOP_WORDS.has(w) || US_STATES.has(w))) continue
    namesSet.add(name)
  }
  
  return [...namesSet]
}

/**
 * Extract locations (cities, states, counties) from text
 * Only extracts actual geographic places - cities, towns, states, counties
 * NOT generic locations like "her home", "the hospital", etc.
 */
function extractLocations(text: string): string[] {
  if (!text) return []
  
  const locations: string[] = []
  
  // Full US state names for validation
  const fullStateNames = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
    'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
    'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
    'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
    'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
    'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'tennessee', 'texas',
    'utah', 'vermont', 'virginia', 'washington', 'wisconsin', 'wyoming',
    'new hampshire', 'new jersey', 'new mexico', 'new york',
    'north carolina', 'north dakota', 'south carolina', 'south dakota',
    'west virginia', 'rhode island'
  ]
  const stateSet = new Set(fullStateNames)
  
  // State abbreviations
  const stateAbbreviations = new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
    'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
    'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
    'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
    'WI', 'WY', 'DC'
  ])
  
  let match
  
  // Pattern 1: "City, State" or "City, ST" format - MOST RELIABLE
  // e.g., "Traer, Iowa" or "Austin, TX" or "Fort Bragg, North Carolina"
  const cityStatePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|[A-Z]{2})\b/g
  while ((match = cityStatePattern.exec(text)) !== null) {
    const city = match[1]
    const state = match[2]
    
    // Validate state is a real US state
    const stateLower = state.toLowerCase()
    const isValidState = stateSet.has(stateLower) || stateAbbreviations.has(state)
    
    if (isValidState) {
      // This is a real city, state pair
      locations.push(city.toLowerCase())
      locations.push(stateLower)
    }
  }
  
  // Pattern 2: "[Place] County" - Counties are geographic
  const countyPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+County\b/g
  while ((match = countyPattern.exec(text)) !== null) {
    const county = match[1].toLowerCase()
    if (!STOP_WORDS.has(county) && county.length > 2) {
      locations.push(county + ' county')
    }
  }
  
  // Pattern 3: "Fort [Name]" - Military bases are geographic landmarks
  const fortPattern = /\bFort\s+([A-Z][a-z]+)\b/g
  while ((match = fortPattern.exec(text)) !== null) {
    locations.push(`fort ${match[1].toLowerCase()}`)
  }
  
  // Pattern 4: State names mentioned standalone (case-insensitive)
  const statePattern = new RegExp(`\\b(${fullStateNames.join('|')})\\b`, 'gi')
  while ((match = statePattern.exec(text)) !== null) {
    locations.push(match[1].toLowerCase())
  }
  
  return [...new Set(locations)]
}

/**
 * Extract years from text (focus on crime-relevant years)
 */
function extractYears(text: string): string[] {
  if (!text) return []
  
  const years: string[] = []
  
  // Match years from 1970-2029 (relevant for true crime)
  const yearPattern = /\b(19[7-9]\d|20[0-2]\d)\b/g
  let match
  while ((match = yearPattern.exec(text)) !== null) {
    years.push(match[1])
  }
  
  return [...new Set(years)]
}

/**
 * Extract all key identifiers from episode text
 */
export function extractKeyTerms(text: string): {
  names: string[]
  locations: string[]
  years: string[]
} {
  return {
    names: extractNames(text),
    locations: extractLocations(text),
    years: extractYears(text),
  }
}

/**
 * Calculate match score between two episodes
 * Prioritizes: names > locations > years
 */
export function calculateMatchScore(
  source: Episode,
  target: Episode
): { score: number; reason: string } {
  // Don't match episode with itself
  if (source.id === target.id) {
    return { score: 0, reason: '' }
  }
  
  const sourceText = `${source.name} ${source.overview || ''}`
  const targetText = `${target.name} ${target.overview || ''}`
  
  const sourceTerms = extractKeyTerms(sourceText)
  const targetTerms = extractKeyTerms(targetText)
  
  let score = 0
  const reasons: string[] = []
  
  // 1. Name matches (highest weight - same name = likely same case)
  const nameMatches: string[] = []
  for (const sName of sourceTerms.names) {
    for (const tName of targetTerms.names) {
      // Exact match
      if (sName === tName) {
        nameMatches.push(sName)
      } 
      // Partial match (last name or first name match)
      else {
        const sParts = sName.split(' ')
        const tParts = tName.split(' ')
        // Check if last names match (most important)
        if (sParts.length >= 2 && tParts.length >= 2) {
          if (sParts[sParts.length - 1] === tParts[tParts.length - 1]) {
            // Last name match - could be same person
            nameMatches.push(`${sParts[sParts.length - 1]} (last name)`)
          }
        }
      }
    }
  }
  
  if (nameMatches.length > 0) {
    // Strong signal - same names mentioned
    score += 0.5 + (Math.min(nameMatches.length, 3) * 0.15)
    const uniqueNames = [...new Set(nameMatches)].slice(0, 2)
    reasons.push(uniqueNames.map(n => n.split(' ').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ')).join(', '))
  }
  
  // 2. Location matches (medium weight)
  const locationMatches = sourceTerms.locations.filter(loc => 
    targetTerms.locations.includes(loc)
  )
  
  if (locationMatches.length > 0 && nameMatches.length > 0) {
    // Location match combined with name match is very strong
    score += 0.2
    reasons.push(locationMatches[0].charAt(0).toUpperCase() + locationMatches[0].slice(1))
  } else if (locationMatches.length > 0) {
    // Location alone is weaker signal
    score += 0.1
  }
  
  // 3. Year matches (lower weight, but useful confirmation)
  const yearMatches = sourceTerms.years.filter(year => 
    targetTerms.years.includes(year)
  )
  
  if (yearMatches.length > 0 && (nameMatches.length > 0 || locationMatches.length > 0)) {
    score += 0.1
    if (yearMatches.length > 0 && !reasons.some(r => /\d{4}/.test(r))) {
      reasons.push(yearMatches[0])
    }
  }
  
  // Build reason string
  let reason = ''
  if (reasons.length > 0) {
    reason = reasons.join(' - ')
  }
  
  // Minimum threshold - require at least a name match for a valid result
  if (nameMatches.length === 0) {
    score = 0
    reason = ''
  }
  
  return { score: Math.min(1, score), reason }
}

/**
 * Find related episodes for a given episode
 */
export function findRelatedEpisodes(
  episode: Episode,
  allEpisodes: Episode[],
  options: {
    maxResults?: number
    minScore?: number
    excludeSameShow?: boolean
  } = {}
): MatchResult[] {
  const {
    maxResults = 5,
    minScore = 0.3,
    excludeSameShow = false,
  } = options
  
  const results: MatchResult[] = []
  
  for (const candidate of allEpisodes) {
    // Skip same episode
    if (candidate.id === episode.id) continue
    
    // Optionally skip same show
    if (excludeSameShow && candidate.showTmdbId === episode.showTmdbId) continue
    
    const { score, reason } = calculateMatchScore(episode, candidate)
    
    if (score >= minScore) {
      results.push({
        episodeId: candidate.id,
        showTmdbId: candidate.showTmdbId,
        showName: candidate.showName,
        name: candidate.name,
        overview: candidate.overview,
        airDate: candidate.airDate,
        seasonNumber: candidate.seasonNumber,
        episodeNumber: candidate.episodeNumber,
        stillPath: candidate.stillPath,
        score,
        matchReason: reason,
      })
    }
  }
  
  // Sort by score descending, then by date (newer first)
  results.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.05) {
      return b.score - a.score
    }
    // If scores are close, prefer more recent episodes
    const dateA = a.airDate ? new Date(a.airDate).getTime() : 0
    const dateB = b.airDate ? new Date(b.airDate).getTime() : 0
    return dateB - dateA
  })
  
  return results.slice(0, maxResults)
}
