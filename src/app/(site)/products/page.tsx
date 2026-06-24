import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllProducts, getAllCategories } from '@/lib/db-queries';
import { getCategoryLabel } from '@/lib/products';
import ProductsList from './ProductsList';

// Public catalog: serve from cache, re-fetch in the background every
// 60s. Means a product edit shows up within a minute on the public
// site; cuts a Supabase hit per pageview.
export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chengfenginternational.com';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { category } = await searchParams;
  const label = category && category !== 'all' ? getCategoryLabel(category) : null;
  const title = label
    ? `${label} Wholesale — Premium Knitwear for B2B Brands | Chengfeng International`
    : 'Wholesale Catalog — Premium Knitwear for B2B Brands | Chengfeng International';
  const description = label
    ? `Browse our ${label.toLowerCase()} wholesale collection. Premium menswear with flexible MOQ, tiered pricing, and OEM/ODM services for fashion brands worldwide.`
    : 'Browse our full wholesale catalog of premium knitwear. Knit polos, t-shirts, striped tees, and knitwear with flexible MOQ, tiered pricing, and OEM/ODM services for fashion brands worldwide.';
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products${category ? `?category=${category}` : ''}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products${category ? `?category=${category}` : ''}`,
      type: 'website',
      siteName: 'Chengfeng International',
    },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  // Server-side fetch. RSC streams the layout + header immediately and
  // fills in the grid as soon as Supabase returns.
  const [products, categories] = await Promise.all([
    getAllProducts({ category }),
    getAllCategories(),
  ]);

  return (
    <main className="min-h-screen bg-[#F5F0EB]">
      {/* Header */}
      <section className="bg-[#2C2C2C] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-[#B8956A] text-sm tracking-[0.15em] uppercase mb-3">Wholesale Catalog</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-white mb-4" style={{ letterSpacing: '0.02em' }}>
            Product Lines
          </h1>
          <p className="text-white/60 text-base max-w-xl">
            Browse our full collection of premium knitwear. All products available for wholesale with flexible MOQ and tiered pricing.
          </p>
        </div>
      </section>

      <Suspense fallback={null}>
        <ProductsList initialProducts={products} categories={categories} />
      </Suspense>

      {/* CTA */}
      <section className="py-12 bg-white border-t border-[#D9D4CE]">
        <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
          <p className="text-[#2C2C2C]/60 text-sm mb-4">
            Need custom specifications or larger volume? We offer OEM/ODM services with flexible terms.
          </p>
          <a
            href="/inquiry"
            className="inline-flex items-center justify-center px-8 py-3 bg-[#2C2C2C] text-white text-sm tracking-[0.08em] uppercase hover:bg-[#2C2C2C]/90 transition-colors"
          >
            Request Custom Quote
          </a>
        </div>
      </section>
    </main>
  );
}
