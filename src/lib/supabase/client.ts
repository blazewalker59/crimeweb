/**
 * Supabase Browser Client
 * Used for client-side operations in React components
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )

  return client
}

// Export a singleton for easy access
export const supabase = createClient()
