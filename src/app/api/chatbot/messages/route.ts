/**
 * POST /api/chatbot/messages — visitor sends a chat turn.
 *
 * Body: `{ conversation_id, message }`.
 * - Looks up the conversation (service-role, since visitors have no auth).
 * - Confirms the conversation is still `open`.
 * - Runs the turn through the engine (RAG + DeepSeek + persist).
 * - Returns the assistant content + cited product IDs.
 *
 * No auth check on the conversation_id itself — anyone with the id
 * can post to it. That's intentional: the lead-gate is the visitor's
 * one-time soft commitment, and the conversation_id is opaque. We
 * could add a per-conversation shared secret later if abuse becomes
 * a problem.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { chatbotMessageSchema } from '@/lib/validators';
import { runTurn, ChatbotEngineError } from '@/lib/chatbot/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = chatbotMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid message payload', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { conversation_id, message } = parsed.data;
  const supabase = getAdminSupabase();

  // Confirm the conversation exists and is open before we burn an
  // LLM call on it. A 404 here is a likely sign of a stale widget
  // (visitor cleared localStorage, then re-opened the panel).
  const { data: conv, error: convError } = await supabase
    .from('chatbot_conversations')
    .select('id, status, lead_id')
    .eq('id', conversation_id)
    .maybeSingle();

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }
  if (!conv) {
    return NextResponse.json(
      { error: 'Conversation not found. Please refresh and try again.' },
      { status: 404 },
    );
  }
  if (conv.status !== 'open') {
    return NextResponse.json(
      { error: 'This conversation has been closed.' },
      { status: 410 },
    );
  }

  try {
    const result = await runTurn({
      conversationId: conv.id,
      userMessage: message,
    });
    return NextResponse.json(
      {
        assistant: result.assistant,
        cited_product_ids: result.citedProductIds,
        cited_products: result.citedProducts,
        usage: result.usage ?? null,
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof ChatbotEngineError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[api/chatbot/messages] unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error. Please try again.' },
      { status: 500 },
    );
  }
}
