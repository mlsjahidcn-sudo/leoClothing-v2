import Image from 'next/image';
import Link from 'next/link';
import { getProductsByCategory } from '@/lib/db-queries';
import { getCategoryLabel, type ProductCategory } from '@/lib/products';

/**
 * Related-products block for the product detail page.
 *
 * Extracted into its own server component so the main page can
 * render the product itself in the first stream and let this
 * resolve in a second stream. Without the split, a slow
 * `getProductsByCategory` blocks the whole page from being
 * sent to the browser.
 */
export default async function RelatedProducts({
  category,
  excludeId,
}: {
  category: string;
  excludeId: string;
}) {
  // Server-side limit + exclude so we don't ship the entire category over
  // the wire just to pick 3 of them. See getProductsByCategory for the
  // over-fetch-by-one trick that handles the case where the current
  // product is in the top N.
  const related = await getProductsByCategory(category, {
    limit: 3,
    excludeId,
  });
  if (related.length === 0) return null;

  return (
    <section className="py-12 lg:py-16 bg-[#F5F0EB] border-t border-[#D9D4CE]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2
          className="font-serif text-xl text-[#2C2C2C] mb-8"
          style={{ letterSpacing: '0.04em' }}
        >
          Similar Products
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {related.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group block bg-white border border-[#D9D4CE] hover:border-[#B8956A] transition-colors overflow-hidden"
            >
              <div className="relative h-64 bg-[#EDEBE8] overflow-hidden">
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <p className="text-[#B8956A] text-[10px] tracking-[0.1em] uppercase mb-1">
                  {getCategoryLabel(p.category as ProductCategory)}
                </p>
                <h3 className="font-serif text-sm text-[#2C2C2C] mb-2">{p.name}</h3>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-[#2C2C2C]">From ${p.wholesalePrice.toFixed(2)}/unit</span>
                  <span className="text-[10px] text-[#2C2C2C]/40">MOQ: {p.moq}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
