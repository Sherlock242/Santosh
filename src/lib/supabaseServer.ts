
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This file is intended for server-side code.
// The `bypassRls` parameter should be used with caution.

export function createSupabaseServerClient(bypassRls = false) {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.SUPABASE_URL!,
    // Use service role for admin actions, but anon key for user-level access
    bypassRls ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.SUPABASE_ANON_KEY!, 
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      // Add this auth block when using the service role key to bypass RLS
      ...(bypassRls
        ? {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        : {}),
    }
  );
}
