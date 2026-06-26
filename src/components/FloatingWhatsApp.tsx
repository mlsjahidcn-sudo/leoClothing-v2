'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useSiteWhatsApp, formatWhatsAppLink } from '@/lib/site-info';

/**
 * Site-wide floating WhatsApp CTA.
 *
 * Renders a fixed-position green pill at the bottom-right of every
 * public page. Clicking it opens wa.me in a new tab.
 *
 * Hidden if the admin hasn't configured a WhatsApp number in
 * /admin/settings — the hook returns null and we render nothing.
 *
 * A11y: the button is a real <a> with aria-label; it's keyboard
 * focusable. The badge is decorative (aria-hidden).
 *
 * Positioning: fixed bottom-right with safe-area padding so it doesn't
 * overlap iOS home indicator / Android navigation bar.
 */
export default function FloatingWhatsApp() {
  const { whatsapp } = useSiteWhatsApp();
  const link = formatWhatsAppLink(whatsapp);
  // Dismiss state — let users hide the floating button for the rest
  // of their session without leaving the page. State lives in the
  // component (no localStorage) so a page refresh brings it back,
  // which is the right behavior for a low-urgency marketing CTA.
  const [dismissed, setDismissed] = useState(false);

  if (!link || dismissed) return null;

  return (
    <div
      className="fixed z-40 right-4 sm:right-6 flex flex-col items-end gap-2"
      style={{
        // 16px gap above the safe-area bottom inset (iOS home indicator).
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      {/* Optional dismiss — small × in the corner of the label. Hidden
          until hover/focus on the group so it doesn't compete with
          the CTA itself. */}
      <div className="group relative">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="flex items-center gap-2.5 pl-4 pr-5 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-full shadow-lg shadow-black/20 transition-all hover:scale-[1.02] hover:shadow-xl"
        >
          <span className="relative flex items-center justify-center w-7 h-7 bg-white/20 rounded-full">
            <MessageCircle className="w-4 h-4" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            {/* Tiny pulse dot — purely decorative, signals "live".
                aria-hidden because the parent button already has an
                aria-label. */}
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping"
              aria-hidden="true"
            />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full"
              aria-hidden="true"
            />
          </span>
          <span className="text-sm font-medium tracking-[0.04em]">Chat on WhatsApp</span>
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss WhatsApp button"
          className="absolute -top-2 -right-2 w-6 h-6 bg-white text-gray-500 hover:text-gray-900 rounded-full shadow-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
