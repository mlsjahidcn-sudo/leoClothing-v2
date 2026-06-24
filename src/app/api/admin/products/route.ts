import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { productWriteSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { supabase } = auth;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();
  const category = searchParams.get('category');
  const active = searchParams.get('active');
  // Pagination — defaults to 50/page, max 200. Without this the API
  // returned the full table on every request, which is fine for 12 products
  // but will choke the moment the catalog hits a few hundred.
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  // `categories!inner` is required when filtering on a joined column
  // (PostgREST silently ignores .eq() on a left join).
  let query = supabase
    .from('products')
    .select('*, categories!inner(slug, label), product_images(id, url, sort_order)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq('categories.slug', category);
  }
  if (active !== null) {
    query = query.eq('is_active', active === 'true');
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data, total: count ?? undefined, limit, offset });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = productWriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid product payload', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const { supabase } = auth;

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name: data.name,
      series: data.series ?? null,
      sku: data.sku,
      category_id: data.category_id,
      wholesale_price: data.wholesale_price,
      moq: data.moq,
      lead_time: data.lead_time ?? null,
      packaging: data.packaging ?? null,
      description: data.description ?? null,
      care_instructions: data.care_instructions ?? null,
      is_new: data.is_new,
      is_featured: data.is_featured,
      is_active: data.is_active,
    })
    .select('id')
    .single();

  if (productError || !product) {
    return NextResponse.json(
      { error: productError?.message ?? 'Failed to create product' },
      { status: 500 },
    );
  }

  // Insert sub-table rows in parallel. Each block is independent — we
  // log and continue so a missing sub-table doesn't lose the product,
  // and Promise.all drops the wall-clock time from O(N×RTT) to O(RTT).
  const productId = product.id;
  const childResults = await Promise.all([
    data.images?.length
      ? supabase
          .from('product_images')
          .insert(data.images.map((img, i) => ({ product_id: productId, url: img.url, sort_order: img.sort_order ?? i })))
          .then(({ error }) => (error ? `images: ${error.message}` : null))
      : null,
    data.bulk_pricing?.length
      ? supabase
          .from('product_bulk_pricing')
          .insert(
            data.bulk_pricing.map((b) => ({
              product_id: productId,
              min_qty: b.min_qty,
              max_qty: b.max_qty ?? null,
              unit_price: b.unit_price,
            })),
          )
          .then(({ error }) => (error ? `bulk_pricing: ${error.message}` : null))
      : null,
    data.colors?.length
      ? supabase
          .from('product_colors')
          .insert(data.colors.map((c) => ({ product_id: productId, name: c.name, hex: c.hex })))
          .then(({ error }) => (error ? `colors: ${error.message}` : null))
      : null,
    data.sizes?.length
      ? supabase
          .from('product_sizes')
          .insert(
            data.sizes.map((s, i) => ({ product_id: productId, size_label: s.size_label, sort_order: s.sort_order ?? i })),
          )
          .then(({ error }) => (error ? `sizes: ${error.message}` : null))
      : null,
    data.size_chart?.length
      ? supabase
          .from('product_size_chart')
          .insert(data.size_chart.map((sc) => ({ product_id: productId, ...sc })))
          .then(({ error }) => (error ? `size_chart: ${error.message}` : null))
      : null,
    data.materials?.length
      ? supabase
          .from('product_materials')
          .insert(data.materials.map((m) => ({ product_id: productId, ...m })))
          .then(({ error }) => (error ? `materials: ${error.message}` : null))
      : null,
    data.design_details?.length
      ? supabase
          .from('product_design_details')
          .insert(
            data.design_details.map((d, i) => ({
              product_id: productId,
              detail_text: d.detail_text,
              sort_order: d.sort_order ?? i,
            })),
          )
          .then(({ error }) => (error ? `design_details: ${error.message}` : null))
      : null,
    data.certifications?.length
      ? supabase
          .from('product_certifications')
          .insert(data.certifications.map((c) => ({ product_id: productId, cert_name: c.cert_name })))
          .then(({ error }) => (error ? `certifications: ${error.message}` : null))
      : null,
  ]);
  const childErrors = childResults.filter((e): e is string => typeof e === 'string');

  return NextResponse.json(
    { product, warnings: childErrors.length ? childErrors : undefined },
    { status: 201 },
  );
}
