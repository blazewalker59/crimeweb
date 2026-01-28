/**
 * Supabase Browser Client
 * Used for client-side operations in React components
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseKey)

  return client
}

// Export a singleton for easy access
export const supabase = createClient()
