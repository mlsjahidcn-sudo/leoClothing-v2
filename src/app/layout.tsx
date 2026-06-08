import type { Metadata } from 'next';
import { Inter, Noto_Serif_SC, Playfair_Display } from 'next/font/google';
import './globals.css';

// Self-host the Google Fonts we use via next/font. This:
//   1. Eliminates the render-blocking <link rel="stylesheet"> to
//      fonts.googleapis.com (saves 200-500ms on cold first paint).
//   2. Inlines a preload hint for the actual woff2 files we serve.
//   3. Applies font-display: swap automatically — no FOIT.
//   4. Co-locates font CSS with the page, removing a third-party
//      request entirely.
// `variable` mode exposes a CSS variable so the existing
// var(--font-sans) / var(--font-serif-display) declarations in
// globals.css keep working unchanged.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
  // CN-only subset keeps the payload small; falls back gracefully
  // for non-CN characters (next/font does this automatically).
  preload: false,
});

const SUPABASE_HOST = 'https://spyhznmiyfuijlqciheq.supabase.co';

export const metadata: Metadata = {
  title: {
    default: 'Chengfeng International | Premium Menswear',
    template: '%s | Chengfeng International',
  },
  description:
    'Chengfeng International — Over 20 years of premium menswear excellence. Providing seasonal product development and full-chain services for renowned fashion brands nationwide.',
  keywords: [
    'Chengfeng International',
    'premium menswear',
    'luxury menswear',
    'cashmere coat',
    'bespoke clothing',
    'fashion manufacturing',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${notoSerifSC.variable}`}
    >
      <head>
        {/* Preconnect runs before any HTML/CSS arrives. dns-prefetch
            is the no-TLS fallback. Both are cheap when correct. */}
        <link rel="preconnect" href={SUPABASE_HOST} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={SUPABASE_HOST} />
      </head>
      <body className={`antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
