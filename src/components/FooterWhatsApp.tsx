'use client';

import { MessageCircle } from 'lucide-react';
import { useSiteWhatsApp, formatWhatsAppLink } from '@/lib/site-info';

/**
 * Renders the WhatsApp contact line in the footer. Returns null if the
 * admin hasn't set a number yet (so the footer still renders the rest of
 * its content cleanly).
 *
 * Uses lucide-react's MessageCircle icon to match the brand mark used
 * in the inquiry page CTA.
 */
export default function FooterWhatsApp() {
  const { whatsapp: siteWhatsApp } = useSiteWhatsApp();
  const link = formatWhatsAppLink(siteWhatsApp);
  if (!link) return null;
  return (
    <li>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
        WhatsApp: {siteWhatsApp}
      </a>
    </li>
  );
}
