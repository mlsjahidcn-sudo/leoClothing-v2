import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import ContactQrWidget from '@/components/ContactQrWidget';
import ContactHero from '@/components/ContactHero';

/**
 * Contact information page. A static RSC shell + a small client island
 * (ContactQrWidget) for the floating QR panel. The hero also fetches
 * the WhatsApp number via a client component (ContactHero) so the
 * primary CTA shows up if a number is configured.
 *
 * The page deliberately lists every contact channel a B2B buyer might
 * need (phone, email, WhatsApp, address, hours) — the inquiry form
 * already handles structured quote requests; this page is for buyers
 * who want to reach out directly.
 */
export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#F5F0EB]">
      {/* Hero */}
      <section className="bg-[#2C2C2C] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-[#B8956A] text-sm tracking-[0.15em] uppercase mb-3">Get in Touch</p>
          <h1
            className="font-serif text-4xl lg:text-5xl text-white mb-4"
            style={{ letterSpacing: '0.02em' }}
          >
            Contact Us
          </h1>
          <p className="text-white/60 text-base max-w-xl">
            Reach our sourcing team directly. We respond to all inquiries within 24 business hours —
            whether you need wholesale pricing, samples, or factory visits.
          </p>
          {/* Primary CTA — WhatsApp. Hidden when no number is set. */}
          <ContactHero />
        </div>
      </section>

      {/* Contact channels */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ContactCard
              icon={<Phone className="w-5 h-5" aria-hidden="true" />}
              label="Phone"
              value="+86 175 7500 1415"
              href="tel:+8617575001415"
              hint="Mon–Sat, 9:00–18:00 GMT+8"
            />
            <ContactCard
              icon={<Mail className="w-5 h-5" aria-hidden="true" />}
              label="Email"
              value="info@chengfenginternational.com"
              href="mailto:info@chengfenginternational.com"
              hint="Replies within 24 business hours"
            />
            <ContactCard
              icon={<MapPin className="w-5 h-5" aria-hidden="true" />}
              label="Address"
              value="Dongguan, Guangdong, China"
              href={null}
              hint="Factory visits by appointment"
            />
            <ContactCard
              icon={<Clock className="w-5 h-5" aria-hidden="true" />}
              label="Working Hours"
              value="Mon–Sat · 9:00–18:00"
              href={null}
              hint="China Standard Time (GMT+8)"
            />
            <ContactCard
              icon={<MessageCircle className="w-5 h-5" aria-hidden="true" />}
              label="WhatsApp"
              value="Quickest reply — scan or click"
              href="/inquiry"
              hint="Live chat during working hours"
            />
            <ContactCard
              icon={<Mail className="w-5 h-5" aria-hidden="true" />}
              label="Quote Request"
              value="Submit a formal inquiry"
              href="/inquiry"
              hint="Best for pricing + bulk orders"
            />
          </div>
        </div>
      </section>

      {/* Map / location placeholder */}
      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="bg-white border border-[#D9D4CE] p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase text-[#B8956A] mb-3">Visit Us</p>
                <h2 className="font-serif text-2xl lg:text-3xl text-[#2C2C2C] mb-3">
                  Factory & Showroom
                </h2>
                <p className="text-[#2C2C2C]/60 text-sm leading-relaxed max-w-md">
                  Schedule a factory tour to see our production lines, quality control, and finished
                  goods warehouse in person. We&apos;re happy to arrange pickup from Guangzhou
                  Baiyun International Airport.
                </p>
                <a
                  href="mailto:info@chengfenginternational.com?subject=Factory%20visit%20request"
                  className="inline-flex items-center justify-center mt-6 px-8 py-3 bg-[#2C2C2C] text-white text-sm tracking-[0.08em] uppercase hover:bg-[#2C2C2C]/90 transition-colors"
                >
                  Request a Visit
                </a>
              </div>
              <div className="relative h-[280px] lg:h-[340px] bg-[#F5F0EB] border border-[#D9D4CE] flex items-center justify-center">
                <div className="text-center px-6">
                  <MapPin className="w-10 h-10 text-[#B8956A] mx-auto mb-3" aria-hidden="true" />
                  <p className="font-serif text-lg text-[#2C2C2C] mb-1">Dongguan, Guangdong</p>
                  <p className="text-sm text-[#2C2C2C]/50">
                    Pearl River Delta · 1 hr from Guangzhou · 1.5 hr from Shenzhen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating QR widget — bottom-left, this page only. */}
      <ContactQrWidget />
    </main>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string | null;
  hint?: string;
}) {
  const inner = (
    <div className="bg-white border border-[#D9D4CE] p-6 h-full transition-colors hover:border-[#B8956A]/50">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-[#B8956A]/10 flex items-center justify-center text-[#B8956A]">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/40 mb-1.5">{label}</p>
          <p className="text-sm text-[#2C2C2C] font-medium break-words">{value}</p>
          {hint && <p className="text-xs text-[#2C2C2C]/40 mt-1.5">{hint}</p>}
        </div>
      </div>
    </div>
  );
  if (!href) return inner;
  return (
    <a href={href} className="block">
      {inner}
    </a>
  );
}
