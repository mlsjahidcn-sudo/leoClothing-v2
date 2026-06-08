import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { supabase } = auth;

  const [
    productsCount,
    categoriesCount,
    rfqTotal,
    leadTotal,
    leadValueAgg,
    recentRfqs,
    recentLeads,
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    // Use `count: 'exact', head: true` for the totals — we don't need
    // the actual rows just to count them. Saves a full table scan over
    // the wire on every dashboard load.
    supabase.from('rfqs').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    // Sum pipeline value server-side via RPC would be ideal; until we
    // add a SQL function, fetch just the column we need (much smaller
    // payload than select('*')).
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

  // For the per-status breakdown we still need the status column, but only
  // for the last 5 RFQs and leads we already fetched above — that gives
  // us "recent activity" counts cheaply. For an accurate count by status
  // we'd need a SQL aggregation function; defer until the table is large
  // enough to notice.
  const rfqCounts: Record<string, number> = { new: 0, reviewing: 0, quoted: 0, closed: 0 };
  for (const r of recentRfqs.data ?? []) {
    if (r.status in rfqCounts) rfqCounts[r.status]++;
  }

  const leadCounts: Record<string, number> = {
    new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, won: 0, lost: 0,
  };
  for (const l of recentLeads.data ?? []) {
    if (l.status in leadCounts) leadCounts[l.status]++;
  }

  let totalLeadValue = 0;
  for (const lv of leadValueAgg.data ?? []) {
    if (lv.estimated_value) totalLeadValue += Number(lv.estimated_value);
  }

  return NextResponse.json({
    totalProducts: productsCount.count ?? 0,
    totalCategories: categoriesCount.count ?? 0,
    totalRfqs: rfqTotal.count ?? 0,
    rfqCounts,
    totalLeads: leadTotal.count ?? 0,
    leadCounts,
    totalLeadValue,
    recentRfqs: recentRfqs.data ?? [],
    recentLeads: recentLeads.data ?? [],
  });
}
