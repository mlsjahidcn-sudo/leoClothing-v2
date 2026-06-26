'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { MessageCircle } from 'lucide-react';
import { useSiteWhatsApp, formatWhatsAppLink } from '@/lib/site-info';

/**
 * Renders a scannable QR code that opens a WhatsApp chat to the active
 * admin's number. Hidden if no number is configured.
 *
 * Why client-side:
 *   - The WhatsApp number is editable at runtime via /admin/settings.
 *     Generating the QR server-side would require either invalidating
 *     a cache on every settings save, or storing the rendered QR as a
 *     static asset. Both are heavier than letting the client render it.
 *   - qrcode's `toString` SVG path is ~2KB on the wire and renders in
 *     <50ms. No perceptible FOUC.
 *
 * Visual:
 *   - White card on the inquiry page header / footer.
 *   - 200x200px SVG. WhatsApp green icon overlay in the center mimics
 *     the official "click to chat" QR style (matches the brand color
 *     of the CTA button on the inquiry page).
 *   - Caption: "Scan to chat on WhatsApp" + the number itself.
 */
interface WhatsAppQrProps {
  /** Pixel size of the QR. Defaults to 200. */
  size?: number;
  /** Optional override caption. */
  caption?: string;
  /** When true, hides the number under the QR (e.g. tight layouts). */
  hideNumber?: boolean;
}

export default function WhatsAppQr({
  size = 200,
  caption = 'Scan to chat on WhatsApp',
  hideNumber = false,
}: WhatsAppQrProps) {
  const { whatsapp, loading } = useSiteWhatsApp();
  const link = formatWhatsAppLink(whatsapp);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Render the QR into the div imperatively. We use the `toString`
  // SVG path because it inlines cleanly (no extra HTTP fetch), scales
  // to any size, and lets us style the SVG with our own classes.
  useEffect(() => {
    if (!link || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const svg = await QRCode.toString(link, {
          type: 'svg',
          errorCorrectionLevel: 'H', // H = ~30% — survives a center logo overlay
          margin: 1,
          width: size,
          color: {
            // Brand-black-on-white matches the page palette better than
            // pure #000/#fff and survives ink-saver print.
            dark: '#1a1a1a',
            light: '#ffffff',
          },
        });
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('width', String(size));
          svgEl.setAttribute('height', String(size));
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
  }, [link, size]);

  if (loading || !link) return null;
  if (error) {
    // Soft fallback: render just the link + number so visitors can
    // still reach us even if QR generation fails (very rare).
    return (
      <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
        QR code unavailable. Chat directly:{' '}
        <a href={link} target="_blank" rel="noopener noreferrer" className="underline">
          {whatsapp}
        </a>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-3 p-5 bg-white border border-[#D9D4CE]">
      <div className="relative" style={{ width: size, height: size }}>
        {/* QR is rendered into this div by the effect above. */}
        <div ref={containerRef} className="w-full h-full" />
        {/* WhatsApp logo overlay — positioned dead center using
            absolute + inset-0 + flex centering. Error-correction H
            (≈30%) means the QR stays scannable even with this 56px
            patch covering the middle modules. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-14 h-14 rounded-full bg-white shadow-[0_0_0_4px_white] flex items-center justify-center">
            <MessageCircle className="w-9 h-9 text-[#25D366]" fill="#25D366" strokeWidth={0} />
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/60">{caption}</p>
        {!hideNumber && whatsapp && (
          <p className="text-sm text-[#2C2C2C] mt-1 font-medium">{whatsapp}</p>
        )}
      </div>
    </div>
  );
}
