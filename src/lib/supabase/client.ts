/**
 * Browser-side Supabase client.
 *
 * Use this in `'use client'` components (admin UI, login form, etc.).
 * Reads NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, which is safe to expose
 * to the browser — Supabase enforces access through RLS + the user's
 * session JWT, not by hiding the key.
 *
 * The session is held in browser localStorage by default. For
 * RSC / API routes, use `server.ts` or `admin.ts` instead.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, type Database } from './config';

let cached: SupabaseClient<Database> | null = null;

export function getBrowserSupabase(): SupabaseClient<Database> {
  if (cached) return cached;
  const { url, publishableKey } = getSupabaseConfig();
  cached = createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}
