# Chengfeng International — Supabase + Supabase Auth setup

This replaces the old custom admin auth (plaintext `password_hash` column,
`/api/admin/auth` route, `sessionStorage` flag) with **Supabase Auth** and
**Row Level Security**.

## What changed

| Was | Now |
| --- | --- |
| `admin_users` table with `password_hash` (plaintext) | `admin_profiles` table that references `auth.users(id)` |
| `/api/admin/auth` POST → string-compare password | Supabase `signInWithPassword` → JWT + RLS |
| Admin APIs read service_role key (open) | Admin APIs verify JWT and run under the user's RLS context |
| Service-role key inlined into a `'use client'` module | Service-role key lives only in server-only files; client uses publishable key |
| Inquiry form sent `product_ids: [...]`, API expected `items` | Form sends `items: [{ product_id }]`; API accepts both for compat |
| RFQ id typed as `number` in admin UI | `string` (matches `varchar(36)` schema) |
| No zod validation on admin writes | Every admin write goes through a zod schema (`src/lib/validators.ts`) |
| New-product page imported the supabase client in a `'use client'` module | Goes through `/api/admin/products` POST like every other write |

## 1. Environment

`.env.local` is already created with the new clean-namespace variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://spyhznmiyfuijlqciheq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=           # leave empty for now
COZE_SUPABASE_URL=                   # Coze fallback (leave empty locally)
COZE_SUPABASE_ANON_KEY=              # Coze fallback (leave empty locally)
COZE_SUPABASE_SERVICE_ROLE_KEY=      # Coze fallback (leave empty locally)
```

The Coze variables stay as a fallback so the existing Coze platform
deployment continues to work without code changes.

## 2. Database setup

Run the SQL files in the Supabase dashboard's **SQL Editor** in this order:

1. `supabase/migrations/0001_init.sql` — creates all tables, indexes,
   and the FK from `admin_profiles.id` to `auth.users(id)`.
2. `supabase/migrations/0002_rls.sql` — enables RLS on every public
   table, adds the `is_admin()` helper, and creates the read/write
   policies.

Both files are idempotent (`CREATE ... IF NOT EXISTS`, `DROP POLICY IF
EXISTS ... CREATE POLICY ...`), so re-running is safe.

## 3. Create the first admin

1. In Supabase dashboard → **Authentication** → **Users** → **Add user**
   - Email: `admin@chengfeng.com` (or any email you like)
   - Password: pick a strong one
   - "Auto Confirm User": ON
2. Copy the new user's UUID.
3. Run this SQL in the SQL Editor (paste the UUID you copied):

```sql
insert into public.admin_profiles (id, email, name, role)
values (
  'PASTE-AUTH-USER-UUID-HERE',
  'admin@chengfeng.com',
  'Admin',
  'superadmin'
)
on conflict (id) do update set role = excluded.role, name = excluded.name;
```

(See `supabase/seed_admin.sql` for the same template.)

## 4. Seed products

The seed script lives at `src/storage/database/seed.ts`. It needs the
service-role key (because it bypasses RLS). If you don't want to set
`SUPABASE_SERVICE_ROLE_KEY` locally, run this from the Supabase SQL
editor instead — the categories + product inserts go in the same
shape as `src/lib/product-data.ts`. (Re-running the script is safe —
it tears down sub-tables and re-inserts.)

To run the script locally:

```
SUPABASE_SERVICE_ROLE_KEY=<your secret key> npx tsx src/storage/database/seed.ts
```

## 5. Run the dev server

```
pnpm dev
```

The site is at `http://localhost:5000`. Admin at `/admin/login` —
sign in with the email/password you created in step 3.

## 6. Type / lint

```
pnpm ts-check      # passes clean
pnpm lint          # 0 errors, 9 cosmetic warnings (all pre-existing)
pnpm build         # production build
```

## Layout

```
src/
  lib/
    supabase/
      client.ts         # browser (admin pages, login form)
      server.ts         # API routes (per-request, user-scoped)
      admin.ts          # service-role (bypasses RLS; for seed only)
      config.ts         # env-var resolution (NEXT_PUBLIC_* + COZE_* fallback)
      types.ts          # hand-authored Database type (optional helper)
    admin-auth.ts       # requireAdmin(request) → { user, profile, supabase } | NextResponse
    admin-fetch.ts      # adminFetch(url, init) — adds Authorization header
    validators.ts       # zod schemas for every admin write
    db-queries.ts       # public-side product/category fetchers (anon client)
  storage/database/
    supabase-client.ts  # re-exports from @/lib/supabase (back-compat for old import paths)
    shared/schema.ts    # Drizzle schema (admin_profiles now, not admin_users)
    seed.ts             # seed script (skips admin user — use Supabase Auth)
supabase/
  migrations/0001_init.sql
  migrations/0002_rls.sql
  seed_admin.sql        # template for promoting a Supabase Auth user to admin
```

## Notes / gotchas

- **Sub-table sync on product PUT** still does DELETE-then-INSERT per
  sub-table. We log failures as `warnings` on the response instead of
  silently 200-ing. The cleaner fix is to wrap everything in a
  Postgres function, but that's out of scope for this pass.
- **`next.config.ts`** still has `images.remotePatterns: [{ hostname: '*' }]`
  — restrict this once you know your Supabase storage hostname.
- **`scripts/dev.sh`** is bash-only; on Windows use WSL/Git Bash or
  the Coze CLI wrapper.
- **`src/storage/database/shared/relations.ts`** is still empty — keep
  it as the Drizzle relations file, populate when needed.
- The original `src/app/api/admin/auth/route.ts` is gone; admin login
  now goes through Supabase Auth, not a custom endpoint.
