'use client';

/**
 * Admin chatbot conversation detail — full transcript view.
 *
 * Renders the lead summary at the top (so the admin sees who they're
 * talking to) followed by the chronological message transcript.
 *
 * Assistant messages that cited products show the cited product IDs
 * as small chips — clicking them opens the product page in a new tab
 * so admins can quickly cross-reference what the bot told the visitor.
 *
 * The "Close" / "Reopen" button in the header is the only mutation
 * here. We don't allow editing the transcript — append-only by design.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

interface LeadSummary {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  country: string | null;
  status: string;
}

interface Conversation {
  id: string;
  lead_id: string;
  status: string;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  leads: LeadSummary | null;
}

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  cited_product_ids: string[];
  cited_products?: Array<{ id: string; name: string; sku: string }>;
  created_at: string;
}

export default function AdminChatbotDetailPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params?.id;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/chatbot/${conversationId}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `Failed to load (${res.status})`);
      } else {
        setConversation(body.conversation);
        setMessages(body.messages ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async () => {
    if (!conversation) return;
    const nextStatus = conversation.status === 'open' ? 'closed' : 'open';
    setUpdatingStatus(true);
    try {
      const res = await adminFetch(`/api/admin/chatbot/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `Failed to update (${res.status})`);
      } else {
        setConversation((prev) =>
          prev ? { ...prev, status: body.conversation.status } : prev,
        );
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading transcript…</div>;
  }
  if (error || !conversation) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? 'Conversation not found.'}
      </div>
    );
  }

  const lead = conversation.leads;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/chatbot"
          className="text-xs text-[#B8956A] hover:underline"
        >
          ← Back to conversations
        </Link>
      </div>

      {/* Lead summary */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {lead?.company_name ?? 'Unknown company'}
            </h1>
            <p className="mt-0.5 text-sm text-gray-600">
              {lead?.contact_person ?? '—'}
              {lead?.email ? ` · ${lead.email}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
              {lead?.phone && <span>📞 {lead.phone}</span>}
              {lead?.country && <span>🌐 {lead.country}</span>}
              <span>💬 {conversation.message_count} messages</span>
              {conversation.last_message_at && (
                <span>
                  Last activity{' '}
                  {new Date(conversation.last_message_at).toLocaleString()}
                </span>
              )}
              <span>
                Started{' '}
                {new Date(conversation.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                conversation.status === 'open'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {conversation.status}
            </span>
            <button
              type="button"
              onClick={toggleStatus}
              disabled={updatingStatus}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {conversation.status === 'open' ? 'Close conversation' : 'Reopen'}
            </button>
          </div>
        </div>
        {lead && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <Link
              href={`/admin/leads/${conversation.lead_id}`}
              className="text-xs text-[#B8956A] hover:underline"
            >
              Open full lead record →
            </Link>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {messages.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            No messages in this conversation yet.
          </div>
        ) : (
          <ol className="divide-y divide-gray-100">
            {messages.map((m) => (
              <li key={m.id} className="flex gap-3 px-5 py-4">
                <div className="w-20 shrink-0 pt-0.5">
                  <span
                    className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      m.role === 'user'
                        ? 'bg-blue-100 text-blue-800'
                        : m.role === 'assistant'
                          ? 'bg-[#B8956A]/15 text-[#96754E]'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {m.role}
                  </span>
                  <p className="mt-1 text-[10px] leading-tight text-gray-400">
                    {new Date(m.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                    {m.content}
                  </p>
                  {m.cited_product_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.cited_product_ids.map((id) => {
                        const hydrated = m.cited_products?.find((p) => p.id === id);
                        // Show the product name as the link text (with
                        // SKU as the tooltip). Falls back to the raw
                        // id if hydration didn't ship.
                        const label = hydrated?.name ?? id;
                        const tip = hydrated?.sku ? `SKU: ${hydrated.sku}` : id;
                        return (
                          <Link
                            key={id}
                            href={`/products/${id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={tip}
                            className="max-w-[260px] truncate rounded-sm border border-[#B8956A] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#B8956A] hover:bg-[#B8956A] hover:text-white"
                          >
                            {label} ↗
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
