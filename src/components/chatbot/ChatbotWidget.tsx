'use client';

/**
 * Floating chatbot widget — the launcher bubble + panel.
 *
 * Mounts site-wide via (site)/layout.tsx. Three states:
 *   - closed: just the floating bubble (bottom-right, above the
 *     WhatsApp button on larger screens)
 *   - lead-gate: lead capture form (first-time visitors only)
 *   - open: chat panel
 *
 * Rehydration: on mount, we read `localStorage` for an existing
 * conversation_id. If found AND the conversation still exists on the
 * server, we skip the lead gate and reopen the chat at the existing
 * transcript. If the server says the conversation is gone (404), we
 * wipe localStorage and show the gate again.
 *
 * localStorage keys (versioned so we can change shape later):
 *   - cb_v1_visitor_token   — opaque session token
 *   - cb_v1_conversation_id — last conversation UUID
 *   - cb_v1_lead_name       — last contact name (for greeting)
 */
import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import LeadGateForm, { type LeadGatePayload } from './LeadGateForm';
import ChatbotPanel from './ChatbotPanel';

const LS_TOKEN = 'cb_v1_visitor_token';
const LS_CONV = 'cb_v1_conversation_id';
const LS_NAME = 'cb_v1_lead_name';

type Mode = 'closed' | 'gate' | 'open';

interface PersistedSession {
  visitorToken: string;
  conversationId: string | null;
  contactName: string | null;
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
  const conversationId = window.localStorage.getItem(LS_CONV);
  const contactName = window.localStorage.getItem(LS_NAME);
  if (!visitorToken) return null;
  return { visitorToken, conversationId, contactName };
}

function writeSession(session: PersistedSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LS_TOKEN, session.visitorToken);
  if (session.conversationId) {
    window.localStorage.setItem(LS_CONV, session.conversationId);
  } else {
    window.localStorage.removeItem(LS_CONV);
  }
  if (session.contactName) {
    window.localStorage.setItem(LS_NAME, session.contactName);
  } else {
    window.localStorage.removeItem(LS_NAME);
  }
}

function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LS_TOKEN);
  window.localStorage.removeItem(LS_CONV);
  window.localStorage.removeItem(LS_NAME);
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
            // Skip closed conversations — visitor needs to re-open
            // with a fresh lead gate so we attribute the new session.
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
          // re-prompt them then.
        }
      } else {
        // Have a token but no conversation yet — same browser
        // returned, gate them again.
        setSession(stored);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openWidget = useCallback(() => {
    if (!hydrated) return;
    if (session?.conversationId) {
      setMode('open');
    } else {
      setMode('gate');
    }
  }, [hydrated, session]);

  const closeWidget = useCallback(() => setMode('closed'), []);

  const handleLeadSubmit = useCallback(
    async (payload: LeadGatePayload) => {
      const res = await fetch('/api/chatbot/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as {
        conversation_id?: string;
        error?: string;
      };
      if (!res.ok || !body.conversation_id) {
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const next: PersistedSession = {
        visitorToken: payload.visitor_token,
        conversationId: body.conversation_id,
        contactName: payload.contact_person,
      };
      writeSession(next);
      setSession(next);
      setMode('open');
    },
    [],
  );

  // If the server returns 404/410 mid-chat, drop back to gate.
  const handleFatalConversationError = useCallback(() => {
    clearSession();
    setSession(null);
    setMode('gate');
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
          {mode === 'gate' && (
            <LeadGateForm
              visitorToken={session?.visitorToken ?? generateVisitorToken()}
              onSubmit={handleLeadSubmit}
            />
          )}
          {mode === 'open' && session?.conversationId && (
            <ChatErrorBoundary onError={handleFatalConversationError}>
              <ChatbotPanel
                conversationId={session.conversationId}
                contactName={session.contactName ?? undefined}
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
