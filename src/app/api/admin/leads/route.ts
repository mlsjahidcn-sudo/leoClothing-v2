import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { leadWriteSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const search = searchParams.get('search')?.trim();

  let query = auth.supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (search) {
    query = query.or(
      `company_name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
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
  const parsed = leadWriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid lead payload', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const { data: lead, error } = await auth.supabase
    .from('leads')
    .insert({
      company_name: data.company_name,
      contact_person: data.contact_person,
      email: data.email,
      phone: data.phone ?? null,
      country: data.country ?? null,
      source: data.source,
      status: data.status,
      estimated_value: data.estimated_value ?? null,
      products_interest: data.products_interest ?? null,
      next_follow_up: data.next_follow_up ?? null,
      notes: data.notes ?? null,
      assigned_to: data.assigned_to ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead }, { status: 201 });
}
