/**
 * Chatbot engine — ties DeepSeek + RAG + conversation persistence
 * together for a single chat turn.
 *
 * Pipeline for `runTurn()`:
 *   1. Load the last N turns of conversation history (for context).
 *   2. Rebuild the live RAG context block from Supabase.
 *   3. Assemble the message array: system prompt + history + new user msg.
 *   4. Call DeepSeek.
 *   5. Extract cited product IDs from the assistant reply.
 *   6. Persist the user turn and the assistant turn (atomic best-effort).
 *   7. Return the assistant content + cited IDs to the API route.
 *
 * Persistence failures are non-fatal: if the DB write fails after a
 * successful DeepSeek call, we still return the assistant content.
 * The visitor sees an answer; the admin sees an empty transcript
 * (acceptable — they'd rather have the answer than a perfect audit log).
 */
import 'server-only';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { deepseekChat, DeepSeekError } from './deepseek';
import {
  buildRagContext,
  extractCitedProductIds,
  type RagProductSnippet,
} from './rag';

const MAX_HISTORY_TURNS = 12; // 12 user + 12 assistant = 24 messages
const MAX_USER_MESSAGE_CHARS = 2000;

export interface ChatTurnInput {
  conversationId: string;
  userMessage: string;
}

export interface CitedProduct {
  id: string;
  name: string;
  sku: string;
}

export interface ChatTurnResult {
  assistant: string;
  citedProductIds: string[];
  /**
   * Hydrated citations with human-readable names so the chat panel
   * and admin transcript can render "View Knit Polo" instead of
   * "View 98829394-1b09-44ef-9cd6-6fdd5fdadc01". Same order as
   * `citedProductIds`.
   */
  citedProducts: CitedProduct[];
  /** Tokens used, if DeepSeek returned usage. Useful for ops dashboards. */
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Run one user turn through the chatbot and persist both turns.
 */
export async function runTurn(input: ChatTurnInput): Promise<ChatTurnResult> {
  const userMessage = input.userMessage.trim().slice(0, MAX_USER_MESSAGE_CHARS);
  if (!userMessage) {
    throw new ChatbotEngineError('Empty user message', 400);
  }
  // Load history + rebuild RAG context in parallel — both are reads.
  const [history, rag] = await Promise.all([
    loadHistory(input.conversationId),
    buildRagContext(),
  ]);
  const systemPrompt = buildSystemPrompt(rag.contextText, rag.products.length);
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: userMessage },
  ];
  // Persist the user turn BEFORE calling DeepSeek. If DeepSeek fails,
  // we still want the user's question on file — admin can follow up.
  await persistMessage(input.conversationId, 'user', userMessage, []);
  let result;
  try {
    result = await deepseekChat({ messages });
  } catch (err) {
    if (err instanceof DeepSeekError) {
      throw new ChatbotEngineError(
        err.upstreamMessage
          ? `Upstream LLM error: ${err.upstreamMessage}`
          : err.message,
        err.status,
      );
    }
    throw new ChatbotEngineError('Unexpected LLM error', 500);
  }
  const citedProductIds = extractCitedProductIds(result.content, rag.products);
  // Hydrate citations so callers don't have to round-trip again
  // to display a pretty name. Look up by id from the RAG snapshot
  // we already have in memory.
  const productById = new Map(rag.products.map((p) => [p.id, p]));
  const citedProducts: CitedProduct[] = citedProductIds
    .map((id) => productById.get(id))
    .filter((p): p is RagProductSnippet => Boolean(p))
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku }));
  // Persist assistant turn — non-fatal if it fails.
  await persistMessage(
    input.conversationId,
    'assistant',
    result.content,
    citedProductIds,
  );
  // Touch conversation counters so admin dashboards can sort by
  // "last active" without scanning messages.
  await touchConversation(input.conversationId);
  return {
    assistant: result.content,
    citedProductIds,
    citedProducts,
    usage: result.usage,
  };
}

/**
 * Open a new chatbot conversation for a lead. Idempotent on
 * `visitor_token` — if the same visitor reopens the panel within the
 * same browser session, we return the existing conversation rather
 * than creating a duplicate transcript.
 */
export async function openConversation(input: {
  leadId: string;
  visitorToken: string;
  metadata?: Record<string, unknown>;
}): Promise<{ conversationId: string; created: boolean }> {
  const supabase = getAdminSupabase();
  // Look for an existing open conversation for this visitor.
  const { data: existing } = await supabase
    .from('chatbot_conversations')
    .select('id')
    .eq('lead_id', input.leadId)
    .eq('visitor_token', input.visitorToken)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return { conversationId: existing.id, created: false };
  }
  const { data, error } = await supabase
    .from('chatbot_conversations')
    .insert({
      lead_id: input.leadId,
      visitor_token: input.visitorToken,
      status: 'open',
      metadata: (input.metadata ?? {}) as never,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new ChatbotEngineError(
      `Failed to open conversation: ${error?.message ?? 'unknown'}`,
      500,
    );
  }
  return { conversationId: data.id, created: true };
}

