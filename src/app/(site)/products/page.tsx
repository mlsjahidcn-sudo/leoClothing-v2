'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import type { Product, Category, CategorySlug } from '@/lib/products';

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as CategorySlug) || 'all';
  const [activeCategory, setActiveCategory] = useState<CategorySlug>(initialCategory);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'moq'>('default');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ])
      .then(([prodData, catData]) => {
        setProducts(prodData.products || []);
        setCategories(catData.categories || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    let result = activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory);

    switch (sortBy) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.wholesalePrice - b.wholesalePrice);
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => b.wholesalePrice - a.wholesalePrice);
        break;
      case 'moq':
        result = [...result].sort((a, b) => a.moq - b.moq);
        break;
    }

    return result;
  }, [activeCategory, sortBy, products]);

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

      {/* Filters */}
      <section className="sticky top-0 z-20 bg-white border-b border-[#D9D4CE]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug as CategorySlug)}
                  className={`px-4 py-2 text-xs tracking-[0.08em] uppercase whitespace-nowrap transition-colors ${
                    activeCategory === cat.slug
                      ? 'bg-[#2C2C2C] text-white'
                      : 'text-[#2C2C2C]/60 hover:text-[#2C2C2C] hover:bg-[#F5F0EB]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {/* Sort */}
            <div className="flex items-center gap-3">
              <span className="text-[#2C2C2C]/40 text-xs tracking-[0.08em] uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-xs text-[#2C2C2C] bg-transparent border border-[#D9D4CE] px-3 py-1.5 focus:outline-none focus:border-[#B8956A]"
              >
                <option value="default">Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="moq">Lowest MOQ</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <p className="text-[#2C2C2C]/40 text-lg">Loading catalog...</p>
            </div>
          ) : (
            <>
              {/* Count */}
              <p className="text-[#2C2C2C]/40 text-sm mb-8">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} available for wholesale
              </p>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-[#2C2C2C]/40 text-lg">No products found in this category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant={index % 5 === 0 ? 'large' : 'standard'}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <p className="text-[#2C2C2C]/40">Loading catalog...</p>
      </main>
    }>
      <ProductsContent />
    </Suspense>
  );
}
