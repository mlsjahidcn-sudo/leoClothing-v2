-- ============================================================================
-- leoClothing-v2: add updated_at to admin_profiles
-- Date: 2026-06-27
-- Reason: AuthProvider.tsx selects `updated_at` from admin_profiles, but the
--         column was never added when whatsapp was introduced in 0002_admin_whatsapp.sql.
--         PostgREST returns Postgres error 42703 ("column does not exist"),
--         the admin login flow treats the failed query as "no profile row",
--         and the login page displays "This account is not registered as an admin."
--         Adding the column lets the schema match what the code expects.
--
-- Safe to re-run (idempotent).
--
-- NOTE: I deliberately do NOT add an automatic trigger to bump this on UPDATE.
-- The settings page mutates admin_profiles.name / whatsapp via RLS-protected
-- UPDATE; if/when we want that to bump updated_at automatically, do it in a
-- follow-up migration (separate concern).
-- ============================================================================

alter table public.admin_profiles
  add column if not exists updated_at timestamptz;