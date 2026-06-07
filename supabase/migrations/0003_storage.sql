-- ============================================================================
-- Storage: product-images bucket
--
-- Run AFTER 0001_init.sql and 0002_rls.sql.
-- Idempotent: re-running is safe.
-- ============================================================================

-- Create the public bucket for product images. Public read; admin-only
-- write (auth + role check via the is_admin() helper from 0002_rls.sql).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,                       -- 10 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for the bucket.
drop policy if exists "product-images: public read" on storage.objects;
create policy "product-images: public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- Admin write: insert / update / delete. We scope by both bucket_id and
-- the is_admin() helper so a stolen JWT without a matching
-- admin_profiles row still can't drop files in here.
drop policy if exists "product-images: admin insert" on storage.objects;
create policy "product-images: admin insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images: admin update" on storage.objects;
create policy "product-images: admin update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images: admin delete" on storage.objects;
create policy "product-images: admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
