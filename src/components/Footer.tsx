import Link from 'next/link';
import FooterWhatsApp from '@/components/FooterWhatsApp';
import WhatsAppQr from '@/components/WhatsAppQr';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-serif-display text-lg tracking-[0.08em] font-semibold">
              CHENGFENG
            </h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Premium menswear manufacturer since 1998. OEM/ODM services for global brands and retailers.
            </p>
          </div>

          {/* Sourcing */}
          <div>
            <h4 className="text-sm font-medium tracking-[0.06em] mb-4">Sourcing</h4>
            <ul className="space-y-3">
              {[
                { href: '/products', label: 'Product Catalog' },
                { href: '/inquiry', label: 'Request Quote' },
                { href: '/about', label: 'Factory & Capabilities' },
                { href: '/contact-us', label: 'Contact Us' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trade Info */}
          <div>
            <h4 className="text-sm font-medium tracking-[0.06em] mb-4">Trade Terms</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>FOB / CIF / EXW</li>
              <li>Payment: T/T, L/C</li>
              <li>MOQ from 50 units</li>
              <li>Lead time: 15-25 days</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-medium tracking-[0.06em] mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Tel: +86 175 7500 1415</li>
              <li>Email: info@chengfenginternational.com</li>
              {/* Client island — renders only when the admin has set a
                  WhatsApp number in /admin/settings. Hidden otherwise. */}
              <FooterWhatsApp />
              <li>Address: Dongguan, Guangdong, China</li>
            </ul>
            {/* Compact QR — 140px fits a single footer column on
                desktop without forcing a row wrap. Caption is hidden
                (the line above already names WhatsApp) and the number
                is hidden too (it's the line just above). */}
            <div className="mt-5">
              <WhatsAppQr size={140} caption="Scan to chat" hideNumber />
            </div>
          </div>
        </div>

        {/* Certifications bar */}
        <div className="mt-12 pt-8 border-t border-border/60">
          <div className="flex flex-wrap gap-6 justify-center mb-6">
            {['BSCI Audited', 'OEKO-TEX Certified', 'ISO 9001', 'Alibaba Verified'].map((cert) => (
              <span key={cert} className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground border border-border/60 px-3 py-1">
                {cert}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; 2025 Chengfeng International. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground tracking-wider">
              CRAFTED WITH PRECISION
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
