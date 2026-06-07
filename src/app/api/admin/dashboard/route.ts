import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { supabase } = auth;

  const [
    productsCount,
    categoriesCount,
    rfqStatuses,
    leadStatuses,
    leadValues,
    recentRfqs,
    recentLeads,
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('rfqs').select('status'),
    supabase.from('leads').select('status'),
    supabase.from('leads').select('estimated_value'),
    supabase
      .from('rfqs')
      .select('id, company_name, contact_person, email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('leads')
      .select('id, company_name, contact_person, email, status, estimated_value, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const rfqCounts: Record<string, number> = { new: 0, reviewing: 0, quoted: 0, closed: 0 };
  for (const r of rfqStatuses.data ?? []) {
    if (r.status in rfqCounts) rfqCounts[r.status]++;
  }

  const leadCounts: Record<string, number> = {
    new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0,
  };
  for (const l of leadStatuses.data ?? []) {
    if (l.status in leadCounts) leadCounts[l.status]++;
  }

  let totalLeadValue = 0;
  for (const lv of leadValues.data ?? []) {
    if (lv.estimated_value) totalLeadValue += Number(lv.estimated_value);
  }

  return NextResponse.json({
    totalProducts: productsCount.count ?? 0,
    totalCategories: categoriesCount.count ?? 0,
    totalRfqs: (rfqStatuses.data ?? []).length,
    rfqCounts,
    totalLeads: (leadStatuses.data ?? []).length,
    leadCounts,
    totalLeadValue,
    recentRfqs: recentRfqs.data ?? [],
    recentLeads: recentLeads.data ?? [],
  });
}
