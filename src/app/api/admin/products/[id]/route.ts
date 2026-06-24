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

  // Sync sub-tables in parallel. Each sub-table still does its own
  // delete-then-insert sequence (the delete is a precondition for the
  // insert — re-inserting without clearing would conflict on the
  // implicit uniqueness assumptions the form relies on), but unrelated
  // sub-tables now fan out. Was 16 sequential round trips; now 8 in
  // parallel = 1 wall-clock RTT.
  const syncSubTable = async (
    tableName: string,
    rows: ReadonlyArray<Record<string, unknown>> | undefined,
    mapRow: (row: Record<string, unknown>, index: number) => Record<string, unknown>,
  ): Promise<string[]> => {
    if (!rows) return [];
    const errors: string[] = [];
    const { error: delError } = await supabase.from(tableName).delete().eq('product_id', id);
    if (delError) {
      errors.push(`${tableName} delete: ${delError.message}`);
      return errors;
    }
    if (!rows.length) return errors;
    // Cast through `never` to bypass the per-table typed insert. The
    // `tableName` is a string parameter here (we removed the union
    // constraint to allow the helper to be shared across all 8 sub-
    // tables), but each call site's `mapRow` returns the right shape
    // for the corresponding table — see the call sites below.
    const payload = rows.map((r, i) => ({ product_id: id, ...mapRow(r, i) })) as never;
    const { error: insError } = await supabase.from(tableName).insert(payload as never);
    if (insError) errors.push(`${tableName} insert: ${insError.message}`);
    return errors;
  };

  const childErrorsNested = await Promise.all([
    syncSubTable('product_images', data.images as ReadonlyArray<Record<string, unknown>> | undefined, (r, i) => ({
      url: r.url,
      sort_order: (r.sort_order as number | undefined) ?? i,
    })),
    syncSubTable('product_bulk_pricing', data.bulk_pricing as ReadonlyArray<Record<string, unknown>> | undefined, (r) => ({
      min_qty: r.min_qty,
      max_qty: (r.max_qty as number | null | undefined) ?? null,
      unit_price: r.unit_price,
    })),
    syncSubTable('product_colors', data.colors as ReadonlyArray<Record<string, unknown>> | undefined, (r) => ({
      name: r.name,
      hex: r.hex,
    })),
    syncSubTable('product_sizes', data.sizes as ReadonlyArray<Record<string, unknown>> | undefined, (r, i) => ({
      size_label: r.size_label,
      sort_order: (r.sort_order as number | undefined) ?? i,
    })),
    syncSubTable('product_size_chart', data.size_chart as ReadonlyArray<Record<string, unknown>> | undefined, (r) => ({
      size: r.size,
      chest: r.chest,
      waist: r.waist,
      hip: r.hip,
      length: r.length,
      sleeve: r.sleeve,
    })),
    syncSubTable('product_materials', data.materials as ReadonlyArray<Record<string, unknown>> | undefined, (r) => ({
      fabric: r.fabric,
      lining: r.lining,
      craft: r.craft,
    })),
    syncSubTable('product_design_details', data.design_details as ReadonlyArray<Record<string, unknown>> | undefined, (r, i) => ({
      detail_text: r.detail_text,
      sort_order: (r.sort_order as number | undefined) ?? i,
    })),
    syncSubTable('product_certifications', data.certifications as ReadonlyArray<Record<string, unknown>> | undefined, (r) => ({
      cert_name: r.cert_name,
    })),
  ]);
  const childErrors = childErrorsNested.flat();

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
  // Type widened to allow the timestamp update we always append.
  const patch: Record<string, boolean | string> = {};
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
  if (typeof body.is_featured === 'boolean') patch.is_featured = body.is_featured;
  if (typeof body.is_new === 'boolean') patch.is_new = body.is_new;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

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
