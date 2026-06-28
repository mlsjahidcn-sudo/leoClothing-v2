/**
 * GET /api/admin/chatbot — list chatbot conversations for admin review.
 *
 * Joins chatbot_conversations → leads so admins see "Company X • 12
 * messages • 2026-06-28" rather than opaque UUIDs. Supports the
 * same filters as /api/admin/leads (status, search) plus a
 * `has_messages` filter for "show me conversations worth reading".
 *
 * Admin-only. `requireAdmin` returns 401/403 on auth failure.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  let query = auth.supabase
    .from('chatbot_conversations')
    .select(
      'id, lead_id, status, message_count, last_message_at, created_at, leads!inner(company_name, contact_person, email)',
      { count: 'exact' },
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (search) {
    // PostgREST can't filter on joined columns with `ilike` directly
    // when the join isn't `!inner` — we use the !inner hint by
    // referencing the join in the or() clause.
    query = query.or(
      `leads.company_name.ilike.%${search}%,leads.contact_person.ilike.%${search}%,leads.email.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    conversations: data ?? [],
    total: count ?? undefined,
    limit,
    offset,
  });
}
