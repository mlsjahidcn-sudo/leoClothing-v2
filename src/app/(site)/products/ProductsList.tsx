'use client';

/**
 * Client-side sort for the /products page.
 *
 * The page (page.tsx) is a server component that fetches the product
 * list filtered by the `?category=` URL param and passes it here. When
 * the user picks a different category we navigate to a new URL, the RSC
 * re-runs server-side, and a fresh filtered list streams in. The sort
 * dropdown is the only thing that mutates client-side.
 *
 * The product list and active-category highlight are DERIVED directly
 * from props + useSearchParams — never copied into local state. Earlier
 * versions did `useState(initialProducts)` which captured the first
 * server payload forever: category clicks updated the URL and the
 * highlight but the grid stayed on whatever the first page-load returned.
 * That was the "filter is not working" bug.
 */
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import type { Product, Category } from '@/lib/products';

type SortKey = 'default' | 'price-asc' | 'price-desc' | 'moq';

export default function ProductsList({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
  // `initialCategory` is intentionally unused — the URL is the source of
  // truth for the active highlight (see useSearchParams below). Keeping
  // the prop in the signature would silently shadow the URL state.
  initialCategory?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<SortKey>('default');

  // Derive the active category from the URL on every render. Falls back
  // to 'all' when no ?category= is present. This stays in sync with
  // browser back/forward and direct deep links without any local mirror.
  const activeCategory = searchParams.get('category') ?? 'all';

  const filteredProducts = useMemo(() => {
    // The server already filtered by category (it's in the URL). Local
    // sort is the only client-side transform.
    const result = [...initialProducts];
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
        break;
      case 'price-desc':
        result.sort((a, b) => b.wholesalePrice - a.wholesalePrice);
        break;
      case 'moq':
        result.sort((a, b) => a.moq - b.moq);
        break;
    }
    return result;
  }, [initialProducts, sortBy]);

  const handleCategoryClick = (slug: string) => {
    // Update the URL — the server component re-runs with the new
    // ?category= param, the RSC fetch is filtered server-side via the
    // categories!inner join, and the fresh product list streams in as
    // a new `initialProducts` prop. Search-engines see real, indexable
    // URLs for each category.
    const params = new URLSearchParams(searchParams.toString());
    if (slug === 'all') {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
    const query = params.toString();
    router.push(`/products${query ? `?${query}` : ''}`, { scroll: false });
  };

  return (
    <>
      {/* Filters */}
      <section className="sticky top-0 z-20 bg-white border-b border-[#D9D4CE]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => handleCategoryClick(cat.slug)}
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
            <div className="flex items-center gap-3">
              <span className="text-[#2C2C2C]/40 text-xs tracking-[0.08em] uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
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
        </div>
      </section>
    </>
  );
}
