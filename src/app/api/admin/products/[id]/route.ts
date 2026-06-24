import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { productWriteSchema } from '@/lib/validators';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('products')
    .select(`*, categories(slug, label), product_images(id, url, sort_order), product_bulk_pricing(id, min_qty, max_qty, unit_price), product_colors(id, name, hex), product_sizes(id, size_label, sort_order), product_size_chart(id, size, chest, waist, hip, length, sleeve), product_materials(id, fabric, lining, craft), product_design_details(id, detail_text, sort_order), product_certifications(id, cert_name)`)
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  return NextResponse.json({ product: data });
}

export async function PUT(request: NextRequest, { params }: Params) {
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
  const { id } = await params;

  const { error: updateError } = await supabase
    .from('products')
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Sync sub-tables if provided. Each block is independent so a
  // single failure doesn't take down the rest of the update.
  const childErrors: string[] = [];
  if (data.images) {
    const { error: delError } = await supabase.from('product_images').delete().eq('product_id', id);
    if (delError) childErrors.push(`images delete: ${delError.message}`);
    else if (data.images.length) {
      const { error } = await supabase
        .from('product_images')
        .insert(data.images.map((img, i) => ({ product_id: id, url: img.url, sort_order: img.sort_order ?? i })));
      if (error) childErrors.push(`images insert: ${error.message}`);
    }
  }
  if (data.bulk_pricing) {
    const { error: delError } = await supabase.from('product_bulk_pricing').delete().eq('product_id', id);
    if (delError) childErrors.push(`bulk_pricing delete: ${delError.message}`);
    else if (data.bulk_pricing.length) {
      const { error } = await supabase.from('product_bulk_pricing').insert(
        data.bulk_pricing.map((b) => ({ product_id: id, min_qty: b.min_qty, max_qty: b.max_qty ?? null, unit_price: b.unit_price })),
      );
      if (error) childErrors.push(`bulk_pricing insert: ${error.message}`);
    }
  }
  if (data.colors) {
    const { error: delError } = await supabase.from('product_colors').delete().eq('product_id', id);
    if (delError) childErrors.push(`colors delete: ${delError.message}`);
    else if (data.colors.length) {
      const { error } = await supabase.from('product_colors').insert(
        data.colors.map((c) => ({ product_id: id, name: c.name, hex: c.hex })),
      );
      if (error) childErrors.push(`colors insert: ${error.message}`);
    }
  }
  if (data.sizes) {
    const { error: delError } = await supabase.from('product_sizes').delete().eq('product_id', id);
    if (delError) childErrors.push(`sizes delete: ${delError.message}`);
    else if (data.sizes.length) {
      const { error } = await supabase.from('product_sizes').insert(
        data.sizes.map((s, i) => ({ product_id: id, size_label: s.size_label, sort_order: s.sort_order ?? i })),
      );
      if (error) childErrors.push(`sizes insert: ${error.message}`);
    }
  }
  if (data.size_chart) {
    const { error: delError } = await supabase.from('product_size_chart').delete().eq('product_id', id);
    if (delError) childErrors.push(`size_chart delete: ${delError.message}`);
    else if (data.size_chart.length) {
      const { error } = await supabase.from('product_size_chart').insert(
        data.size_chart.map((sc) => ({ product_id: id, ...sc })),
      );
      if (error) childErrors.push(`size_chart insert: ${error.message}`);
    }
  }
  if (data.materials) {
    const { error: delError } = await supabase.from('product_materials').delete().eq('product_id', id);
    if (delError) childErrors.push(`materials delete: ${delError.message}`);
    else if (data.materials.length) {
      const { error } = await supabase.from('product_materials').insert(
        data.materials.map((m) => ({ product_id: id, ...m })),
      );
      if (error) childErrors.push(`materials insert: ${error.message}`);
    }
  }
  if (data.design_details) {
    const { error: delError } = await supabase.from('product_design_details').delete().eq('product_id', id);
    if (delError) childErrors.push(`design_details delete: ${delError.message}`);
    else if (data.design_details.length) {
      const { error } = await supabase.from('product_design_details').insert(
        data.design_details.map((d, i) => ({ product_id: id, detail_text: d.detail_text, sort_order: d.sort_order ?? i })),
      );
      if (error) childErrors.push(`design_details insert: ${error.message}`);
    }
  }
  if (data.certifications) {
    const { error: delError } = await supabase.from('product_certifications').delete().eq('product_id', id);
    if (delError) childErrors.push(`certifications delete: ${delError.message}`);
    else if (data.certifications.length) {
      const { error } = await supabase.from('product_certifications').insert(
        data.certifications.map((c) => ({ product_id: id, cert_name: c.cert_name })),
      );
      if (error) childErrors.push(`certifications insert: ${error.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    warnings: childErrors.length ? childErrors : undefined,
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  // Default is soft-delete (sets is_active=false). Pass ?hard=true to
  // actually remove the row, its sub-table rows, and its storage files.
  // Sub-table rows cascade automatically via the FK `on delete cascade`
  // declared in 0001_init.sql.
  const hard = searchParams.get('hard') === 'true';

  if (!hard) {
    const { data, error } = await auth.supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, is_active')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json({ success: true, mode: 'soft', product: data });
  }

  // Hard delete — gather image paths first so we can clean storage after
  // the DB row goes (we can't read the urls after the cascade fires).
  const { data: images } = await auth.supabase
    .from('product_images')
    .select('url')
    .eq('product_id', id);

  // Extract storage paths from public URLs. The bucket name is fixed
  // and the public URL always has the shape
  //   <host>/storage/v1/object/public/product-images/<path>
  // Anything that doesn't match (e.g. a /products/foo.webp local asset)
  // is skipped — it's not in our bucket.
  const bucketPrefix = '/storage/v1/object/public/product-images/';
  const storagePaths = (images ?? [])
    .map((img) => img.url)
    .filter((u): u is string => typeof u === 'string' && u.includes(bucketPrefix))
    .map((u) => u.split(bucketPrefix)[1]?.split('?')[0])
    .filter((p): p is string => typeof p === 'string' && p.length > 0);

  const { error: deleteError } = await auth.supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Storage cleanup is best-effort — log failures but don't fail the
  // delete. Orphan files are recoverable via a periodic sweep script
  // and aren't worth a 500 to the user. Use the admin client because
  // storage RLS is separate from `products` RLS and we want to remove
  // anything under the product's folder regardless of which admin
  // uploaded it.
  let storageRemoved = 0;
  let storageError: string | undefined;
  if (storagePaths.length) {
    try {
      const { getAdminSupabase } = await import('@/lib/supabase/admin');
      const { error: rmErr, data: rmData } = await getAdminSupabase()
        .storage.from('product-images')
        .remove(storagePaths);
      if (rmErr) storageError = rmErr.message;
      else storageRemoved = rmData?.length ?? 0;
    } catch (e) {
      storageError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    success: true,
    mode: 'hard',
    storageRemoved,
    storageError,
  });
}

// PATCH — partial update. Currently supports only the boolean flags
// (is_active, is_featured, is_new); the full PUT is used for
// everything else. Optimistic UI on the products list calls this
// for the inline "active" toggle.
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: { is_active?: boolean; is_featured?: boolean; is_new?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Whitelist — never let the client write to anything else here.
  const patch: Record<string, boolean> = {};
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
  if (typeof body.is_featured === 'boolean') patch.is_featured = body.is_featured;
  if (typeof body.is_new === 'boolean') patch.is_new = body.is_new;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString() as unknown as boolean;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select('id, is_active, is_featured, is_new, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}
