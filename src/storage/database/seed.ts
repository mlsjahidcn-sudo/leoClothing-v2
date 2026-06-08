import { getAdminSupabase } from '@/lib/supabase/admin';
import { products } from '@/lib/product-data';

async function seed() {
  const client = getAdminSupabase();

  // 1. Insert categories
  const categoryData = [
    { slug: 'polos', label: 'Knit Polos', image: '/products/polo-navy.webp', sort_order: 1 },
    { slug: 't-shirts', label: 'T-Shirts', image: '/products/tee-brown.webp', sort_order: 2 },
    { slug: 'striped-tees', label: 'Striped Tees', image: '/products/tee-stripe-grey.webp', sort_order: 3 },
    { slug: 'knitwear', label: 'Knitwear', image: '/products/sweater-white.webp', sort_order: 4 },
  ];

  const { data: insertedCategories, error: catError } = await client
    .from('categories')
    .upsert(categoryData, { onConflict: 'slug' })
    .select();
  if (catError) throw new Error(`Failed to seed categories: ${catError.message}`);

  const categoryMap: Record<string, number> = {};
  for (const c of (insertedCategories ?? []) as Array<{ id: number; slug: string }>) {
    categoryMap[c.slug] = c.id;
  }

  // 2. Insert products + related data
  for (const p of products) {
    // `p.category` is already a slug like 'polos', 't-shirts', etc. —
    // matches the keys we just inserted into `categories`.
    const categoryId = categoryMap[p.category];
    if (!categoryId) {
      console.warn(`Skipping product ${p.id}: no category for ${p.category}`);
      continue;
    }

    const { data: insertedProduct, error: prodError } = await client
      .from('products')
      .upsert(
        {
          id: p.id,
          name: p.name,
          category_id: categoryId,
          series: p.series,
          sku: p.sku,
          wholesale_price: p.wholesalePrice.toString(),
          moq: p.moq,
          lead_time: p.leadTime,
          packaging: p.packaging,
          description: p.description,
          care_instructions: p.careInstructions,
          is_new: p.isNew,
          is_featured: p.isFeatured,
          is_active: true,
        },
        { onConflict: 'id' }
      )
      .select('id')
      .maybeSingle();
    if (prodError) throw new Error(`Failed to insert product ${p.id}: ${prodError.message}`);
    if (!insertedProduct) continue;

    const productId = (insertedProduct as { id: string }).id;

    // Replace child rows cleanly: delete and re-insert. Idempotent when
    // re-run because we always tear down by product_id first.
    await client.from('product_images').delete().eq('product_id', productId);
    await client.from('product_bulk_pricing').delete().eq('product_id', productId);
    await client.from('product_colors').delete().eq('product_id', productId);
    await client.from('product_sizes').delete().eq('product_id', productId);
    await client.from('product_size_chart').delete().eq('product_id', productId);
    await client.from('product_materials').delete().eq('product_id', productId);
    await client.from('product_design_details').delete().eq('product_id', productId);
    await client.from('product_certifications').delete().eq('product_id', productId);

    if (p.images.length > 0) {
      const { error } = await client.from('product_images').insert(
        p.images.map((url, i) => ({ product_id: productId, url, sort_order: i }))
      );
      if (error) console.warn(`Images for ${productId}: ${error.message}`);
    }

    if (p.bulkPricing.length > 0) {
      const { error } = await client.from('product_bulk_pricing').insert(
        p.bulkPricing.map((t) => ({
          product_id: productId,
          min_qty: t.minQty,
          max_qty: t.maxQty,
          unit_price: t.unitPrice.toString(),
        }))
      );
      if (error) console.warn(`Pricing for ${productId}: ${error.message}`);
    }

    if (p.availableColors.length > 0) {
      const { error } = await client.from('product_colors').insert(
        p.availableColors.map((c) => ({ product_id: productId, name: c.name, hex: c.hex }))
      );
      if (error) console.warn(`Colors for ${productId}: ${error.message}`);
    }

    if (p.sizes.length > 0) {
      const { error } = await client.from('product_sizes').insert(
        p.sizes.map((s, i) => ({ product_id: productId, size_label: s, sort_order: i }))
      );
      if (error) console.warn(`Sizes for ${productId}: ${error.message}`);
    }

    if (p.sizeChart.length > 0) {
      const { error } = await client.from('product_size_chart').insert(
        p.sizeChart.map((sc) => ({
          product_id: productId,
          size: sc.size,
          chest: sc.chest,
          waist: sc.waist,
          hip: sc.hip,
          length: sc.length,
          sleeve: sc.sleeve,
        }))
      );
      if (error) console.warn(`Size chart for ${productId}: ${error.message}`);
    }

    if (p.material) {
      const { error } = await client.from('product_materials').insert({
        product_id: productId,
        fabric: p.material.fabric,
        lining: p.material.lining,
        craft: p.material.craft,
      });
      if (error) console.warn(`Material for ${productId}: ${error.message}`);
    }

    if (p.designDetails.length > 0) {
      const { error } = await client.from('product_design_details').insert(
        p.designDetails.map((d, i) => ({ product_id: productId, detail_text: d, sort_order: i }))
      );
      if (error) console.warn(`Design details for ${productId}: ${error.message}`);
    }

    if (p.certifications.length > 0) {
      const { error } = await client.from('product_certifications').insert(
        p.certifications.map((c) => ({ product_id: productId, cert_name: c }))
      );
      if (error) console.warn(`Certifications for ${productId}: ${error.message}`);
    }

    console.log(`Seeded product: ${p.name}`);
  }

  // NOTE: admin users are created via Supabase Auth (dashboard or
  // invite flow). After sign-up, insert a row into `admin_profiles`
  // with the same `id` (the auth user's UUID) and a role.
  console.log('Seed complete!');
  console.log('Next step: create an admin in Supabase Auth, then insert a matching admin_profiles row.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