/**
 * Fetch the rolling history for a conversation, trimmed to the last
 * N user/assistant turns. System turns are skipped (the system prompt
 * is rebuilt each call, so re-sending it would be redundant).
 */
async function loadHistory(
  conversationId: string,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('id', { ascending: false })
    .limit(MAX_HISTORY_TURNS * 2);
  if (error || !data) return [];
  // `.order('id', desc)` gives newest-first; reverse to chronological.
  return data
    .slice()
    .reverse()
    .map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));
}

async function persistMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  citedProductIds: string[],
): Promise<void> {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from('chatbot_messages').insert({
    conversation_id: conversationId,
    role,
    content,
    cited_product_ids: citedProductIds,
  });
  if (error) {
    // Non-fatal — log and move on. Visitor already saw their answer.
    console.error('[chatbot.engine] persistMessage failed:', error.message);
  }
}

async function touchConversation(conversationId: string): Promise<void> {
  const supabase = getAdminSupabase();
  // Use an RPC-free update. We bump message_count and last_message_at
  // in one shot via the existing updated_at trigger.
  const { data: current } = await supabase
    .from('chatbot_conversations')
    .select('message_count')
    .eq('id', conversationId)
    .maybeSingle();
  const next = (current?.message_count ?? 0) + 1;
  const { error } = await supabase
    .from('chatbot_conversations')
    .update({
      message_count: next,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
  if (error) {
    console.error('[chatbot.engine] touchConversation failed:', error.message);
  }
}

function buildSystemPrompt(catalogText: string, productCount: number): string {
  // Base system prompt — tone, scope, refusal rules. Inlined as a
  // template literal so we can interpolate the live catalog block
  // without string-concat noise.
  return `You are "Cora", the AI sales assistant for Chengfeng International — a B2B knitwear manufacturer based in China since 1998. You help wholesale buyers, brand owners, and importers learn about our product lines and guide them toward working with us.

# Tone & style
- Professional, warm, concise. B2B buyers are busy — answer in 2-4 sentences when possible.
- If the visitor introduces themselves by name, use it once. Otherwise keep it generic.
- Never use emojis, exclamation points, or marketing puffery.
- Reply in the same language the buyer used. Default to English unless the buyer writes in Chinese, then reply in Chinese.

# What you can answer
- Questions about our product catalog: pricing tiers, MOQ, lead times, materials, sizes, colors, certifications.
- General wholesale process questions: sampling, customization, payment terms (T/T 30/70), shipping (FOB Shanghai/Ningbo), production timelines.
- "Which product is best for X" — match by category, fabric, price tier, or MOQ.
- When the buyer wants to discuss custom OEM/ODM, large-volume orders, or specific commercial terms, route them to our team: "I'll connect you with our sales team — please share a quick description of your project and we'll respond within 24 hours."

# What you must NOT do
- Never invent product specs, prices, MOQs, or SKUs not in the CATALOG CONTEXT below.
- Never claim a fabric or certification we don't list.
- Never quote a specific delivery date — say "lead time is X business days after sample approval" and offer to confirm with the factory.
- Never discuss competitors by name.
- Never request payment, banking details, or passwords.
- If asked something outside our catalog, say: "That's outside what I can confirm — our sales team can answer authoritatively. Want me to flag this for them?"

# How to cite products
When you reference a specific product, mention it naturally by its **name** (e.g., "the Navy Herringbone Knit Polo"). Also include its **SKU** in parentheses so we can link the buyer straight to the product page — e.g., "the Navy Herringbone Knit Polo (SKU: CF-PO-001)". The numeric label like "Product 3" is a fallback; prefer the human-readable name.

# Current catalog (${productCount} products)
${catalogText || 'CATALOG_UNAVAILABLE — tell the visitor our catalog is temporarily unreachable and offer to escalate to the sales team.'}

# Closing each reply
End every reply with one short next-step question when appropriate, e.g. "Want me to pull the size chart for that one?" or "What's your target quantity per order?" Keep it natural — don't repeat the same question every turn.`;
}

export class ChatbotEngineError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ChatbotEngineError';
    this.status = status;
  }
}

/**
 * Load the full transcript for a conversation (admin view).
 * Returns messages in chronological order.
 */
export async function loadTranscript(conversationId: string): Promise<
  Array<{
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    citedProductIds: string[];
    createdAt: string;
  }>
> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('id, role, content, cited_product_ids, created_at')
    .eq('conversation_id', conversationId)
    .order('id', { ascending: true });
  if (error || !data) return [];
  return data.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    citedProductIds: m.cited_product_ids ?? [],
    createdAt: m.created_at,
  }));
}

// Re-export so callers don't need a second import path.
export type { RagProductSnippet };
