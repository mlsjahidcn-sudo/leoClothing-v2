import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/db-queries';
import { getCategoryLabel } from '@/lib/products';
import SizeSelector from '@/components/SizeSelector';
import RelatedProducts from './RelatedProducts';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chengfenginternational.com';

// Product detail changes infrequently; cache for 5 min. Stale-while-revalidate
// means a product edit shows up within 5 min on the public site, which is
// fine for a B2B catalog.
export const revalidate = 300;

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) {
    return { title: 'Product Not Found' };
  }
  const label = getCategoryLabel(product.category);
  const title = `${product.name} — Wholesale ${label} | Chengfeng International`;
  const description = product.description
    ? product.description.slice(0, 160)
    : `Wholesale ${product.name} from Chengfeng International. Premium ${label.toLowerCase()} with MOQ ${product.moq}, tiered bulk pricing, and OEM/ODM services.`;
  const image = product.images[0] ? new URL(product.images[0], SITE_URL).toString() : undefined;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${product.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${product.id}`,
      type: 'website',
      siteName: 'Chengfeng International',
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  // Related products now live in their own async server component so
  // the main product page streams to the browser first, regardless of
  // how slow the related-products query is. See RelatedProducts.tsx.

  const allImages = [...product.images];

  // JSON-LD Product schema — helps Google Shopping and Bing surface the
  // product with price, availability, and brand info directly in search.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.description,
    image: product.images,
    brand: { '@type': 'Brand', name: 'Chengfeng International' },
    category: getCategoryLabel(product.category),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: product.wholesalePrice,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/products/${product.id}`,
      seller: { '@type': 'Organization', name: 'Chengfeng International' },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

    <main className="min-h-screen bg-[#F5F0EB]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#D9D4CE]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-xs text-[#2C2C2C]/40">
            <Link href="/" className="hover:text-[#B8956A] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-[#B8956A] transition-colors">Products</Link>
            <span>/</span>
            <Link href={`/products?category=${product.category}`} className="hover:text-[#B8956A] transition-colors">
              {getCategoryLabel(product.category)}
            </Link>
            <span>/</span>
            <span className="text-[#2C2C2C]/60">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Section */}
      <section className="py-10 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Left: Images */}
            <div>
              {/* Main Image */}
              <div className="relative h-[500px] lg:h-[640px] bg-[#EDEBE8] overflow-hidden mb-4">
                <Image
                  src={allImages[0]}
                  alt={product.name}
                  fill
                  className="object-cover object-top"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {product.isNew && (
                  <span className="absolute top-4 left-4 bg-[#B8956A] text-white text-[10px] tracking-[0.1em] uppercase px-3 py-1.5">
                    New Arrival
                  </span>
                )}
              </div>
              {/* Thumbnail Row */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {allImages.slice(0, 4).map((img, index) => (
                    <div key={index} className="relative h-24 bg-[#EDEBE8] overflow-hidden cursor-pointer border border-[#D9D4CE] hover:border-[#B8956A] transition-colors">
                      <Image
                        src={img}
                        alt={`${product.name} view ${index + 1}`}
                        fill
                        className="object-cover object-top"
                        sizes="120px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="lg:py-4">
              <p className="text-[#B8956A] text-xs tracking-[0.15em] uppercase mb-2">
                {getCategoryLabel(product.category)} · {product.series}
              </p>
              <h1 className="font-serif text-3xl lg:text-4xl text-[#2C2C2C] mb-3" style={{ letterSpacing: '0.02em' }}>
                {product.name}
              </h1>
              <p className="text-[#2C2C2C]/50 text-sm mb-6">{product.description}</p>

              {/* Wholesale Price & MOQ */}
              <div className="bg-white border border-[#D9D4CE] p-6 mb-6">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Wholesale Price</p>
                    <span className="text-2xl text-[#2C2C2C] font-medium">From ${product.wholesalePrice.toFixed(2)}</span>
                    <span className="text-[#2C2C2C]/40 text-sm ml-1">/unit</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Minimum Order</p>
                    <span className="text-lg text-[#B8956A] font-medium">{product.moq} units</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#2C2C2C]/50">
                  <span>Lead time: {product.leadTime}</span>
                  <span className="text-[#D9D4CE]">|</span>
                  <span>SKU: {product.sku}</span>
                </div>
              </div>

              {/* Bulk Pricing Tiers */}
              <div className="bg-white border border-[#D9D4CE] p-6 mb-6">
                <h3 className="font-serif text-base text-[#2C2C2C] mb-4" style={{ letterSpacing: '0.04em' }}>
                  Volume Pricing
                </h3>
                <div className="space-y-0">
                  {product.bulkPricing.map((tier, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between py-3 ${
                        index !== product.bulkPricing.length - 1 ? 'border-b border-[#D9D4CE]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#2C2C2C]">
                          {tier.minQty}{tier.maxQty ? `–${tier.maxQty}` : '+'} units
                        </span>
                        {index === product.bulkPricing.length - 1 && (
                          <span className="text-[10px] tracking-[0.08em] uppercase bg-[#B8956A]/10 text-[#B8956A] px-2 py-0.5">
                            Best Value
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-[#2C2C2C]">
                        ${tier.unitPrice.toFixed(2)}/unit
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Colors */}
              {product.availableColors.length > 0 && (
                <div className="bg-white border border-[#D9D4CE] p-6 mb-6">
                  <h3 className="font-serif text-base text-[#2C2C2C] mb-4" style={{ letterSpacing: '0.04em' }}>
                    Available Colors
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {product.availableColors.map((color) => (
                      // Key by name + hex so two rows with the same name
                      // but different hex codes (e.g. two shades the admin
                      // labeled "Navy") don't collide on React keys.
                      <div key={`${color.name}-${color.hex}`} className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full border border-[#D9D4CE]"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-xs text-[#2C2C2C]/60">{color.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Sizes */}
              <SizeSelector sizes={product.sizes} sizeChart={product.sizeChart} />

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link
                  href="/inquiry"
                  className="flex-1 inline-flex items-center justify-center px-6 py-3.5 bg-[#2C2C2C] text-white text-sm tracking-[0.08em] uppercase hover:bg-[#2C2C2C]/90 transition-colors"
                >
                  Request Quote
                </Link>
                {/*
                  Request Sample goes to email, not the RFQ form. The two
                  are different intents — a sample request is a free
                  individual unit to evaluate fit and finish, while an
                  RFQ is a wholesale price negotiation. Sending "sample"
                  clicks to the wholesale form gave the wrong impression.
                */}
                <a
                  href={`mailto:info@chengfenginternational.com?subject=${encodeURIComponent(`Sample request: ${product.name} (${product.sku})`)}`}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3.5 border border-[#B8956A] text-[#B8956A] text-sm tracking-[0.08em] uppercase hover:bg-[#B8956A] hover:text-white transition-colors"
                >
                  Request Sample
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specifications & Details */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Material & Craft */}
            <div>
              <h2 className="font-serif text-lg text-[#2C2C2C] mb-4" style={{ letterSpacing: '0.04em' }}>
                Material & Craft
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Fabric</p>
                  <p className="text-sm text-[#2C2C2C]">{product.material.fabric}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Lining</p>
                  <p className="text-sm text-[#2C2C2C]">{product.material.lining}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Craft</p>
                  <p className="text-sm text-[#2C2C2C]">{product.material.craft}</p>
                </div>
              </div>
            </div>

            {/* Design Details */}
            <div>
              <h2 className="font-serif text-lg text-[#2C2C2C] mb-4" style={{ letterSpacing: '0.04em' }}>
                Design Details
              </h2>
              <ul className="space-y-2">
                {product.designDetails.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-[#2C2C2C]">
                    <span className="text-[#B8956A] mt-1.5 text-[6px]">●</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            {/* Production & Logistics */}
            <div>
              <h2 className="font-serif text-lg text-[#2C2C2C] mb-4" style={{ letterSpacing: '0.04em' }}>
                Production Info
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Minimum Order</p>
                  <p className="text-sm text-[#2C2C2C]">{product.moq} units per color/style</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Lead Time</p>
                  <p className="text-sm text-[#2C2C2C]">{product.leadTime}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Packaging</p>
                  <p className="text-sm text-[#2C2C2C]">{product.packaging}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[#2C2C2C]/40 mb-1">Certifications</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.certifications.map((cert) => (
                      <span key={cert} className="text-[10px] tracking-[0.08em] uppercase bg-[#F5F0EB] text-[#2C2C2C]/60 px-2.5 py-1">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Care Instructions */}
      <section className="py-10 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="font-serif text-lg text-[#2C2C2C] mb-3" style={{ letterSpacing: '0.04em' }}>
            Care Instructions
          </h2>
          <p className="text-sm text-[#2C2C2C]/60 max-w-xl">{product.careInstructions}</p>
        </div>
      </section>

      {/* Related Products — streams in independently so a slow
          `getProductsByCategory` doesn't block the main product
          page from being sent to the browser. The skeleton keeps
          the layout stable so there's no CLS shift. */}
      <Suspense
        fallback={
          <section className="py-12 lg:py-16 bg-[#F5F0EB] border-t border-[#D9D4CE]">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="h-6 w-48 bg-[#D9D4CE] rounded mb-8 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-[#D9D4CE] overflow-hidden">
                    <div className="h-64 bg-[#EDEBE8] animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 w-16 bg-[#EDEBE8] rounded animate-pulse" />
                      <div className="h-4 w-3/4 bg-[#EDEBE8] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        }
      >
        <RelatedProducts category={product.category} excludeId={product.id} />
      </Suspense>
    </main>
    </>
  );
}
