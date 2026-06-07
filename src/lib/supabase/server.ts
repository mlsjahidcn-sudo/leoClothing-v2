/**
 * Server-side Supabase client (per-request).
 *
 * Use this from API routes and server components when you need to
 * operate on behalf of a specific user. Pass the user's JWT (from the
 * `Authorization: Bearer <token>` header) to scope the client — RLS
 * policies then gate access based on `auth.uid()`.
 *
 * If no token is passed, the client runs as the anonymous (publishable
 * key) role — only public reads/writes per RLS.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, type Database } from './config';

export function getServerSupabase(accessToken?: string): SupabaseClient<Database> {
  const { url, publishableKey } = getSupabaseConfig();
  if (!accessToken) {
    return createClient<Database>(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return createClient<Database>(url, publishableKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Extract the bearer token from a `Request` or `NextRequest`. */
export function getBearerToken(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (!auth) return null;
  const [scheme, token] = auth.split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
