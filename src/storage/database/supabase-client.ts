/**
 * Backward-compatible re-exports for the old import path.
 *
 * Code that does `import { getSupabaseClient } from '@/storage/database/supabase-client'`
 * keeps working — it now gets a per-request server client using the
 * publishable key, with an optional access token for the user's session.
 *
 * New code should import directly from `@/lib/supabase`:
 *   - `getBrowserSupabase`  → browser components
 *   - `getServerSupabase`   → API routes / RSC
 *   - `getAdminSupabase`    → server-only RLS bypass
 */
export { getSupabaseConfig, getSupabaseAdminConfig } from '@/lib/supabase/config';
export { getServerSupabase as getSupabaseClient, getBearerToken } from '@/lib/supabase/server';
export { getBrowserSupabase } from '@/lib/supabase/client';
export { getAdminSupabase } from '@/lib/supabase/admin';
export type { Database } from '@/lib/supabase/types';
