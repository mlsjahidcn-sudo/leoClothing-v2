'use client';

/**
 * Admin route error boundary.
 *
 * Without this, a thrown error in any /admin/* page (or in a child
 * component) crashes the whole AdminShell layout. The error boundary
 * below keeps the shell mounted so the user can hit "Try again" or
 * navigate elsewhere without losing their session.
 */
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error so we can find it in dev / Sentry-equivalent later.
    // Avoid console.error in production unless you wire up a real reporter.
    console.error('[admin error boundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h2>
      <p className="text-sm text-gray-500 max-w-md mb-4">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
