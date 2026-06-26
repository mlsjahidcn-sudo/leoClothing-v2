/**
 * GET /api/site-info
 *
 * Public, anon-readable. Returns the site's currently-active WhatsApp
 * number (sourced from the active admin's profile via the
 * `public_admin_whatsapp` view).
 *
 * Response shape:
 *   { whatsapp: string | null }
 *
 * The number is returned as-stored in the DB (E.164 or whatever format
 * the admin pasted). Clients that need a wa.me deep link should normalize
 * by stripping non-digits and prefixing with `https://wa.me/`.
 *
 * Cache: short — settings can change any time the admin edits them in
 * /admin/settings, and the data is tiny. Use `revalidate: 60` so the
 * server holds the value for a minute and a flooding client can't
 * hammer Supabase.
 */
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('public_admin_whatsapp')
      .select('whatsapp')
      .maybeSingle();

    if (error) {
      // Surface the DB error in the response but with a 500 — we don't
      // want a silent fallback to `whatsapp: null` (which would hide
      // the button entirely) for an actually-broken state.
      return NextResponse.json(
        { whatsapp: null, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { whatsapp: data?.whatsapp ?? null },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } },
    );
  } catch (e) {
    return NextResponse.json(
      { whatsapp: null, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
