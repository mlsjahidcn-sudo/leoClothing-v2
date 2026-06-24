import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { mapDbProduct } from '@/lib/db-queries';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.trim();
  const featured = searchParams.get('featured');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '12', 10)));

  const supabase = getServerSupabase();
  // Note: `categories!inner` is REQUIRED when filtering on a joined
  // column (PostgREST silently ignores `.eq('categories.slug', ...)`
  // on a left join — verified empirically on this project, see
  // db-queries.ts). The bare `categories(...)` form is a LEFT JOIN,
  // so the filter below would no-op and every category query would
  // return the full active catalog. Same comment exists in
  // db-queries.ts; keep both in sync.
  let query = supabase
    .from('products')
    .select(
      '*, categories!inner(slug, label), product_images(url, sort_order), product_bulk_pricing(min_qty, max_qty, unit_price), product_colors(name, hex), product_sizes(size_label, sort_order), product_size_chart(size, chest, waist, hip, length, sleeve), product_materials(fabric, lining, craft), product_design_details(detail_text, sort_order), product_certifications(cert_name)',
      { count: 'exact' },
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category) query = query.eq('categories.slug', category);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`,
    );
  }
  if (featured === 'true') query = query.eq('is_featured', true);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products = (data ?? []).map(mapDbProduct);
  return NextResponse.json({
    products,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  });
}
