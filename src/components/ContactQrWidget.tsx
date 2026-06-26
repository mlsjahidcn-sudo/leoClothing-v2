'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { MessageCircle, X, Maximize2, Minimize2 } from 'lucide-react';
import { useSiteWhatsApp, formatWhatsAppLink } from '@/lib/site-info';

/**
 * Floating QR widget — renders a fixed-position card at the bottom-left
 * of the contact-us page. Visitors scan it with their phone to open a
 * WhatsApp chat without typing the number.
 *
 * Design:
 *   - Bottom-left to avoid the bottom-right FloatingWhatsApp button.
 *   - Default: collapsed header showing "Scan to chat" + a small
 *     WhatsApp logo. Click to expand into a panel with the full QR.
 *   - Expanded: 240px QR card with the same WhatsApp-logo overlay as
 *     the inquiry page (error-correction H).
 *   - Close (×) collapses the widget; a second × in the header
 *     dismisses it for the session.
 *
 * Hidden when no WhatsApp number is configured — like every other
 * consumer of useSiteWhatsApp().
 */
export default function ContactQrWidget() {
  const { whatsapp } = useSiteWhatsApp();
  const link = formatWhatsAppLink(whatsapp);
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render the QR into the panel imperatively when expanded (or first
  // opened). We re-render on every expand so the SVG matches the
  // panel's current width — and on link change so editing the number
  // in /admin/settings shows up here too.
  useEffect(() => {
    if (!expanded || !link || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const svg = await QRCode.toString(link, {
          type: 'svg',
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 240,
          color: { dark: '#1a1a1a', light: '#ffffff' },
        });
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('width', '240');
          svgEl.setAttribute('height', '240');
          svgEl.setAttribute('aria-label', `WhatsApp QR code linking to ${link}`);
          svgEl.setAttribute('role', 'img');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'QR render failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, link]);

  if (!link || dismissed) return null;

  return (
    <div
      className="fixed z-40 left-4 sm:left-6"
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
      // Stop propagation on the widget itself so clicking it doesn't
      // dismiss any backdrop / overlay logic elsewhere.
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white border border-[#D9D4CE] shadow-xl shadow-black/10 w-[280px] sm:w-[300px]">
        {/* Header — always visible. Click to expand/collapse. The ×
            here collapses (vs. the header ×'s smaller sibling that
            dismisses the whole widget). */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="contact-qr-panel"
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center justify-center w-7 h-7 bg-[#25D366] rounded-full">
            <MessageCircle
              className="w-3.5 h-3.5 text-white"
              fill="white"
              strokeWidth={0}
              aria-hidden="true"
            />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] tracking-[0.15em] uppercase text-gray-500">
              Scan to chat
            </span>
            <span className="block text-xs text-gray-700 truncate">{whatsapp}</span>
          </span>
          {expanded ? (
            <Minimize2 className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
          )}
        </button>

        {/* Panel — collapsible. Rendered conditionally so the QR
            only computes when expanded. */}
        {expanded && (
          <div
            id="contact-qr-panel"
            className="border-t border-[#D9D4CE] px-4 py-5 flex flex-col items-center gap-3"
          >
            <div className="relative" style={{ width: 240, height: 240 }}>
              <div ref={containerRef} className="w-full h-full" />
              {/* WhatsApp logo overlay — keeps the QR scannable
                  thanks to error-correction H. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-14 h-14 rounded-full bg-white shadow-[0_0_0_4px_white] flex items-center justify-center">
                  <MessageCircle
                    className="w-9 h-9 text-[#25D366]"
                    fill="#25D366"
                    strokeWidth={0}
                  />
                </div>
              </div>
            </div>
            {error && (
              <p className="text-xs text-amber-700 text-center">{error}</p>
            )}
            {!error && (
              <p className="text-[11px] text-gray-500 text-center">
                Open your phone camera, point at the code, and tap the WhatsApp link.
              </p>
            )}
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#25D366] hover:text-[#1ebe57] font-medium transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Or click here to chat
            </a>
          </div>
        )}

        {/* Bottom × — dismisses the whole widget for the session. */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss QR widget"
          className="absolute -top-2 -right-2 w-6 h-6 bg-white text-gray-500 hover:text-gray-900 rounded-full shadow-md flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
