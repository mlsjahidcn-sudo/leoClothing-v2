/**
 * Server-side helpers for the admin API surface.
 *
 * Use these in every `/api/admin/*` route to:
 *   1. Pull the user's JWT from the `Authorization: Bearer <token>` header
 *      (sent automatically by the browser-side Supabase client once the
 *      admin has signed in).
 *   2. Verify the JWT and resolve the user via `auth.getUser()`.
 *   3. Confirm the user is an admin (i.e. has a row in `admin_profiles`).
 *   4. Return a per-request Supabase client scoped to that user's session,
 *      so all downstream queries run under RLS as that user.
 *
 * If any of these checks fail, the helper returns a 401/403 NextResponse
 * that the route should pass through unchanged.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabase, getBearerToken } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export interface AdminAuthSuccess {
  ok: true;
  user: { id: string; email: string | null };
  profile: { id: string; email: string; name: string; role: string };
  supabase: SupabaseClient<Database>;
}

export interface AdminAuthFailure {
  ok: false;
  response: NextResponse;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

const NO_TOKEN_RESPONSE = NextResponse.json(
  { error: 'Missing or invalid Authorization header' },
  { status: 401 },
);

const INVALID_TOKEN_RESPONSE = NextResponse.json(
  { error: 'Invalid or expired session' },
  { status: 401 },
);

const NOT_ADMIN_RESPONSE = NextResponse.json(
  { error: 'Admin privileges required' },
  { status: 403 },
);

export async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const token = getBearerToken(request.headers);
  if (!token) return { ok: false, response: NO_TOKEN_RESPONSE };

  const supabase = getServerSupabase(token);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, response: INVALID_TOKEN_RESPONSE };

  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id, email, name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Profile lookup failed: ${profileError.message}` },
        { status: 500 },
      ),
    };
  }
  if (!profile) return { ok: false, response: NOT_ADMIN_RESPONSE };

  return {
    ok: true,
    user: { id: user.id, email: user.email ?? null },
    profile,
    supabase,
  };
}
