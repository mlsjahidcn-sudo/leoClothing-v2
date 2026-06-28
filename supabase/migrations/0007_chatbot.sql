-- ============================================================================
-- Chengfeng International — Chatbot tables
--
-- Adds:
--   * public.chatbot_conversations  — one row per visitor chat session, FK to leads
--   * public.chatbot_messages       — rolling transcript (user + assistant turns)
--
-- Run this in the Supabase dashboard:
--   SQL Editor → New query → paste → Run
--
-- Idempotent: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
--
-- Access pattern:
--   - Public endpoints (/api/chatbot/*) write/read using the service-role
--     key (server-only) because the lead-gate is a soft front door and the
--     visitor doesn't have an auth.uid().
--   - Admin endpoints (/api/admin/chatbot/*) read using the admin's JWT via
--     `requireAdmin`, gated by RLS policy `admin_read` below.
--   - RLS is enabled but ALL public writes go through the service-role
--     client (which bypasses RLS). We add an admin-only SELECT policy so
--     PostgREST won't expose chatbot data to anonymous visitors.
-- ============================================================================

-- === Conversations ===
create table if not exists public.chatbot_conversations (
  id              varchar(36)    primary key default gen_random_uuid(),
  lead_id         varchar(36)    not null references public.leads(id) on delete cascade,
  visitor_token   varchar(64)    not null,
  status          varchar(20)    not null default 'open',
  message_count   integer        not null default 0,
  last_message_at timestamptz,
  metadata        jsonb          not null default '{}'::jsonb,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz
);
create index if not exists chatbot_conversations_lead_id_idx
  on public.chatbot_conversations(lead_id);
create index if not exists chatbot_conversations_visitor_token_idx
  on public.chatbot_conversations(visitor_token);
create index if not exists chatbot_conversations_last_message_at_idx
  on public.chatbot_conversations(last_message_at desc nulls last);

-- === Messages ===
create table if not exists public.chatbot_messages (
  id              bigserial      primary key,
  conversation_id varchar(36)    not null references public.chatbot_conversations(id) on delete cascade,
  role            varchar(20)    not null check (role in ('user','assistant','system')),
  content         text           not null,
  -- Optional citations — short product IDs the assistant referenced.
  -- Lets the admin see "which products the bot talked about" without
  -- scraping the assistant text. Stored as text[] rather than a join
  -- table to keep the transcript self-contained.
  cited_product_ids text[]       not null default '{}'::text[],
  metadata        jsonb          not null default '{}'::jsonb,
  created_at      timestamptz    not null default now()
);
create index if not exists chatbot_messages_conversation_id_idx
  on public.chatbot_messages(conversation_id, created_at);

-- === RLS ===
-- Public REST access for these tables is via service-role only. We enable
-- RLS anyway (defense in depth) and allow authenticated admins to read.
alter table public.chatbot_conversations enable row level security;
alter table public.chatbot_messages enable row level security;

-- Drop + recreate the policies so this migration is re-runnable.
drop policy if exists chatbot_conversations_admin_read on public.chatbot_conversations;
drop policy if exists chatbot_messages_admin_read on public.chatbot_messages;

-- Admin SELECT — both tables. Admin write/delete stays service-role only
-- (the admin UI doesn't need to mutate chatbot data directly; status
-- changes go through the lead's normal flow).
create policy chatbot_conversations_admin_read
  on public.chatbot_conversations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid()
        and ap.role in ('admin', 'superadmin')
    )
  );

create policy chatbot_messages_admin_read
  on public.chatbot_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid()
        and ap.role in ('admin', 'superadmin')
    )
  );

-- Touch the updated_at on conversation edits so dashboards can sort by it.
create or replace function public.chatbot_conversations_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chatbot_conversations_touch on public.chatbot_conversations;
create trigger chatbot_conversations_touch
  before update on public.chatbot_conversations
  for each row execute function public.chatbot_conversations_touch_updated_at();
