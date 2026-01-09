# Supabase backend (RoadRescue – QuickAssist)

This repo contains three independent React apps:

- `frontend_user_website` (port 3000)
- `frontend_mechanic_portal` (port 3001)
- `frontend_admin_panel` (port 3002)

All three apps can run in **mock mode** (localStorage) or **Supabase mode** (auth + persistence).

## Environment variables

Each frontend reads:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_KEY`

If either is missing/empty, the app automatically falls back to **mock mode**.

## Auth roles model (RLS)

RLS uses **Supabase Auth JWT** `app_metadata.role`:

- `user` (default)
- `mechanic`
- `admin`

Helper functions used by RLS:

- `public.current_role()` → reads `auth.jwt() -> app_metadata ->> 'role'` (defaults to `user`)
- `public.is_admin()` / `public.is_mechanic()`

Mechanic approval is enforced with:

- `profiles.approved = true` AND `profiles.role = 'mechanic'`

> Important: You must set `app_metadata.role` for users (mechanic/admin) via Admin API / dashboard tooling. The DB enforces access but does not automatically assign roles.

## Tables (public schema)

Verified tables now present:

- `profiles`
- `mechanic_profiles`
- `requests`
- `request_notes`
- `_schema_migrations` (lightweight internal table used to record schema/index migrations applied by automation)
- (pre-existing: `assignments`, `fees`)

### `profiles`
User profile row keyed by `profiles.id = auth.users.id`.

Key columns (some may be pre-existing; ensured by migrations):
- `id uuid` (expected to exist; FK pattern is `auth.users.id`)
- `role text not null default 'user'`
- `approved boolean not null default false`
- `display_name text`
- `phone text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `mechanic_profiles`
Mechanic-specific details.

