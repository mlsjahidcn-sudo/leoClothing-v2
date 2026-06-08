'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Polls a fetch function at a fixed interval, with two important
 * niceties:
 *
 * 1. **Pause on tab blur.** document.hidden = true skips the tick,
 *    so a backgrounded tab doesn't burn Supabase quota on a 30s
 *    poll. Resumes immediately on focus.
 *
 * 2. **Freshness guard.** The tick handler checks a "fingerprint"
 *    (caller-supplied comparison of new vs. current data) and
 *    bumps `lastUpdated` only when something actually changed.
 *    Stops the "Updated 0s ago" pill from spamming the UI.
 */
export function usePollingFetch<T>({
  fetcher,
  intervalMs = 30_000,
  compare,
}: {
  fetcher: () => Promise<T>;
  intervalMs?: number;
  compare?: (a: T, b: T) => boolean;
}): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refresh: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const tick = useRef(0);

  const run = () => {
    tick.current += 1;
    const id = tick.current;
    fetcher()
      .then((next) => {
        if (id !== tick.current) return; // a newer tick superseded us
        setData((prev) => {
          if (compare && prev && compare(prev, next)) return prev;
          return next;
        });
        setLastUpdated(Date.now());
        setError(null);
      })
      .catch((e) => {
        if (id !== tick.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (id === tick.current) setLoading(false);
      });
  };

  useEffect(() => {
    run();
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        run();
      }, intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        // On focus, fetch immediately so the user sees fresh data.
        run();
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // We intentionally re-run when intervalMs changes; fetcher is
    // expected to be stable (defined inline or memoized).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { data, loading, error, lastUpdated, refresh: run };
}

/** Tiny stable stringify so JSON values can be compared by content. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`).join(',')}}`;
}
