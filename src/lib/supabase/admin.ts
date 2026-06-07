/**
 * Service-role / admin Supabase client.
 *
 * Server-only. Uses the secret key (legacy "service_role") which BYPASSES
 * RLS. Treat its output as if it were raw database access.
 *
 * Reserved for:
 *   - one-time admin bootstrap (creating the first admin user)
 *   - server-side tasks that must bypass RLS (none in this app's hot
 *     path — admin write APIs go through the per-user `getServerSupabase`
 *     so RLS policies can audit and constrain them)
 *
 * Never import this from a `'use client'` module. The secret key must
 * never reach the browser.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminConfig, type Database } from './config';

let cached: SupabaseClient<Database> | null = null;

export function getAdminSupabase(): SupabaseClient<Database> {
  if (cached) return cached;
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  cached = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
