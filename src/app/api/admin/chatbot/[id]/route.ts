/**
 * GET /api/admin/chatbot/[id] — admin read of one conversation.
 *
 * Returns the lead row + the conversation metadata + the full
 * transcript in chronological order. PATCH closes the conversation
 * (status = 'closed') so admins can archive threads they're done with.
 *
 * No PATCH for arbitrary edits — chatbot transcripts are append-only
 * by design. If an admin needs to redact something, they do it via
 * the lead's notes field on the lead detail page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { loadTranscript } from '@/lib/chatbot/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = getAdminSupabase();
  const { data: conv, error } = await supabase
    .from('chatbot_conversations')
    .select('id, lead_id, status, message_count, last_message_at, metadata, created_at, updated_at, leads(company_name, contact_person, email, phone, country, status)')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  const messages = await loadTranscript(conv.id);
  // Hydrate citations so admins see "Navy Herringbone Knit Polo"
  // instead of "cf-polo-001". Same one-shot IN-list pattern as the
  // public rehydrate endpoint.
  const citedIds = Array.from(
    new Set(messages.flatMap((m) => m.citedProductIds)),
  );
  let productIndex: Record<string, { id: string; name: string; sku: string }> = {};
  if (citedIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku')
      .in('id', citedIds);
    if (products) {
      productIndex = Object.fromEntries(
        products.map((p) => [p.id, { id: p.id, name: p.name, sku: p.sku }]),
      );
    }
  }
  return NextResponse.json(
    {
      conversation: conv,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        cited_product_ids: m.citedProductIds,
        cited_products: m.citedProductIds
          .map((id) => productIndex[id])
          .filter((p): p is { id: string; name: string; sku: string } => Boolean(p)),
        created_at: m.createdAt,
      })),
    },
    { status: 200 },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const status =
    typeof (body as Record<string, unknown>)?.status === 'string'
      ? ((body as Record<string, unknown>).status as string)
      : null;
  if (!status || !['open', 'closed'].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'open' or 'closed'" },
      { status: 400 },
    );
  }
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('chatbot_conversations')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  return NextResponse.json({ conversation: data }, { status: 200 });
}