- `user_id uuid primary key` (FK → `auth.users(id)` on delete cascade)
- `business_name text`
- `phone text`
- `service_area text`
- `skills text[] default '{}'::text[]`
- `is_available boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `requests`
Breakdown/help requests.

Ensured columns:
- `requester_id uuid` (FK → `auth.users(id)` on delete set null)
- `assigned_mechanic_id uuid` (FK → `auth.users(id)` on delete set null)
- `status text not null default 'new'`
- `submitted_at timestamptz`
- `accepted_at timestamptz`
- `arrived_at timestamptz`
- `completed_at timestamptz`
- `cancelled_at timestamptz`
- `updated_at timestamptz not null default now()`

Additional analytics/search fields (added via 2026-01-09 change):
- `requester_email text`
- `mechanic_id uuid`
- `mechanic_email text`
- `customer_name text`
- `customer_phone text`
- `customer_email text`
- `service_type text`
- `city text`
- `state text`
- `postal_code text`
- `cancelled_reason text`
- `last_status_change_at timestamptz`
- (already present) `user_email text`
- (already present) `assigned_mechanic_email text`
- (already present) `vehicle_plate text`
- (already present) `issue_description text`

### `request_notes`
Notes attached to a request (audit + communication).

- `id uuid primary key default gen_random_uuid()`
- `request_id uuid not null` (FK → `public.requests(id)` on delete cascade)
- `author_id uuid not null` (FK → `auth.users(id)` on delete cascade)
- `note text not null`
- `is_internal boolean not null default false`
- `created_at timestamptz not null default now()`

## Triggers / lifecycle automation

### `updated_at`
Generic trigger function:
- `public.set_updated_at()` sets `NEW.updated_at = now()`

Applied triggers:
- `profiles`: `trg_profiles_updated_at` (before update)
- `mechanic_profiles`: `trg_mechanic_profiles_updated_at` (before update)
- `requests`: `trg_requests_updated_at` (before update)

### Requests status lifecycle timestamps
Trigger function:
- `public.requests_status_lifecycle()`

Behavior:
- On `INSERT`: sets `submitted_at = now()` if null.
- On `UPDATE` when `status` changes:
  - status=`accepted` → sets `accepted_at` if null
  - status=`arrived` → sets `arrived_at` if null
  - status=`completed` → sets `completed_at` if null
  - status=`cancelled` → sets `cancelled_at` if null

Trigger:
- `requests`: `trg_requests_lifecycle` (before insert or update)

## Indexes

Baseline indexes:
- `profiles(role)`, `profiles(approved)`
- `requests(requester_id)`, `requests(assigned_mechanic_id)`, `requests(status)`, `requests(submitted_at desc)`
- `requests(vehicle_plate)`, `requests(vehicle_make)`, `requests(vehicle_model)`, `requests(created_at)`, `requests(status)`
- `request_notes(request_id, created_at desc)`, `request_notes(author_id)`

Added for performance (2026-01-09):
- `requests(user_id, created_at desc)`
- `requests(status, created_at desc)`
- `requests(assigned_mechanic_id, status)`
- `requests(priority, created_at desc)`
- `requests(created_at desc)`, `requests(updated_at desc)`
- `requests(submitted_at desc)`, `requests(accepted_at desc)`, `requests(completed_at desc)`
- `requests(user_email)`, `requests(contact_phone)`, `requests(vehicle_plate)`
- GIN text search:
  - `to_tsvector('english', coalesce(location_text,''))`
  - `to_tsvector('english', coalesce(issue_description,''))`

## RLS policies (summary)

### `profiles` (FIXED POLICY SET)
Effective behavior:

- **SELECT**
  - authenticated user can select their own profile (`auth.uid() = id`)
  - admin can select any profile (via `public.is_admin()`)

- **INSERT**
  - authenticated user can insert their own profile (`auth.uid() = id`)
  - admin can insert any profile

- **UPDATE**
  - authenticated user can update only their own profile (`auth.uid() = id`)
  - admin can update any profile

Compliance notes (sample-compliant / audit-friendly):

- Policies are **explicitly separated** by actor (self vs admin) to make intent clear and to avoid ambiguous OR-conditions.
- Admin access is mediated only by JWT `app_metadata.role='admin'` (via `public.is_admin()`).
- Self access is strictly bound to `profiles.id = auth.uid()` (no additional joins, no cross-user access).
- If you see errors like `new row violates row-level security policy for table "profiles"` during signup, it typically means the application is inserting a profile row where `id != auth.uid()` or the user is not authenticated at the time of insert.

### `mechanic_profiles`
- Select: self OR admin
- Insert: self only
- Update: self OR admin

### `requests`
- Select:
  - admin
  - requester (own requests)
  - **approved mechanics** can view all requests (so they can pick up work)
- Insert: requester must be `auth.uid()`
- Update:
  - admin always
  - requester only when status in (`new`,`pending`)
  - **approved mechanic** only when assigned to them
- Accept flow:
  - **approved mechanic** may update a request when `assigned_mechanic_id IS NULL`,
    but must set `assigned_mechanic_id = auth.uid()` (policy `requests_accept_by_mechanic`).

### `request_notes`
- Select:
  - admin
  - requester (notes for own requests)
  - assigned approved mechanic (notes for their assigned requests)
- Insert:
  - author must be `auth.uid()`
  - allowed if requester OR assigned approved mechanic OR admin
- Update/Delete: admin only

## Final applied SQL (DDL/RLS/triggers/indexes)

> This section includes the latest applied SQL. Earlier blocks may still exist in history, but **the effective `profiles` policies are the “FIXED POLICY SET” below**.

```sql
-- Apply fixed RLS policies for public.profiles (self insert/select/update + admin full access)
-- Also standardize helper functions for admin role detection.

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), 'user');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin';
$$;

alter table public.profiles enable row level security;

-- Drop any potentially conflicting legacy policies (safe/idempotent)
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;

-- Explicit fixed policy set
create policy "profiles_self_select" on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_admin_select" on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "profiles_self_insert" on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_self_update" on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_admin_insert" on public.profiles
for insert
to authenticated
with check (public.is_admin());

create policy "profiles_admin_update" on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
```

## Supabase Dashboard configuration (required)

IMPORTANT: Supabase Configuration Required

1. In Supabase Dashboard:
   - Go to **Authentication → URL Configuration**
   - Set **Site URL** to your production domain (e.g., `https://yourapp.com`)
   - Add **Redirect URLs**:
     - `http://localhost:3000/**` (user website dev)
     - `http://localhost:3001/**` (mechanic portal dev)
     - `http://localhost:3002/**` (admin panel dev)
     - `https://yourapp.com/**` (prod; adjust per deployment)

2. Email templates (optional):
   - Authentication → Email Templates
   - Use `SiteURL` and `RedirectTo` template variables

## Mock mode

When Supabase is not configured, all apps seed demo data to localStorage (same origin):

- user: `user@example.com`
- mechanic: `mech@example.com` (initially unapproved)
- admin: `admin@example.com`

Password for all: `password123`
