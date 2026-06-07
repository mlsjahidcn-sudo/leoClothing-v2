import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: data });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: { type?: string; subject?: string; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.content !== 'string' || body.content.trim() === '') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('lead_activities')
    .insert({
      lead_id: id,
      type: typeof body.type === 'string' ? body.type : 'note',
      subject: typeof body.subject === 'string' ? body.subject : null,
      content: body.content,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activity: data }, { status: 201 });
}
