/**
 * POST /api/chatbot/leads — visitor submits the lead-gate form.
 *
 * Creates (or reuses) a `leads` row with `source='chatbot'`, then
 * opens a `chatbot_conversations` row tied to that lead. Returns
 * `{ conversation_id, lead_id }` to the widget, which uses the
 * conversation_id for every subsequent /messages POST.
 *
 * The visitor_token is also returned so the widget can persist it
 * to localStorage and reuse the same transcript across page reloads
 * within the same browser session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { chatbotLeadGateSchema } from '@/lib/validators';
import { openConversation } from '@/lib/chatbot/engine';

export const runtime = 'nodejs';
// Lead-gate is dynamic — never cache.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = chatbotLeadGateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid lead payload', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const supabase = getAdminSupabase();

  // Create the lead row first. If a lead with the same email already
  // exists, that's fine — we attach a fresh conversation to the
  // existing lead rather than rejecting the visitor. Returning buyers
  // shouldn't have to fill in their company name twice.
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      company_name: data.company_name,
      contact_person: data.contact_person,
      email: data.email,
      phone: data.phone ?? null,
      country: data.country ?? null,
      source: 'chatbot',
      status: 'new',
      notes: 'Captured via chatbot lead gate.',
    })
    .select('id')
    .single();

  if (leadError || !lead) {
    // 23505 = unique_violation on email. Fall through to look up
    // the existing lead and continue. Other errors are 500s.
    if (leadError?.code === '23505') {
      const { data: existing, error: lookupErr } = await supabase
        .from('leads')
        .select('id')
        .eq('email', data.email)
        .maybeSingle();
      if (lookupErr || !existing) {
        return NextResponse.json(
          { error: lookupErr?.message ?? 'Failed to resolve existing lead' },
          { status: 500 },
        );
      }
      // Use the existing lead id.
      const { conversationId, created } = await openConversation({
        leadId: existing.id,
        visitorToken: data.visitor_token,
        metadata: { source: 'chatbot', returning_visitor: true },
      });
      return NextResponse.json(
        { conversation_id: conversationId, lead_id: existing.id, created },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: leadError?.message ?? 'Failed to create lead' },
      { status: 500 },
    );
  }

  const { conversationId, created } = await openConversation({
    leadId: lead.id,
    visitorToken: data.visitor_token,
    metadata: { source: 'chatbot', returning_visitor: false },
  });
  return NextResponse.json(
    { conversation_id: conversationId, lead_id: lead.id, created },
    { status: 201 },
  );
}
