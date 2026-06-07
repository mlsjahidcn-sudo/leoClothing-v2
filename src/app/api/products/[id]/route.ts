import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { mapDbProduct } from '@/lib/db-queries';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('products')
    .select(
      `*, categories(slug, label), product_images(url, sort_order), product_bulk_pricing(min_qty, max_qty, unit_price), product_colors(name, hex), product_sizes(size_label, sort_order), product_size_chart(size, chest, waist, hip, length, sleeve), product_materials(fabric, lining, craft), product_design_details(detail_text, sort_order), product_certifications(cert_name)`,
    )
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  return NextResponse.json({ product: mapDbProduct(data as Parameters<typeof mapDbProduct>[0]) });
}
