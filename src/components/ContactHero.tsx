'use client';

import { MessageCircle } from 'lucide-react';
import { useSiteWhatsApp, formatWhatsAppLink } from '@/lib/site-info';

/**
 * Client island for the /contact-us hero. Reads the live WhatsApp
 * number from /api/site-info and renders the green CTA. Hidden if no
 * number is configured.
 *
 * Lives in its own file so the /contact-us page itself can stay a
 * server component (no `"use client"` pollution).
 */
export default function ContactHero() {
  const { whatsapp } = useSiteWhatsApp();
  const link = formatWhatsAppLink(whatsapp);
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 inline-flex items-center gap-2.5 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white text-sm font-medium tracking-[0.04em] transition-colors"
    >
      <MessageCircle className="w-4 h-4" aria-hidden="true" />
      Chat on WhatsApp
    </a>
  );
}
