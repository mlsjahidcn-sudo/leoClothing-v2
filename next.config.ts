import type { NextConfig } from 'next';

const SUPABASE_HOST = 'spyhznmiyfuijlqciheq.supabase.co';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site'],

  // Tell next/image to serve AVIF (best compression, Safari 16+)
  // and fall back to WebP (universal). Cuts product image payloads
  // ~30% vs JPG. Local /public images are still served — the
  // formats directive applies to <Image> at request time.
  images: {
    formats: ['image/avif', 'image/webp'],
    // Was { hostname: '*' } which worked but was dangerously broad.
    // Tightened to Supabase storage only — that's the only remote
    // image source. Add more hosts here as they appear.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: SUPABASE_HOST,
        pathname: '/storage/**',
      },
    ],
  },

  // Apply cache + security headers to every response. Vercel sets
  // these automatically, but if you ever self-host (Railway, Fly,
  // a bare Node process) you'd otherwise have to re-implement them
  // at the proxy layer. Doing it here means the dev server gets
  // them too, which keeps perf measurements honest.
  async headers() {
    const SECURITY = [
      // Stop browsers from MIME-sniffing a response away from the
      // declared Content-Type. Cheap win, doesn't break anything.
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Block clickjacking on the admin pages.
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    return [
      // Long cache for hashed Next assets (/_next/static/*).
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Hashed fonts and images in /public get the same treatment.
      {
        source: '/products/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.woff2',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public catalog APIs (no auth required) get a 5-minute cache + 1-minute
      // SWR window. Catalog data is server-rendered and revalidated every
      // 60s anyway; this just lets CDN edge nodes hold onto it briefly.
      // Admin APIs (under /api/admin/*) get no-store so a stale session
      // token can't leak across cache boundaries.
      {
        source: '/api/products/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=60' }],
      },
      {
        source: '/api/categories/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=60' }],
      },
      {
        source: '/api/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      // Anything else under /api/ (e.g. /api/rfqs) is also no-store.
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      // Site-wide security baseline.
      { source: '/(.*)', headers: SECURITY },
    ];
  },

  // Compress responses. Vercel + most Node hosts do this by default;
  // this ensures the dev server and any self-hosted deploy also gzip.
  // (next start in standalone mode uses node's built-in compression
  // when this flag is on.)
  compress: true,

  // React strict mode in dev is fine; in prod it would double-render
  // for every request. Keep at default (prod = off, dev = on).
  reactStrictMode: true,
};

export default nextConfig;
