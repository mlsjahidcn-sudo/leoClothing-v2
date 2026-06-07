import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { rfqWriteSchema } from '@/lib/validators';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('rfqs')
    .select('*, rfq_items(id, product_id, quantity, notes, products(id, name, sku, product_images(id, url, sort_order)))')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
  return NextResponse.json({ rfq: data });
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
  const parsed = rfqWriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid RFQ update', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id } = await params;
  const data = parsed.data;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes;

  const { error } = await auth.supabase.from('rfqs').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
