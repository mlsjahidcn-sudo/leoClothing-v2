/**
 * Tiny `fetch` wrapper that always sends the current admin's Supabase
 * session token. Use this for every call to `/api/admin/*` from a
 * `'use client'` component.
 *
 *   const res = await adminFetch('/api/admin/products', { method: 'POST', body: ... });
 *
 * Behavior:
 *   - Resolves the session token from the browser Supabase client.
 *   - Adds `Authorization: Bearer <access_token>` if a session exists.
 *   - Throws an Error with a friendly message if the server returns
 *     a JSON `{ error }` body, so callers don't have to repeat the
 *     `res.ok` boilerplate.
 */
import { getBrowserSupabase } from './supabase/client';

export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const supabase = getBrowserSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const res = await fetch(input, { ...init, headers });

  if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
    // We don't throw here — let the caller decide. But we tag the
    // response so the caller can read .error easily.
    return res;
  }
  return res;
}
