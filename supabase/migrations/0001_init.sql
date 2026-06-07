-- ============================================================================
-- Chengfeng International — initial schema
--
-- Run this in the Supabase dashboard:
--   SQL Editor → New query → paste → Run
--
-- Or via psql against the project's connection string. The script is
-- idempotent: it uses CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT
-- EXISTS, so re-running is safe.
-- ============================================================================

-- pgcrypto provides gen_random_uuid()
create extension if not exists "pgcrypto";

-- === Categories ===
create table if not exists public.categories (
  id           serial        primary key,
  slug         varchar(50)   not null unique,
  label        varchar(100)  not null,
  image        text,
  sort_order   integer       not null default 0,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz
);
create index if not exists categories_slug_idx       on public.categories(slug);
create index if not exists categories_sort_order_idx on public.categories(sort_order);

-- === Products ===
create table if not exists public.products (
  id                 varchar(36)    primary key default gen_random_uuid(),
  name               varchar(255)   not null,
  category_id        integer        not null references public.categories(id) on delete restrict,
  series             varchar(100),
  sku                varchar(50)    not null unique,
  wholesale_price    numeric(10, 2) not null,
  moq                integer        not null default 50,
  lead_time          varchar(100),
  packaging          text,
  description        text,
  care_instructions  text,
  is_new             boolean        not null default false,
  is_featured        boolean        not null default false,
  is_active          boolean        not null default true,
  created_at         timestamptz    not null default now(),
  updated_at         timestamptz
);
create index if not exists products_category_id_idx   on public.products(category_id);
create index if not exists products_sku_idx           on public.products(sku);
create index if not exists products_is_featured_idx   on public.products(is_featured);
create index if not exists products_is_active_idx      on public.products(is_active);
create index if not exists products_created_at_idx    on public.products(created_at desc);

-- === Product sub-tables (all cascade-delete with the parent) ===
create table if not exists public.product_images (
  id          serial       primary key,
  product_id  varchar(36)  not null references public.products(id) on delete cascade,
  url         text         not null,
  sort_order  integer      not null default 0
);
create index if not exists product_images_product_id_idx on public.product_images(product_id);

create table if not exists public.product_bulk_pricing (
  id          serial         primary key,
  product_id  varchar(36)    not null references public.products(id) on delete cascade,
  min_qty     integer        not null,
  max_qty     integer,
  unit_price  numeric(10, 2) not null
);
create index if not exists product_bulk_pricing_product_id_idx on public.product_bulk_pricing(product_id);

create table if not exists public.product_colors (
  id          serial       primary key,
  product_id  varchar(36)  not null references public.products(id) on delete cascade,
  name        varchar(50)  not null,
  hex         varchar(7)   not null
);
create index if not exists product_colors_product_id_idx on public.product_colors(product_id);

create table if not exists public.product_sizes (
  id          serial       primary key,
  product_id  varchar(36)  not null references public.products(id) on delete cascade,
  size_label  varchar(10)  not null,
  sort_order  integer      not null default 0
);
create index if not exists product_sizes_product_id_idx on public.product_sizes(product_id);

create table if not exists public.product_size_chart (
  id          serial       primary key,
  product_id  varchar(36)  not null references public.products(id) on delete cascade,
  size        varchar(10)  not null,
  chest       integer,
  waist       integer,
  hip         integer,
  length      integer,
  sleeve      integer
);
create index if not exists product_size_chart_product_id_idx on public.product_size_chart(product_id);

create table if not exists public.product_materials (
  id          serial       primary key,
  product_id  varchar(36)  not null references public.products(id) on delete cascade,
  fabric      text,
  lining      text,
  craft       text
);
create index if not exists product_materials_product_id_idx on public.product_materials(product_id);

create table if not exists public.product_design_details (
  id          serial       primary key,
  product_id  varchar(36)  not null references public.products(id) on delete cascade,
  detail_text text         not null,
  sort_order  integer      not null default 0
);
create index if not exists product_design_details_product_id_idx on public.product_design_details(product_id);

create table if not exists public.product_certifications (
  id          serial       primary key,
  product_id  varchar(36)  not null references public.products(id) on delete cascade,
  cert_name   varchar(100) not null
);
create index if not exists product_certifications_product_id_idx on public.product_certifications(product_id);

-- === RFQs ===
create table if not exists public.rfqs (
  id              varchar(36)    primary key default gen_random_uuid(),
  company_name    varchar(255)   not null,
  contact_person  varchar(255)   not null,
  email           varchar(255)   not null,
  phone           varchar(50),
  country         varchar(100),
  business_type   varchar(100),
  quantity_range  varchar(50),
  customization   jsonb,
  message         text,
  status          varchar(20)    not null default 'new',
  notes           text,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz
);
create index if not exists rfqs_status_idx     on public.rfqs(status);
create index if not exists rfqs_created_at_idx on public.rfqs(created_at desc);
create index if not exists rfqs_email_idx      on public.rfqs(email);

create table if not exists public.rfq_items (
  id          serial       primary key,
  rfq_id      varchar(36)  not null references public.rfqs(id) on delete cascade,
  product_id  varchar(36)  references public.products(id) on delete set null,
  quantity    integer,
  notes       text
);
create index if not exists rfq_items_rfq_id_idx     on public.rfq_items(rfq_id);
create index if not exists rfq_items_product_id_idx on public.rfq_items(product_id);

-- === Leads ===
create table if not exists public.leads (
  id                varchar(36)     primary key default gen_random_uuid(),
  company_name      varchar(255)    not null,
  contact_person    varchar(255)    not null,
  email             varchar(255)    not null,
  phone             varchar(50),
  country           varchar(100),
  source            varchar(50)     not null default 'website',
  status            varchar(20)     not null default 'new',
  estimated_value   numeric(10, 2),
  products_interest text,
  next_follow_up    timestamptz,
  notes             text,
  assigned_to       varchar(36),
  created_at        timestamptz     not null default now(),
  updated_at        timestamptz
);
create index if not exists leads_status_idx     on public.leads(status);
create index if not exists leads_source_idx     on public.leads(source);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_email_idx      on public.leads(email);

create table if not exists public.lead_activities (
  id          serial        primary key,
  lead_id     varchar(36)   not null references public.leads(id) on delete cascade,
  type        varchar(30)   not null default 'note',
  subject     varchar(255),
  content     text          not null,
  created_at  timestamptz   not null default now()
);
create index if not exists lead_activities_lead_id_idx on public.lead_activities(lead_id);

-- === Admin Profiles ===
-- Pairs a Supabase Auth user with a role. The id must equal auth.users.id.
-- (We don't store passwords here — Supabase Auth handles credential
-- storage, hashing, and rotation.)
create table if not exists public.admin_profiles (
  id          uuid          primary key,
  email       varchar(255)  not null unique,
  name        varchar(128)  not null,
  role        varchar(20)   not null default 'admin',
  created_at  timestamptz   not null default now()
);
create index if not exists admin_profiles_email_idx on public.admin_profiles(email);
create index if not exists admin_profiles_role_idx  on public.admin_profiles(role);

-- Foreign key to auth.users. The constraint name matches what
-- Supabase's UI would generate for an "auth.users" reference.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'admin_profiles_id_fkey'
      and table_name = 'admin_profiles'
  ) then
    alter table public.admin_profiles
      add constraint admin_profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end$$;
