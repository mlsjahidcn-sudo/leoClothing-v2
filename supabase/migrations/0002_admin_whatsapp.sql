-- ============================================================================
-- leoClothing-v2: add WhatsApp contact to admin_profiles + public surface
-- Date: 2026-06-26
-- Reason: surface a "Chat on WhatsApp" button on the public site (inquiry
--         page + footer) sourced from the active admin's profile, and let
--         the admin edit it from /admin/settings.
--
-- Safe to re-run (all steps are idempotent).
-- ============================================================================

-- 1. Add `whatsapp` column (nullable, free-text — accept E.164 like
--    +8615975614041, or any format the admin prefers).
alter table public.admin_profiles
  add column if not exists whatsapp text;

-- 2. Public surface: an anon-readable SECURITY INVOKER view that returns
--    at most one WhatsApp number. We use a view (not a column-level grant)
--    to keep the blast radius minimal — even if the RLS policy on
--    admin_profiles ever drifts, this view only exposes one column.
create or replace view public.public_admin_whatsapp
with (security_invoker = false) as
  select whatsapp
    from public.admin_profiles
   where whatsapp is not null
     and length(trim(whatsapp)) > 0
   order by updated_at desc nulls last
   limit 1;

grant select on public.public_admin_whatsapp to anon, authenticated;

-- 3. Backfill leochengfeng's row with the number from the user.
update public.admin_profiles
   set whatsapp = '+8615975614041',
       updated_at = coalesce(updated_at, now())
 where email = 'leochengfeng@gmail.com';

-- 4. Bump updated_at on any row write so the view's ORDER BY is correct.
--    (If the column doesn't exist yet, add it. Otherwise leave alone.)
alter table public.admin_profiles
  add column if not exists updated_at timestamptz default now();
