import Image from 'next/image';
import Link from 'next/link';
import { getFeaturedProducts, getAllCategories } from '@/lib/db-queries';
import ProductCard from '@/components/ProductCard';

// Public catalog changes at most a few times a day. Stale-by-60s is fine
// for a B2B showcase — cuts a Supabase roundtrip on every page view.
export const revalidate = 60;

export default async function HomePage() {
  // Parallelize: two independent Supabase reads shouldn't be serial.
  const [featuredProducts, allCategories] = await Promise.all([
    getFeaturedProducts(),
    getAllCategories(),
  ]);
  const productCategories = allCategories.filter((c) => c.slug !== 'all');

  return (
    <main>
      {/* Hero Section - B2B Manufacturer Focus */}
      <section className="relative bg-[#F5F0EB]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-stretch min-h-[70vh]">
            {/* Left: Text Content */}
            <div className="lg:w-5/12 flex flex-col justify-center py-16 lg:py-24 lg:pr-12">
              <p className="text-[#B8956A] text-sm tracking-[0.15em] uppercase mb-4">
                Premium Menswear Manufacturing
              </p>
              <h1 className="font-serif text-4xl lg:text-5xl xl:text-6xl text-[#2C2C2C] leading-[1.1] mb-6" style={{ letterSpacing: '0.02em' }}>
                Quality Knitwear,<br />
                Made for Your Brand
              </h1>
              <p className="text-[#2C2C2C]/70 text-base lg:text-lg leading-relaxed mb-8 max-w-md">
                Since 1998, we&apos;ve partnered with 60+ brands worldwide, delivering premium knit polos, t-shirts, and sweaters with flexible MOQ and competitive wholesale pricing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-[#2C2C2C] text-white text-sm tracking-[0.08em] uppercase hover:bg-[#2C2C2C]/90 transition-colors"
                >
                  View Product Lines
                </Link>
                <Link
                  href="/inquiry"
                  className="inline-flex items-center justify-center px-8 py-3.5 border border-[#2C2C2C] text-[#2C2C2C] text-sm tracking-[0.08em] uppercase hover:bg-[#2C2C2C] hover:text-white transition-colors"
                >
                  Request Quote
                </Link>
              </div>
            </div>
            {/* Right: Hero Image (transparent background model) */}
            <div className="lg:w-7/12 flex items-end justify-center relative">
              <Image
                src="/hero-model.png"
                alt="Chengfeng International - Premium men's knitwear collection"
                width={1024}
                height={1024}
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="w-full max-w-2xl lg:max-w-3xl h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-[#2C2C2C] py-6">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { value: '20+', label: 'Years Manufacturing' },
              { value: '60+', label: 'Brand Partners' },
              { value: '200+', label: 'Production Team' },
              { value: '50+', label: 'MOQ Units' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[#B8956A] font-serif text-2xl lg:text-3xl">{stat.value}</p>
                <p className="text-white/70 text-xs tracking-[0.1em] uppercase mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Lines - Categories */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#B8956A] text-sm tracking-[0.15em] uppercase mb-3">Product Lines</p>
            <h2 className="font-serif text-3xl lg:text-4xl text-[#2C2C2C]">What We Manufacture</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {productCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group relative h-80 overflow-hidden"
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-end p-6 z-10">
                  <div>
                    <h3 className="font-serif text-xl text-white mb-1" style={{ letterSpacing: '0.04em' }}>
                      {cat.label}
                    </h3>
                    <p className="text-white/70 text-sm tracking-[0.08em] uppercase group-hover:text-white group-hover:translate-x-1 transition-all duration-300">
                      View Collection →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 lg:py-28 bg-[#F5F0EB]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-14">
            <div>
              <p className="text-[#B8956A] text-sm tracking-[0.15em] uppercase mb-3">Wholesale Collection</p>
              <h2 className="font-serif text-3xl lg:text-4xl text-[#2C2C2C]">Featured Products</h2>
            </div>
            <Link
              href="/products"
              className="text-[#B8956A] text-sm tracking-[0.08em] uppercase mt-4 sm:mt-0 hover:underline"
            >
              View All Products →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.slice(0, 6).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                variant={index === 0 ? 'large' : 'standard'}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - B2B Selling Points */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#B8956A] text-sm tracking-[0.15em] uppercase mb-3">Why Partner With Us</p>
            <h2 className="font-serif text-3xl lg:text-4xl text-[#2C2C2C]">Built for Wholesale Success</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'OEM & ODM',
                desc: 'Full-service manufacturing from design to delivery. Custom labels, tags, and packaging available.',
              },
              {
                title: 'Flexible MOQ',
                desc: 'Starting from just 50 units per style. Lower barriers to test new collections with your market.',
              },
              {
                title: 'Quality Control',
                desc: 'In-house QC at every production stage. OEKO-TEX and BSCI certified facilities.',
              },
              {
                title: 'Fast Sampling',
                desc: '7-10 day sample turnaround. Iterate quickly and get to market ahead of your competition.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <h3 className="font-serif text-lg text-[#2C2C2C] mb-3" style={{ letterSpacing: '0.04em' }}>
                  {item.title}
                </h3>
                <p className="text-[#2C2C2C]/60 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-[#2C2C2C]">
        <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl lg:text-4xl text-white mb-4">
            Ready to Source Premium Knitwear?
          </h2>
          <p className="text-white/60 text-base leading-relaxed mb-8">
            Get wholesale pricing, request samples, or discuss your custom manufacturing needs. Our team responds within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/inquiry"
              className="inline-flex items-center justify-center px-10 py-4 bg-[#B8956A] text-white text-sm tracking-[0.1em] uppercase hover:bg-[#A07D55] transition-colors"
            >
              Request a Quote
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center px-10 py-4 border border-white/30 text-white text-sm tracking-[0.1em] uppercase hover:border-white hover:bg-white/10 transition-colors"
            >
              Learn About Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
