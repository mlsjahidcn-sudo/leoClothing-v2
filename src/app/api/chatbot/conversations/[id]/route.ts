/**
 * GET /api/chatbot/conversations/[id] — load a visitor's transcript.
 *
 * Used when the widget reopens after a refresh: the widget has the
 * conversation_id (from localStorage), and we want to rehydrate the
 * chat with the existing messages so the visitor sees context, not
 * a blank panel.
 *
 * No auth — same trade-off as the messages route. The conversation_id
 * is opaque; the worst-case leak is a transcript, which the visitor
 * themselves just produced.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { loadTranscript } from '@/lib/chatbot/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });
  }
  const supabase = getAdminSupabase();
  const { data: conv, error: convError } = await supabase
    .from('chatbot_conversations')
    .select('id, status, lead_id, created_at, last_message_at, message_count')
    .eq('id', id)
    .maybeSingle();
  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }
  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  const messages = await loadTranscript(conv.id);

  // Hydrate citations server-side so the chat widget can render
  // product names instead of raw IDs (which leak UUIDs for products
  // added outside the cf-XXX-NNN convention). Collect every cited
  // ID across the transcript, do a single IN-list query, then merge
  // the names back into each message in order.
  const citedIds = Array.from(
    new Set(messages.flatMap((m) => m.citedProductIds)),
  );
  let productIndex: Record<string, { id: string; name: string; sku: string }> = {};
  if (citedIds.length > 0) {
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, sku')
      .in('id', citedIds);
    if (!prodError && products) {
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
