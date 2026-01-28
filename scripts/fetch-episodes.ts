#!/usr/bin/env bun
/**
 * Fetch historical episodes from TMDb and save to JSON
 * Run with: bun scripts/fetch-episodes.ts
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = process.env.TMDB_API_KEY

if (!API_KEY) {
  console.error('Error: TMDB_API_KEY environment variable is required')
  process.exit(1)
}

// Shows to fetch - same as in server.ts
const CRIME_SHOWS = [
  { name: 'Dateline NBC', tmdbId: 78 },
  { name: '20/20', tmdbId: 2035 },
  { name: '48 Hours', tmdbId: 3719 },
  { name: 'Forensic Files', tmdbId: 11105 },
  { name: 'Snapped', tmdbId: 10184 },
  { name: 'The First 48', tmdbId: 5146 },
  { name: 'Cold Case Files', tmdbId: 12258 },
  { name: 'American Greed', tmdbId: 21572 },
]

// How many years of data to fetch
const YEARS_OF_DATA = 2

interface Episode {
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

interface EpisodeDatabase {
  lastUpdated: string
  shows: {
    tmdbId: number
    name: string
    network: string | null
  }[]
  episodes: Episode[]
}

async function fetchWithRateLimit(url: string): Promise<Response> {
  // Simple rate limiting - TMDb allows ~40 requests per 10 seconds
  await new Promise((resolve) => setTimeout(resolve, 250))
  return fetch(url)
}

async function fetchShowDetails(showId: number) {
  const url = `${TMDB_BASE_URL}/tv/${showId}?api_key=${API_KEY}`
  const response = await fetchWithRateLimit(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch show ${showId}: ${response.statusText}`)
  }
  return response.json()
}

async function fetchSeasonDetails(showId: number, seasonNumber: number) {
  const url = `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${API_KEY}`
  const response = await fetchWithRateLimit(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch season ${seasonNumber} for show ${showId}: ${response.statusText}`)
  }
  return response.json()
}

async function main() {
  console.log('Fetching historical episodes from TMDb...\n')
  
  const cutoffDate = new Date()
  cutoffDate.setFullYear(cutoffDate.getFullYear() - YEARS_OF_DATA)
  console.log(`Fetching episodes from ${cutoffDate.toISOString().split('T')[0]} onwards\n`)

  const database: EpisodeDatabase = {
    lastUpdated: new Date().toISOString(),
    shows: [],
    episodes: [],
  }

  for (const show of CRIME_SHOWS) {
    console.log(`\nProcessing ${show.name} (ID: ${show.tmdbId})...`)
    
    try {
      const showDetails = await fetchShowDetails(show.tmdbId)
      
      database.shows.push({
        tmdbId: show.tmdbId,
        name: showDetails.name,
        network: showDetails.networks?.[0]?.name ?? null,
      })

      // Get all seasons sorted by season number descending
      const seasons = showDetails.seasons
        ?.filter((s: { season_number: number }) => s.season_number > 0)
        .sort((a: { season_number: number }, b: { season_number: number }) => 
          b.season_number - a.season_number
        ) ?? []

      let episodeCount = 0
      let reachedCutoff = false

      for (const season of seasons) {
        if (reachedCutoff) break

        console.log(`  Fetching season ${season.season_number}...`)
        
        try {
          const seasonDetails = await fetchSeasonDetails(show.tmdbId, season.season_number)
          
          for (const ep of seasonDetails.episodes) {
            // Check if episode is within our date range
            if (ep.air_date) {
              const airDate = new Date(ep.air_date)
              if (airDate < cutoffDate) {
                reachedCutoff = true
                break
              }
            }

            database.episodes.push({
              id: ep.id,
              showTmdbId: show.tmdbId,
              showName: showDetails.name,
              name: ep.name,
              overview: ep.overview || null,
              airDate: ep.air_date || null,
              seasonNumber: ep.season_number,
              episodeNumber: ep.episode_number,
              stillPath: ep.still_path || null,
            })
            episodeCount++
          }
        } catch (error) {
          console.error(`  Error fetching season ${season.season_number}:`, error)
        }
      }

      console.log(`  Found ${episodeCount} episodes within date range`)
    } catch (error) {
      console.error(`Error processing ${show.name}:`, error)
    }
  }

  // Sort episodes by air date descending
  database.episodes.sort((a, b) => {
    if (!a.airDate) return 1
    if (!b.airDate) return -1
    return new Date(b.airDate).getTime() - new Date(a.airDate).getTime()
  })

  // Write to file
  const outputPath = './data/episodes.json'
  await Bun.write(outputPath, JSON.stringify(database, null, 2))
  
  console.log(`\n✓ Saved ${database.episodes.length} episodes to ${outputPath}`)
  console.log(`  Shows: ${database.shows.map(s => s.name).join(', ')}`)
}

main().catch(console.error)
