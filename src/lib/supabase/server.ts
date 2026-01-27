/**
 * Supabase Server Client
 * Used for server-side operations in loaders, actions, and API routes
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Create a Supabase client for server-side use
 * Handles cookie management for SSR authentication
 */
export function createServerSupabaseClient(request: Request) {
  const cookies = new Map<string, string>()

  // Parse cookies from request
  const cookieHeader = request.headers.get('Cookie') ?? ''
  cookieHeader.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies.set(name, decodeURIComponent(value))
    }
  })

  // Track cookies to set in response
  const cookiesToSet: Array<{
    name: string
    value: string
    options: CookieOptions
  }> = []

  const supabase = createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies.get(name)
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesToSet.push({ name, value, options })
        },
        remove(name: string, options: CookieOptions) {
          cookiesToSet.push({
            name,
            value: '',
            options: { ...options, maxAge: 0 },
          })
        },
      },
    },
  )

  return { supabase, cookiesToSet }
}

/**
 * Create a Supabase admin client with service role key
 * Use this for admin operations that bypass RLS
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    },
  )
}

/**
 * Helper to create cookie header string from cookie options
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  let cookie = `${name}=${encodeURIComponent(value)}`

  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${options.maxAge}`
  }
  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`
  }
  if (options.path) {
    cookie += `; Path=${options.path}`
  }
  if (options.domain) {
    cookie += `; Domain=${options.domain}`
  }
  if (options.secure) {
    cookie += '; Secure'
  }
  if (options.httpOnly) {
    cookie += '; HttpOnly'
  }
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`
  }

  return cookie
}
