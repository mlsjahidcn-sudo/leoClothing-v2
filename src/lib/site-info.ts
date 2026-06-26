/**
 * Client-side helpers for the public `/api/site-info` endpoint.
 *
 * The endpoint returns `{ whatsapp: string | null }` sourced from the
 * active admin's profile. Used by the inquiry page WhatsApp CTA and the
 * footer contact line.
 *
 * Both `formatWhatsAppLink` and the `useSiteWhatsApp` hook are pure
 * browser-side — no server context. The hook is intentionally minimal
 * (no SWR, no React Query): the site has very few readers and the
 * data is small + stable for at least 60s thanks to the server's
 * Cache-Control header.
 */
'use client';

import { useEffect, useState } from 'react';

interface SiteInfo {
  whatsapp: string | null;
}

/**
 * Convert a raw phone string into a `https://wa.me/<digits>` link.
 *
 * Strips everything except digits. WhatsApp's deep link accepts only
 * the international format with country code, no `+`, no spaces,
 * no punctuation. Returns null if the result doesn't look like a
 * usable number (less than 5 digits — the country-code-only minimum).
 *
 * Pass-through null if input is null/empty.
 */
export function formatWhatsAppLink(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 5) return null;
  return `https://wa.me/${digits}`;
}

/**
 * Fetch the public site info (WhatsApp number, etc.) once on mount.
 * Returns `{ whatsapp, loading }` — `whatsapp` is null while loading
 * OR if the API returned null / errored.
 */
export function useSiteWhatsApp(): { whatsapp: string | null; loading: boolean } {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/site-info', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as SiteInfo;
        if (!cancelled) setWhatsapp(body.whatsapp ?? null);
      } catch {
        // Swallow — the UI gracefully hides the WhatsApp CTA when null.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { whatsapp, loading };
}
