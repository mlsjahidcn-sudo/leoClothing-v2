import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { publicRfqSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Accept either the new `items` array (with quantity/notes) or the
  // legacy `product_ids` array (ids only). Normalize to `items` before
  // zod-validating so the old frontend keeps working.
  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.items) && Array.isArray(raw.product_ids)) {
    raw.items = (raw.product_ids as unknown[]).map((id) =>
      typeof id === 'string' ? { product_id: id } : id,
    );
    delete raw.product_ids;
  }

  const parsed = publicRfqSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid RFQ payload', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const supabase = getServerSupabase();

  const { data: rfq, error: rfqError } = await supabase
    .from('rfqs')
    .insert({
      company_name: data.company_name,
      contact_person: data.contact_person,
      email: data.email,
      phone: data.phone ?? null,
      country: data.country ?? null,
      business_type: data.business_type ?? null,
      quantity_range: data.quantity_range ?? null,
      customization: data.customization ?? null,
      message: data.message ?? null,
      status: 'new',
    })
    .select('id')
    .single();

  if (rfqError || !rfq) {
    return NextResponse.json(
      { error: rfqError?.message ?? 'Failed to create RFQ' },
      { status: 500 },
    );
  }

  if (data.items && data.items.length) {
    const { error: itemsError } = await supabase.from('rfq_items').insert(
      data.items.map((it) => ({
        rfq_id: rfq.id,
        product_id: it.product_id,
        quantity: it.quantity ?? null,
        notes: it.notes ?? null,
      })),
    );
    if (itemsError) {
      // The RFQ row exists but its items didn't. Surface as a warning
      // rather than a 500 — the lead is captured either way.
      return NextResponse.json(
        {
          success: true,
          rfq_id: rfq.id,
          warning: `Some items could not be attached: ${itemsError.message}`,
        },
        { status: 201 },
      );
    }
  }

  return NextResponse.json({ success: true, rfq_id: rfq.id }, { status: 201 });
}
