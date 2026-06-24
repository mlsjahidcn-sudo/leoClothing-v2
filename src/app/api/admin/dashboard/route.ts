import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

// Status enums kept here (not in a shared file) because they're a
// dashboard-widget concern, not a domain concept — adding a new lead
// status means updating both this widget and admin/leads. If we ever
// have a third call site, promote to a const.
const RFQ_STATUSES = ['new', 'reviewing', 'quoted', 'closed'] as const;
const LEAD_STATUSES = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { supabase } = auth;

  // One parallel query per status — PostgREST returns a cheap `count`
  // with head:true, so 11 queries is still tiny. Alternative was an
  // SQL RPC returning one row per status; we'd need a migration for
  // that, and this works without one.
  const buildStatusCounts = <T extends string>(
    statuses: readonly T[],
    table: 'rfqs' | 'leads',
  ): Promise<Record<T, number>> => {
    return Promise.all(
      statuses.map((status) =>
        supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('status', status)
          .then(({ count }) => [status, count ?? 0] as const),
      ),
    ).then((entries) => Object.fromEntries(entries) as Record<T, number>);
  };

  const [
    productsCount,
    categoriesCount,
    rfqTotal,
    leadTotal,
    leadValueSum,
    recentRfqs,
    recentLeads,
    rfqCounts,
    leadCounts,
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('rfqs').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    // Sum pipeline value server-side. PostgREST doesn't expose SUM()
    // directly through the JS client's `select`, so we still pull the
    // column and aggregate in JS — but only one numeric column, not
    // full rows. Replace with an RPC when the table grows.
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
    buildStatusCounts(RFQ_STATUSES, 'rfqs'),
    buildStatusCounts(LEAD_STATUSES, 'leads'),
  ]);

  let totalLeadValue = 0;
  for (const lv of leadValueSum.data ?? []) {
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
