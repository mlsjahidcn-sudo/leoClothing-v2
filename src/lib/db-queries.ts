import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { Product, Category, BulkPricingTier, SizeMeasurement, ColorOption, ProductCategory } from '@/lib/products';

// Note: supabase-js's per-call type inference (Database['public']['Tables'])
// didn't pick up our manually authored Database shape in 2.95.3 — `data`
// was inferred as `{}[]`. We cast to local row types here instead. If
// we later move to generated types, these casts go away.

// Map DB row to frontend Product type
interface DbProduct {
  id: string;
  name: string;
  series: string;
  sku: string;
  wholesale_price: string;
  moq: number;
  lead_time: string;
  packaging: string;
  description: string;
  care_instructions: string;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  category_id: number;
  categories: { slug: string; label: string } | null;
  product_images: { url: string; sort_order: number }[];
  product_bulk_pricing: { min_qty: number; max_qty: number | null; unit_price: string }[];
  product_colors: { name: string; hex: string }[];
  product_sizes: { size_label: string; sort_order: number }[];
  product_size_chart: { size: string; chest: number; waist: number; hip: number; length: number; sleeve: number }[];
  product_materials: { fabric: string; lining: string; craft: string }[];
  product_design_details: { detail_text: string; sort_order: number }[];
  product_certifications: { cert_name: string }[];
}

// Known category slugs. Used to validate `categories.slug` before
// casting it to the `ProductCategory` union — a missing or unknown
// slug used to silently coerce to 'polos' which is a data-corruption
// foot-gun (a product whose FK got deleted would appear in the Polos
// filter). Now such rows are dropped at the mapper boundary so they
// never reach the UI.
const KNOWN_CATEGORY_SLUGS = new Set<string>([
  'polos', 't-shirts', 'striped-tees', 'knitwear',
]);

export function mapDbProduct(p: DbProduct): Product | null {
  // Drop products whose category is missing or not in the known set.
  // Callers should filter nulls (see getAllProducts below).
  if (!p.categories || !KNOWN_CATEGORY_SLUGS.has(p.categories.slug)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[mapDbProduct] dropping product ${p.id} (${p.name ?? '?'}): ` +
        `unknown or missing category slug "${p.categories?.slug ?? '(null)'}"`,
      );
    }
    return null;
  }
  return {
    id: p.id,
    name: p.name,
    category: p.categories.slug as ProductCategory,
    series: p.series,
    sku: p.sku,
    images: p.product_images?.sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url) || [],
    description: p.description,
    wholesalePrice: parseFloat(p.wholesale_price),
    moq: p.moq,
    bulkPricing: p.product_bulk_pricing?.map((t): BulkPricingTier => ({
      minQty: t.min_qty,
      maxQty: t.max_qty,
      unitPrice: parseFloat(t.unit_price),
    })) || [],
    leadTime: p.lead_time,
    packaging: p.packaging,
    certifications: p.product_certifications?.map((c) => c.cert_name) || [],
    material: p.product_materials?.[0]
      ? {
          fabric: p.product_materials[0].fabric,
          lining: p.product_materials[0].lining,
          craft: p.product_materials[0].craft,
        }
      : { fabric: '', lining: '', craft: '' },
    sizes: p.product_sizes?.sort((a, b) => a.sort_order - b.sort_order).map((s) => s.size_label) || [],
    sizeChart: p.product_size_chart?.map((sc): SizeMeasurement => ({
      size: sc.size,
      chest: sc.chest,
      waist: sc.waist,
      hip: sc.hip,
      length: sc.length,
      sleeve: sc.sleeve,
    })) || [],
    designDetails: p.product_design_details?.sort((a, b) => a.sort_order - b.sort_order).map((d) => d.detail_text) || [],
    careInstructions: p.care_instructions,
    availableColors: p.product_colors?.map((c): ColorOption => ({
      name: c.name,
      hex: c.hex,
    })) || [],
    isNew: p.is_new,
    isFeatured: p.is_featured,
  };
}

interface DbCategory {
  id: number;
  slug: string;
  label: string;
  image: string;
  sort_order: number;
}

function mapDbCategory(c: DbCategory): Category {
  return {
    slug: c.slug,
    label: c.label,
    image: c.image,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return (data as unknown as DbCategory[]).map(mapDbCategory);
}

export async function getAllProducts(options?: {
  category?: string;
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> {
  const client = getSupabaseClient();
  // Note: `categories!inner` is required when filtering on a joined column
  // (PostgREST won't accept `.eq('categories.slug', ...)` on a left join —
  // it silently ignores the filter). The `!inner` forces the join to be
  // required, which exposes the joined row to filtering.
  let query = client
    .from('products')
    .select('*, categories!inner(slug, label), product_images(url, sort_order), product_bulk_pricing(min_qty, max_qty, unit_price), product_colors(name, hex)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (options?.category) {
    query = query.eq('categories.slug', options.category);
  }
  if (options?.featured) {
    query = query.eq('is_featured', true);
  }
  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,sku.ilike.%${options.search}%`);
  }
  if (typeof options?.limit === 'number') {
    const offset = options.offset ?? 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  // mapDbProduct can now return null (unknown / missing category);
  // filter those out so callers only see well-formed products.
  return (data as unknown as DbProduct[])
    .map(mapDbProduct)
    .filter((p): p is Product => p !== null);
}

export async function getProductById(id: string): Promise<Product | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('products')
    .select(`*, categories!inner(slug, label), product_images(url, sort_order), product_bulk_pricing(min_qty, max_qty, unit_price), product_colors(name, hex), product_sizes(size_label, sort_order), product_size_chart(size, chest, waist, hip, length, sleeve), product_materials(fabric, lining, craft), product_design_details(detail_text, sort_order), product_certifications(cert_name)`)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbProduct(data as unknown as DbProduct);
}

export async function getFeaturedProducts(options?: { limit?: number }): Promise<Product[]> {
  return getAllProducts({ featured: true, limit: options?.limit });
}

export async function getProductsByCategory(
  category: string,
  options?: { limit?: number; excludeId?: string },
): Promise<Product[]> {
  // When an excludeId is provided, we fetch limit+1 so the post-filter
  // still has enough rows after removing the current product. Slightly
  // over-fetches in the rare edge case where the current product is in
  // the top N, but saves a round trip vs. a two-step query.
  const wantLimit = options?.limit ?? options?.excludeId ? (options.limit ?? 3) + 1 : undefined;
  const products = await getAllProducts({ category, limit: wantLimit });
  const filtered = options?.excludeId
    ? products.filter((p) => p.id !== options.excludeId)
    : products;
  return options?.limit ? filtered.slice(0, options.limit) : filtered;
}
