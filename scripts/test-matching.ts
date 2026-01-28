#!/usr/bin/env bun
/**
 * Test fuzzy matching logic
 */
import { findRelatedEpisodes, extractKeyTerms } from '../src/lib/matching/fuzzy'
import episodeDatabase from '../data/episodes.json'

const episodes = episodeDatabase.episodes

console.log(`Loaded ${episodes.length} episodes\n`)

// Test with a few episodes
const testEpisodes = episodes.slice(0, 5)

for (const ep of testEpisodes) {
  console.log(`\n=== ${ep.showName}: "${ep.name}" ===`)
  console.log(`Overview: ${ep.overview?.slice(0, 150)}...`)
  
  const terms = extractKeyTerms(`${ep.name} ${ep.overview || ''}`)
  console.log(`Names: ${terms.names.join(', ') || '(none)'}`)
  console.log(`Locations: ${terms.locations.join(', ') || '(none)'}`)
  console.log(`Years: ${terms.years.join(', ') || '(none)'}`)
  
  const related = findRelatedEpisodes(ep, episodes, {
    maxResults: 3,
    minScore: 0.3,
    excludeSameShow: false,
  })
  
  if (related.length > 0) {
    console.log(`\nRelated episodes (${related.length}):`)
    for (const r of related) {
      console.log(`  - ${r.showName}: "${r.name}" (${Math.round(r.score * 100)}% - ${r.matchReason})`)
    }
  } else {
    console.log('\nNo related episodes found')
  }
}

// Also test cross-show matching
console.log('\n\n=== Cross-show analysis ===')
const datelineEps = episodes.filter(e => e.showTmdbId === 78)
const twentyTwentyEps = episodes.filter(e => e.showTmdbId === 2035)

console.log(`Dateline episodes: ${datelineEps.length}`)
console.log(`20/20 episodes: ${twentyTwentyEps.length}`)

// Find any cross-show matches
let crossMatches = 0
for (const ep of datelineEps.slice(0, 20)) {
  const related = findRelatedEpisodes(ep, twentyTwentyEps, {
    maxResults: 1,
    minScore: 0.3,
  })
  if (related.length > 0) {
    crossMatches++
    console.log(`\nDateline "${ep.name}"`)
    console.log(`  -> 20/20 "${related[0].name}" (${Math.round(related[0].score * 100)}% - ${related[0].matchReason})`)
  }
}
console.log(`\nCross-show matches found: ${crossMatches}`)
