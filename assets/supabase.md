# Supabase backend (RoadRescue – QuickAssist) — User Website Only Scope

This document describes the **production** Supabase schema + security configuration for the **RoadRescue user website only**.

**Scope constraints (important):**
- Only **end users** (customers) are supported here.
- No mechanic/admin logic is included in RLS for user operations.
- Users can:
  - create & view only their own `requests`
  - create/view/update only their own `profiles` row
  - update their own requests **without being able to change** `requests.status`
  - **cannot delete** requests (no delete policy)

> Note: This Supabase project already contains extra tables/columns from earlier iterations (e.g., mechanic/admin-related). This document focuses on the **effective locked-down RLS** for `profiles` and `requests` used by the user website.

---

## Environment variables (frontend_user_website)

The React user website expects:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

(Other env vars may exist, but these are the critical Supabase ones for client connectivity.)

---

## Effective Tables (public schema)

### 1) `public.profiles`

Contract (minimum required):

```sql
profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Notes:
- Existing project may have additional columns (e.g., role/approved/etc.). They are not required for the user website contract.

### 2) `public.requests`

Contract (minimum required):

```sql
requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  vehicle_make text not null,
  vehicle_model text,
  vehicle_year int,

  issue_description text not null,

  address text,
  latitude double precision,
  longitude double precision,

  status text not null default 'pending'
    check (status in (
      'pending',
      'submitted',
      'in_review',
      'assigned',
      'accepted',
      'en_route',
      'completed',
      'canceled'
    )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Important:
- The user website must NOT set `requests.status` on insert. It should rely on the database default (`'pending'`) to ensure inserts always satisfy the CHECK constraint and to prevent users from choosing non-initial statuses client-side.
- The project may have legacy columns (`lat/lon`, etc.). The user website can use either, but the contract uses `latitude/longitude`.
- `vehicle_year` was converted to `int4` when safe.

---

## Triggers (timestamps)

### `public.set_updated_at()` trigger function

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### Triggers

- `profiles`: `trg_profiles_updated_at` (BEFORE UPDATE)
- `requests`: `trg_requests_updated_at` (BEFORE UPDATE)

---

## Row Level Security (RLS) — STRICT user-only

RLS is enabled on both tables:

```sql
alter table public.profiles enable row level security;
alter table public.requests enable row level security;
```

### Policies: `public.profiles`

Only authenticated users can access their own profile row.

```sql
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
```

No delete policy is defined for `profiles` (delete is not needed by the user website and remains blocked by default).

### Policies: `public.requests`

Users can insert/select only their own requests, and update only their own requests **without changing `status`**.

```sql
create policy requests_insert_own
on public.requests
for insert
to authenticated
with check (user_id = auth.uid());

create policy requests_select_own
on public.requests
for select
to authenticated
using (user_id = auth.uid());

create policy requests_update_own_no_status_change
on public.requests
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and status = (select r.status from public.requests r where r.id = id)
);
```

Deletes:
- No delete policy exists on `requests` ⇒ users cannot delete requests.

---

## Indexes

Required indexes applied:

```sql
create index if not exists idx_requests_user_id on public.requests(user_id);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_created_at_desc on public.requests(created_at desc);
```

Location index:
- If PostGIS is **not** enabled: fallback composite index:

```sql
create index if not exists idx_requests_lat_lon
  on public.requests(latitude, longitude);
```

- If PostGIS **is** enabled: a GiST index is used (optional). (This project did not detect PostGIS at apply time.)

---

## Executed SQL (final applied)

This is the final SQL content (as executed, excluding the initial failed `BEGIN/COMMIT` wrapper attempt).

> Order matters: legacy status constraint was dropped, legacy statuses normalized, then the final contract constraint was added.

### Step A — Drop old status check (to allow normalization)

```sql
alter table public.requests drop constraint if exists requests_status_check;
```

### Step B — Normalize existing rows to allowed status set

```sql
update public.requests
set status = 'pending'
where status is null
   or status not in ('pending','assigned','en_route','completed','canceled');
```

### Step C — Apply schema alignment + triggers + RLS + indexes

(See next block in this document.)
