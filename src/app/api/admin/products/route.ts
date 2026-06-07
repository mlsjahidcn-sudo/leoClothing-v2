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

  let query = supabase
    .from('products')
    .select('*, categories(slug, label), product_images(id, url, sort_order)')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq('categories.slug', category);
  }
  if (active !== null) {
    query = query.eq('is_active', active === 'true');
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
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

  // Insert sub-table rows. Each block is independent — we log and
  // continue so a missing sub-table doesn't lose the product.
  const productId = product.id;
  const childErrors: string[] = [];

  if (data.images?.length) {
    const { error } = await supabase
      .from('product_images')
      .insert(data.images.map((img, i) => ({ product_id: productId, url: img.url, sort_order: img.sort_order ?? i })));
    if (error) childErrors.push(`images: ${error.message}`);
  }
  if (data.bulk_pricing?.length) {
    const { error } = await supabase.from('product_bulk_pricing').insert(
      data.bulk_pricing.map((b) => ({
        product_id: productId,
        min_qty: b.min_qty,
        max_qty: b.max_qty ?? null,
        unit_price: b.unit_price,
      })),
    );
    if (error) childErrors.push(`bulk_pricing: ${error.message}`);
  }
  if (data.colors?.length) {
    const { error } = await supabase.from('product_colors').insert(
      data.colors.map((c) => ({ product_id: productId, name: c.name, hex: c.hex })),
    );
    if (error) childErrors.push(`colors: ${error.message}`);
  }
  if (data.sizes?.length) {
    const { error } = await supabase.from('product_sizes').insert(
      data.sizes.map((s, i) => ({ product_id: productId, size_label: s.size_label, sort_order: s.sort_order ?? i })),
    );
    if (error) childErrors.push(`sizes: ${error.message}`);
  }
  if (data.size_chart?.length) {
    const { error } = await supabase.from('product_size_chart').insert(
      data.size_chart.map((sc) => ({ product_id: productId, ...sc })),
    );
    if (error) childErrors.push(`size_chart: ${error.message}`);
  }
  if (data.materials?.length) {
    const { error } = await supabase.from('product_materials').insert(
      data.materials.map((m) => ({ product_id: productId, ...m })),
    );
    if (error) childErrors.push(`materials: ${error.message}`);
  }
  if (data.design_details?.length) {
    const { error } = await supabase.from('product_design_details').insert(
      data.design_details.map((d, i) => ({ product_id: productId, detail_text: d.detail_text, sort_order: d.sort_order ?? i })),
    );
    if (error) childErrors.push(`design_details: ${error.message}`);
  }
  if (data.certifications?.length) {
    const { error } = await supabase.from('product_certifications').insert(
      data.certifications.map((c) => ({ product_id: productId, cert_name: c.cert_name })),
    );
    if (error) childErrors.push(`certifications: ${error.message}`);
  }

  return NextResponse.json(
    { product, warnings: childErrors.length ? childErrors : undefined },
    { status: 201 },
  );
}
