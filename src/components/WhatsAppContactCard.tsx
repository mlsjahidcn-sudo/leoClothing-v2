'use client';

import { MessageCircle } from 'lucide-react';
import { useSiteWhatsApp, formatWhatsAppLink } from '@/lib/site-info';

/**
 * WhatsApp contact card — same visual chrome as ContactCard in
 * contact-us/page.tsx, but reads the active admin's number from the
 * live site-info API instead of a hardcoded string. Hides itself if
 * no number is configured.
 */
export default function WhatsAppContactCard() {
  const { whatsapp } = useSiteWhatsApp();
  const link = formatWhatsAppLink(whatsapp);
  if (!link) return null;

  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="block">
      <div className="bg-white border border-[#D9D4CE] p-6 h-full transition-colors hover:border-[#B8956A]/50">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-[#B8956A]/10 flex items-center justify-center text-[#B8956A]">
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/40 mb-1.5">
              WhatsApp
            </p>
            <p className="text-sm text-[#2C2C2C] font-medium break-words">{whatsapp}</p>
            <p className="text-xs text-[#2C2C2C]/40 mt-1.5">
              Live chat during working hours
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}
