/**
 * Tiny `fetch` wrapper that always sends the current admin's Supabase
 * session token. Use this for every call to `/api/admin/*` from a
 * `'use client'` component.
 *
 *   const res = await adminFetch('/api/admin/products', { method: 'POST', body: ... });
 *
 * Behavior:
 *   - Resolves the session token from the browser Supabase client
 *     with a hard 5s timeout. If getSession() hangs (corrupted
 *     localStorage, locked storage key) we fall back to a no-auth
 *     request — the server will 401, which is at least a real
 *     response (vs. the alternative of waiting forever).
 *   - Adds `Authorization: Bearer <access_token>` if a session exists.
 *   - On `!res.ok` + JSON error body: returns the response as-is so
 *     the caller can read `.error` directly. We don't throw — the
 *     existing callers already do their own `if (!res.ok) {...}`.
 */
import { getBrowserSupabase } from './supabase/client';

const GET_SESSION_TIMEOUT_MS = 5_000;

/**
 * Read the current session with a hard timeout. Returns null on
 * any failure (timeout, rejection, or no session). Never throws.
 */
async function getSessionWithTimeout(): Promise<Awaited<ReturnType<ReturnType<typeof getBrowserSupabase>['auth']['getSession']>>['data']['session']> {
  try {
    const supabase = getBrowserSupabase();
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('getSession timed out')), GET_SESSION_TIMEOUT_MS),
      ),
    ]);
    return result.data.session;
  } catch (e) {
    // Hung, rejected, or timed out — fall through to no-auth request.
    // The API will 401, the caller's UI will show a real error
    // instead of an infinite spinner.
    console.warn('[adminFetch] getSession failed:', e);
    return null;
  }
}

export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const session = await getSessionWithTimeout();

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}
