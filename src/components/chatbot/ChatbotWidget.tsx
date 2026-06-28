'use client';

/**
 * Floating chatbot widget — the launcher bubble + panel.
 *
 * Mounts site-wide via (site)/layout.tsx. Two states:
 *   - closed: just the floating bubble (bottom-right, above the
 *     WhatsApp button on larger screens)
 *   - open: chat panel
 *
 * No lead gate — the visitor starts chatting immediately. We auto-
 * create an anonymous stub lead (email = visitor_token@anonymous.local)
 * on first open so the schema's `chatbot_conversations.lead_id NOT NULL`
 * constraint is satisfied without forcing the visitor to fill anything
 * in. If they later submit a real inquiry via /inquiry, the admin can
 * merge the two threads manually.
 *
 * Rehydration: on mount, we read `localStorage` for an existing
 * conversation_id. If found AND the conversation still exists on the
 * server (status='open'), we reopen the chat at the existing transcript.
 * Otherwise we generate a fresh visitor_token and lazy-create a new
 * conversation when the bubble is first clicked.
 *
 * localStorage keys (versioned so we can change shape later):
 *   - cb_v1_visitor_token   — opaque session token
 *   - cb_v1_conversation_id — last conversation UUID
 */
import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatbotPanel from './ChatbotPanel';

const LS_TOKEN = 'cb_v1_visitor_token';
const LS_CONV = 'cb_v1_conversation_id';

type Mode = 'closed' | 'opening' | 'open';

interface PersistedSession {
  visitorToken: string;
  conversationId: string | null;
}

/**
 * Generate a random visitor token. Crypto-strong where available,
 * with a Math.random fallback so SSR / older browsers don't break.
 */
function generateVisitorToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // Mix a UUID with a timestamp so re-clicks in the same session
    // don't regenerate and lose the existing conversation.
    return `${crypto.randomUUID()}.${Date.now().toString(36)}`;
  }
  return `tkn-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function readSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  const visitorToken = window.localStorage.getItem(LS_TOKEN);
  if (!visitorToken) return null;
  return {
    visitorToken,
    conversationId: window.localStorage.getItem(LS_CONV),
  };
}

function writeSession(session: PersistedSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LS_TOKEN, session.visitorToken);
  if (session.conversationId) {
    window.localStorage.setItem(LS_CONV, session.conversationId);
  } else {
    window.localStorage.removeItem(LS_CONV);
  }
}

function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LS_TOKEN);
  window.localStorage.removeItem(LS_CONV);
}

/**
 * Server creates an anonymous lead + opens a conversation in one call.
 * Returns the conversation_id; widget persists it for rehydration.
 */
async function ensureConversation(visitorToken: string): Promise<string> {
  const res = await fetch('/api/chatbot/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitor_token: visitorToken }),
  });
  // Defensive: some failure modes (e.g. an upstream proxy returning
  // an empty 500) make `res.json()` throw on an empty body. Read as
  // text first, then try JSON.parse, so we always get a usable
  // error message in the catch.
  const raw = await res.text();
  let body: { conversation_id?: string; error?: string } = {};
  try {
    body = raw ? (JSON.parse(raw) as typeof body) : {};
  } catch {
    body = {};
  }
  if (!res.ok || !body.conversation_id) {
    throw new Error(
      body.error ||
        `Chat bootstrap failed (${res.status})${raw ? `: ${raw.slice(0, 200)}` : ''}`,
    );
  }
  return body.conversation_id;
}

export default function ChatbotWidget() {
  const [mode, setMode] = useState<Mode>('closed');
  const [session, setSession] = useState<PersistedSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // On first mount: hydrate from localStorage and, if we have a
  // conversation_id, verify it's still alive server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = readSession();
      if (!stored) {
        if (!cancelled) setHydrated(true);
        return;
      }
      if (stored.conversationId) {
        try {
          const res = await fetch(
            `/api/chatbot/conversations/${stored.conversationId}`,
            { cache: 'no-store' },
          );
          if (res.ok) {
            const body = (await res.json()) as {
              conversation?: { status?: string };
            };
            // Skip closed conversations — fresh start.
            if (body?.conversation?.status === 'open' && !cancelled) {
              setSession(stored);
              setHydrated(true);
              return;
            }
          }
          // 404 / 410 / 500 — conversation is gone, wipe it.
          clearSession();
        } catch {
          // Network blip. Keep the stored session; if the visitor
          // tries to send a message and the API returns 404, we'll
          // re-create then.
        }
      } else {
        // Have a token but no conversation yet — keep it for the
        // upcoming ensureConversation() call.
        setSession(stored);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openWidget = useCallback(async () => {
    if (!hydrated) return;
    // Already have a live conversation — just open.
    if (session?.conversationId) {
      setMode('open');
      return;
    }
    // No conversation yet — create one (anonymous stub lead server-side).
    setMode('opening');
    const token = session?.visitorToken ?? generateVisitorToken();
    try {
      const conversationId = await ensureConversation(token);
      const next: PersistedSession = { visitorToken: token, conversationId };
      writeSession(next);
      setSession(next);
      setMode('open');
    } catch (err) {
      // Bubble it up to the panel as a fatal error — caller will
      // close and let the visitor click again.
      console.error('[chatbot] failed to open conversation:', err);
      setMode('closed');
    }
  }, [hydrated, session]);

  const closeWidget = useCallback(() => setMode('closed'), []);

  // If the server returns 404/410 mid-chat, drop the conversation and
  // let the next bubble click create a fresh one.
  const handleFatalConversationError = useCallback(() => {
    clearSession();
    setSession((s) => (s ? { visitorToken: s.visitorToken, conversationId: null } : s));
    setMode('closed');
  }, []);

  // Don't render the bubble during SSR — would cause hydration
  // mismatch since localStorage isn't available on the server.
  if (!hydrated) return null;

  return (
    <>
      {mode === 'closed' && (
        <button
          type="button"
          onClick={openWidget}
          aria-label="Open chat"
          className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#2C2C2C] text-white shadow-lg shadow-black/20 transition-transform hover:scale-[1.04] hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#B8956A] focus:ring-offset-2"
          style={{
            right: 'calc(1rem + env(safe-area-inset-right))',
            // Sit above the WhatsApp pill (which is ~56px tall + 16px gap)
            // so the two CTAs don't overlap. Stack at 88px bottom.
            bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
          }}
        >
          <MessageCircle className="h-6 w-6" />
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-3 w-3"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#B8956A] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#B8956A]" />
          </span>
        </button>
      )}

      {mode !== 'closed' && (
        <div
          role="dialog"
          aria-label="Chat with our team"
          aria-modal="false"
          className="fixed z-50 flex flex-col overflow-hidden rounded-md border border-[#D9D4CE] bg-white shadow-2xl shadow-black/30"
          style={{
            right: 'calc(1rem + env(safe-area-inset-right))',
            bottom: 'calc(1rem + env(safe-area-inset-bottom))',
            width: 'min(100vw - 2rem, 380px)',
            height: 'min(80vh, 600px)',
            maxHeight: 'calc(100dvh - 2rem)',
          }}
        >
          {/* Mobile close affordance — small × pinned in the top-right
              for tap targets that don't fit the panel header on phones. */}
          <button
            type="button"
            onClick={closeWidget}
            aria-label="Close chat panel"
            className="absolute right-2 top-2 z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#7A756E] hover:text-[#2C2C2C] sm:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          {mode === 'opening' && (
            <div className="flex flex-1 items-center justify-center text-sm text-[#7A756E]">
              Connecting…
            </div>
          )}
          {mode === 'open' && session?.conversationId && (
            <ChatErrorBoundary onError={handleFatalConversationError}>
              <ChatbotPanel
                conversationId={session.conversationId}
                onClose={closeWidget}
              />
            </ChatErrorBoundary>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Tiny boundary that catches render-time errors and routes the
 * visitor back to the lead gate. We use a class component (RSC-style
 * error boundaries don't exist in React 19 for client trees without
 * `useFormState`).
 */
import { Component, type ReactNode } from 'react';
class ChatErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
