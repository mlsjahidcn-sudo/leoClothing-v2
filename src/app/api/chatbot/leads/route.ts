/**
 * POST /api/chatbot/leads — bootstrap an anonymous chatbot session.
 *
 * Creates a stub `leads` row with `source='chatbot'` and `email` set
 * to a deterministic `<visitor_token>@anonymous.local` placeholder,
 * then opens a `chatbot_conversations` row tied to that lead. Returns
 * `{ conversation_id, lead_id }` to the widget, which uses the
 * conversation_id for every subsequent /messages POST.
 *
 * Why an anonymous stub instead of dropping the lead gate:
 *   - `chatbot_conversations.lead_id` is NOT NULL in the schema.
 *     Making it nullable would be a destructive migration we don't
 *     need to ship right now.
 *   - We still get admin-side attribution: every chatbot thread
 *     appears under a single "Anonymous Visitor" lead in the leads
 *     list, with `notes` carrying the visitor_token so admins can
 *     group related sessions. If the visitor later submits a real
 *     /inquiry form, those threads can be merged manually.
 *
 * Idempotency: the same `visitor_token` always returns the same open
 * conversation (or creates one). Re-clicking the chat bubble from the
 * same browser doesn't generate duplicate transcripts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { chatbotStartSchema } from '@/lib/validators';
import { openConversation } from '@/lib/chatbot/engine';

export const runtime = 'nodejs';
// Chat bootstrap is dynamic — never cache.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = chatbotStartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid start payload', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { visitor_token: visitorToken } = parsed.data;
    const supabase = getAdminSupabase();

    // Derive a deterministic anonymous email from the token. The token
    // is opaque to humans, so the email is too — but it's stable across
    // re-opens, which lets the leads table dedupe correctly via its
    // unique email constraint.
    const anonymousEmail = `${visitorToken}@anonymous.local`;

    // Find-or-create the stub lead. Anonymous visitors all share the
    // same email identity per-token, so the second call from the same
    // browser reuses the existing lead row.
    let leadId: string;
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', anonymousEmail)
      .maybeSingle();
    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          company_name: 'Anonymous Visitor',
          contact_person: 'Anonymous Visitor',
          email: anonymousEmail,
          source: 'chatbot',
          status: 'new',
          notes: `Anonymous chatbot session. visitor_token=${visitorToken}`,
        })
        .select('id')
        .single();
      if (leadError || !newLead) {
        // If two widgets race to create the same stub lead, the unique
        // email constraint fires (23505). Re-fetch and continue.
        if (leadError?.code === '23505') {
          const { data: retry, error: lookupErr } = await supabase
            .from('leads')
            .select('id')
            .eq('email', anonymousEmail)
            .maybeSingle();
          if (retry) {
            leadId = retry.id;
          } else {
            return NextResponse.json(
              { error: lookupErr?.message ?? 'Failed to resolve lead after conflict' },
              { status: 500 },
            );
          }
        } else {
          return NextResponse.json(
            { error: leadError?.message ?? 'Failed to create lead' },
            { status: 500 },
          );
        }
      } else {
        leadId = newLead.id;
      }
    }

    const { conversationId, created } = await openConversation({
      leadId,
      visitorToken,
      metadata: { source: 'chatbot', anonymous: true },
    });
    return NextResponse.json(
      { conversation_id: conversationId, lead_id: leadId, created },
      { status: 200 },
    );
  } catch (err) {
    // Top-level safety net — without this, any thrown error in the
    // supabase admin client (e.g. missing SUPABASE_SERVICE_ROLE_KEY)
    // bubbles up as Next.js's default empty 500, which is impossible
    // to debug from the browser.
    console.error('[api/chatbot/leads] unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Chatbot bootstrap failed: ${message}` },
      { status: 500 },
    );
  }
}