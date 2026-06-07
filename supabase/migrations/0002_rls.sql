-- ============================================================================
-- Row Level Security policies
--
-- Public surface: anon can read active products + categories, and submit
-- new RFQs / leads. Everything else requires an authenticated admin
-- (i.e. a user with a row in admin_profiles).
--
-- Run AFTER 0001_init.sql.
-- ============================================================================

-- Helper: is the current user an admin? Returns true only when the
-- auth.uid() matches a row in admin_profiles. The function is
-- STABLE so the planner can cache the result per-query.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
  );
$$;

-- ============================================================
-- Enable RLS on every public table
-- ============================================================
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_images        enable row level security;
alter table public.product_bulk_pricing  enable row level security;
alter table public.product_colors        enable row level security;
alter table public.product_sizes         enable row level security;
alter table public.product_size_chart    enable row level security;
alter table public.product_materials     enable row level security;
alter table public.product_design_details enable row level security;
alter table public.product_certifications enable row level security;
alter table public.rfqs                  enable row level security;
alter table public.rfq_items             enable row level security;
alter table public.leads                 enable row level security;
alter table public.lead_activities       enable row level security;
alter table public.admin_profiles        enable row level security;

-- ============================================================
-- Categories
-- ============================================================
drop policy if exists "categories: public read" on public.categories;
create policy "categories: public read"
  on public.categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "categories: admin write" on public.categories;
create policy "categories: admin write"
  on public.categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Products (+ sub-tables): public reads of active rows, admin writes
-- ============================================================
drop policy if exists "products: public read active" on public.products;
create policy "products: public read active"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "products: admin all" on public.products;
create policy "products: admin all"
  on public.products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The product sub-tables follow the parent: we look up the parent
-- row's is_active status inside the policy. This avoids duplicating
-- the rule on every sub-table.
drop policy if exists "product_images: public read"        on public.product_images;
drop policy if exists "product_bulk_pricing: public read"  on public.product_bulk_pricing;
drop policy if exists "product_colors: public read"        on public.product_colors;
drop policy if exists "product_sizes: public read"         on public.product_sizes;
drop policy if exists "product_size_chart: public read"    on public.product_size_chart;
drop policy if exists "product_materials: public read"     on public.product_materials;
drop policy if exists "product_design_details: public read" on public.product_design_details;
drop policy if exists "product_certifications: public read" on public.product_certifications;

create policy "product_images: public read"        on public.product_images        for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_bulk_pricing: public read"  on public.product_bulk_pricing  for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_colors: public read"        on public.product_colors        for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_sizes: public read"         on public.product_sizes         for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_size_chart: public read"    on public.product_size_chart    for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_materials: public read"     on public.product_materials     for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_design_details: public read" on public.product_design_details for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_certifications: public read" on public.product_certifications for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

-- Admin write on sub-tables
drop policy if exists "product_images: admin write"        on public.product_images;
drop policy if exists "product_bulk_pricing: admin write"  on public.product_bulk_pricing;
drop policy if exists "product_colors: admin write"        on public.product_colors;
drop policy if exists "product_sizes: admin write"         on public.product_sizes;
drop policy if exists "product_size_chart: admin write"    on public.product_size_chart;
drop policy if exists "product_materials: admin write"     on public.product_materials;
drop policy if exists "product_design_details: admin write" on public.product_design_details;
drop policy if exists "product_certifications: admin write" on public.product_certifications;

create policy "product_images: admin write"        on public.product_images        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_bulk_pricing: admin write"  on public.product_bulk_pricing  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_colors: admin write"        on public.product_colors        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_sizes: admin write"         on public.product_sizes         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_size_chart: admin write"    on public.product_size_chart    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_materials: admin write"     on public.product_materials     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_design_details: admin write" on public.product_design_details for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_certifications: admin write" on public.product_certifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- RFQs: public can submit, admin can manage
-- ============================================================
drop policy if exists "rfqs: public insert" on public.rfqs;
create policy "rfqs: public insert"
  on public.rfqs
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "rfqs: admin read" on public.rfqs;
create policy "rfqs: admin read"
  on public.rfqs
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "rfqs: admin update" on public.rfqs;
create policy "rfqs: admin update"
  on public.rfqs
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "rfqs: admin delete" on public.rfqs;
create policy "rfqs: admin delete"
  on public.rfqs
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "rfq_items: public insert" on public.rfq_items;
create policy "rfq_items: public insert"
  on public.rfq_items
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "rfq_items: admin read" on public.rfq_items;
create policy "rfq_items: admin read"
  on public.rfq_items
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "rfq_items: admin update" on public.rfq_items;
create policy "rfq_items: admin update"
  on public.rfq_items
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "rfq_items: admin delete" on public.rfq_items;
create policy "rfq_items: admin delete"
  on public.rfq_items
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- Leads: public can submit, admin can manage
-- ============================================================
drop policy if exists "leads: public insert" on public.leads;
create policy "leads: public insert"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "leads: admin all" on public.leads;
create policy "leads: admin all"
  on public.leads
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "lead_activities: admin all" on public.lead_activities;
create policy "lead_activities: admin all"
  on public.lead_activities
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Admin profiles: admins can read each other; write is restricted
-- to bootstrap. Add new admins via Supabase dashboard.
-- ============================================================
drop policy if exists "admin_profiles: self read" on public.admin_profiles;
create policy "admin_profiles: self read"
  on public.admin_profiles
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_profiles: self update" on public.admin_profiles;
create policy "admin_profiles: self update"
  on public.admin_profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert/delete policy — manage admin_profiles from the dashboard
-- or with the service-role key, never from the client.
