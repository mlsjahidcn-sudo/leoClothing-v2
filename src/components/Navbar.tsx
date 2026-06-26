'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Catalog' },
  { href: '/about', label: 'About' },
  { href: '/contact-us', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
      <nav className="mx-auto max-w-7xl px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <span className="font-serif-display text-xl tracking-[0.08em] text-foreground font-semibold">
            CHENGFENG
          </span>
          <span className="hidden sm:inline text-xs tracking-[0.2em] text-muted-foreground uppercase font-light">
            International
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm tracking-[0.06em] transition-colors duration-300 ${
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/inquiry"
            className="inline-flex items-center justify-center px-6 py-2 bg-[#2C2C2C] text-white text-xs tracking-[0.1em] uppercase hover:bg-[#2C2C2C]/90 transition-colors"
          >
            Get Quote
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-4">
          <Link
            href="/inquiry"
            className="inline-flex items-center justify-center px-4 py-1.5 bg-[#2C2C2C] text-white text-[10px] tracking-[0.1em] uppercase"
          >
            Quote
          </Link>
          <button
            className="flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <span
              className={`block w-5 h-px bg-foreground transition-transform duration-300 ${
                mobileOpen ? 'rotate-45 translate-y-[3.5px]' : ''
              }`}
            />
            <span
              className={`block w-5 h-px bg-foreground transition-opacity duration-300 ${
                mobileOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block w-5 h-px bg-foreground transition-transform duration-300 ${
                mobileOpen ? '-rotate-45 -translate-y-[3.5px]' : ''
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background">
          <div className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-sm tracking-[0.06em] py-2 ${
                  pathname === link.href ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/inquiry"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.1em] uppercase"
            >
              Request Quote
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
