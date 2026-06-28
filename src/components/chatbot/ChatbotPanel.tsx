'use client';

/**
 * Chat panel — the actual conversation UI shown after the lead gate.
 *
 * Responsibilities:
 *   - Render the message transcript (user / assistant bubbles).
 *   - Auto-scroll to the latest message.
 *   - Submit a chat turn via POST /api/chatbot/messages.
 *   - Show a typing indicator while waiting for the assistant.
 *   - Render cited product IDs as inline "View product" links so
 *     visitors can jump straight from the bot's reply to the product
 *     page.
 *
 * The panel is dumb on purpose — all conversation state lives in the
 * database (server is source of truth). The panel just sends a POST,
 * appends the assistant reply, and re-renders.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  cited_product_ids: string[];
  created_at: string;
}

interface ChatbotPanelProps {
  conversationId: string;
  contactName?: string;
  initialMessages?: ChatMessage[];
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  'What knit polos do you offer?',
  'What\'s your MOQ and lead time?',
  'Can you do custom labels and packaging?',
  'Do you have certifications I can share with retailers?',
];

export default function ChatbotPanel({
  conversationId,
  contactName,
  initialMessages = [],
  onClose,
}: ChatbotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to bottom whenever the transcript changes.
  // Smooth inside the panel, instant on first paint.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: messages.length <= 1 ? 'auto' : 'smooth' });
  }, [messages.length, sending]);

  // Focus the input as soon as the panel opens so the visitor can
  // start typing immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content: trimmed,
      cited_product_ids: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setSending(true);
    try {
      const res = await fetch('/api/chatbot/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: trimmed }),
      });
      const body = (await res.json()) as {
        assistant?: string;
        cited_product_ids?: string[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: body.assistant ?? '',
        cited_product_ids: body.cited_product_ids ?? [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(
        err instanceof Error
          ? err.message
          : 'Could not send your message. Please try again.',
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void sendMessage(draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline. Standard chat UX.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(draft);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#F5F0EB]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#D9D4CE] bg-white px-4 py-3 sm:px-5">
        <div>
          <p className="font-serif text-base text-[#2C2C2C]">Chat with Cora</p>
          <p className="text-[11px] text-[#7A756E]">
            {contactName ? `Hi ${contactName} · ` : ''}AI assistant · Chengfeng International
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="text-[#7A756E] hover:text-[#2C2C2C]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 sm:px-5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-serif text-base text-[#2C2C2C]">
              How can we help today?
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#7A756E]">
              Ask about our knit polos, MOQ, lead times, custom manufacturing,
              or anything else you need to scope your project.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={sending}
                  className="rounded-sm border border-[#D9D4CE] bg-white px-3 py-2 text-left text-xs text-[#2C2C2C] hover:border-[#B8956A] hover:text-[#B8956A] disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-sm bg-[#2C2C2C] px-3 py-2 text-sm text-white'
                    : 'max-w-[85%] rounded-sm bg-white px-3 py-2 text-sm text-[#2C2C2C] shadow-sm'
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {m.role === 'assistant' && m.cited_product_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#EDEBE8] pt-2">
                    {m.cited_product_ids.map((id) => (
                      <Link
                        key={id}
                        href={`/products/${id}`}
                        className="rounded-sm border border-[#B8956A] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#B8956A] hover:bg-[#B8956A] hover:text-white"
                      >
                        View {id}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
          {sending && (
            <li className="flex justify-start" aria-label="Cora is typing">
              <div className="flex max-w-[85%] items-center gap-2 rounded-sm bg-white px-3 py-2 text-sm text-[#7A756E] shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking…</span>
              </div>
            </li>
          )}
        </ol>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 sm:px-5"
        >
          {error}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[#D9D4CE] bg-white px-3 py-2 sm:px-4 sm:py-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            disabled={sending}
            rows={1}
            maxLength={2000}
            className="min-h-[40px] max-h-32 flex-1 resize-none rounded-sm border border-[#D9D4CE] bg-white px-3 py-2 text-sm text-[#2C2C2C] placeholder:text-[#7A756E] focus:border-[#B8956A] focus:outline-none focus:ring-1 focus:ring-[#B8956A] disabled:opacity-60"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#B8956A] text-white transition-colors hover:bg-[#96754E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-[#7A756E]">
          Press Enter to send · Shift+Enter for newline
        </p>
      </form>
    </div>
  );
}
