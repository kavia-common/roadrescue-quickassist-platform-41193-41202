# Supabase integration (RoadRescue – QuickAssist)

This repo contains three independent React apps:

- `frontend_user_website`
- `frontend_mechanic_portal`
- `frontend_admin_panel`

All three apps can run in **mock mode** (localStorage) or **Supabase mode** (auth + persistence).

## Environment variables

Each frontend reads:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_KEY`

If either is missing/empty, the app automatically falls back to **mock mode**.

## Tables (recommended)

These apps are written to *attempt* to use the following tables when Supabase is configured.

Below is a simple SQL starter schema you can run in **Supabase → SQL editor** (adjust types as desired):

```sql
-- PROFILES: role + approval + optional mechanic profile json
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  approved boolean not null default true,
  profile jsonb
);

-- REQUESTS: persisted breakdown requests and mechanic assignment/status
-- Location fields:
--   address: user-entered / geocoded address display string
--   lat/lon: coordinates resolved via geocoding (Nominatim) or GPS fallback
create table if not exists public.requests (
  id text primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  vehicle jsonb,
  issue_description text,
  contact jsonb,
  address text,
  lat double precision,
  lon double precision,
  status text,
  assigned_mechanic_id uuid references auth.users(id) on delete set null,
  assigned_mechanic_email text,
  notes jsonb
);

-- FEES: single row keyed by "default"
create table if not exists public.fees (
  id text primary key,
  base_fee numeric,
  per_mile numeric,
  after_hours_multiplier numeric
);
```

### RLS (Row Level Security) notes (minimal)

The JS code reads/writes these tables directly from the browser, so RLS must allow the needed operations.

A minimal (not production-grade) approach for MVP:

- Enable RLS on `profiles`, `requests`, `fees`
- Add policies so authenticated users can:
  - read their own `profiles` row
  - insert/update their own `profiles` row (for profile json + role bootstrap)
  - insert `requests` where `user_id = auth.uid()`
  - read their own `requests`
- Admin/mechanic portals will need broader read/update policies (or you can keep them in mock mode until you add stricter policies and role checks).

Example starting point (adjust to your security needs):

```sql
alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.fees enable row level security;

-- Profiles: user can read/update their own row
create policy "profiles self read" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles self upsert" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles self update" on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- Requests: user can insert/read their own requests
create policy "requests self insert" on public.requests
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "requests self read" on public.requests
  for select to authenticated
  using (user_id = auth.uid());
```

### `profiles` table

Used for roles/approvals.

Recommended columns:

- `id` (uuid, PK) — same as `auth.users.id`
- `email` (text)
- `role` (text) — one of: `user`, `mechanic`, `approved_mechanic`, `admin`
- `approved` (boolean)
- `profile` (jsonb, optional) — mechanic profile fields (name/serviceArea)

### `requests` table

Recommended columns:

- `id` (text or uuid, PK)
- `created_at` (timestamptz)
- `user_id` (uuid)
- `user_email` (text)
- `vehicle` (jsonb)
- `issue_description` (text)
- `contact` (jsonb)
- `status` (text)
- `assigned_mechanic_id` (uuid, nullable)
- `assigned_mechanic_email` (text, nullable)
- `notes` (jsonb array, optional)

### `fees` table (optional)

Recommended columns:

- `id` (text, PK) — the app uses `"default"`
- `base_fee` (numeric)
- `per_mile` (numeric)
- `after_hours_multiplier` (numeric)

## Mock mode

When Supabase is not configured, all apps seed demo data to localStorage (same origin):

- user: `user@example.com`
- mechanic: `mech@example.com` (initially unapproved)
- admin: `admin@example.com`

Password for all: `password123`
