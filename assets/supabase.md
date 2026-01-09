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

Helper function used by RLS:

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
- `vehicle_make text`
- `vehicle_model text`
- `vehicle_plate text`
- `issue_description text`
- `address text`
- `user_email text`
- `assigned_mechanic_email text`

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

- `profiles(role)`, `profiles(approved)`
- `requests(requester_id)`, `requests(assigned_mechanic_id)`, `requests(status)`, `requests(submitted_at desc)`
- `requests(vehicle_plate)`, `requests(vehicle_make)`, `requests(vehicle_model)`, `requests(created_at)`, `requests(status)`
- `request_notes(request_id, created_at desc)`, `request_notes(author_id)`

## RLS policies (summary)

### `profiles`
- Select: self OR admin
- Insert: self only (id must equal `auth.uid()`)
- Update: self OR admin

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

> This is the SQL that was applied via `SupabaseTool_run_sql` (plus 2 `create_table` calls for `mechanic_profiles` and `request_notes`).

```sql
-- Enable required extensions
create extension if not exists pgcrypto;

-- ====== Schema adjustments to existing tables ======

-- profiles: ensure required columns exist
alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists approved boolean not null default false,
  add column if not exists display_name text,
  add column if not exists phone text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- requests: add lifecycle/assignment columns
alter table public.requests
  add column if not exists requester_id uuid,
  add column if not exists assigned_mechanic_id uuid,
  add column if not exists status text not null default 'new',
  add column if not exists submitted_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- ====== Foreign keys / constraints ======

-- mechanic_profiles: primary key + fk
alter table public.mechanic_profiles
  add constraint mechanic_profiles_pkey primary key (user_id);

alter table public.mechanic_profiles
  add constraint mechanic_profiles_user_fk foreign key (user_id)
  references auth.users(id) on delete cascade;

-- requests: link to auth.users and mechanic
alter table public.requests
  add constraint requests_requester_fk foreign key (requester_id)
  references auth.users(id) on delete set null;

alter table public.requests
  add constraint requests_assigned_mechanic_fk foreign key (assigned_mechanic_id)
  references auth.users(id) on delete set null;

-- request_notes: pkey + fks
alter table public.request_notes
  add constraint request_notes_pkey primary key (id);

alter table public.request_notes
  add constraint request_notes_request_fk foreign key (request_id)
  references public.requests(id) on delete cascade;

alter table public.request_notes
  add constraint request_notes_author_fk foreign key (author_id)
  references auth.users(id) on delete cascade;

-- ====== Helper functions for role/approval ======

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

create or replace function public.is_mechanic()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'mechanic';
$$;

create or replace function public.is_mechanic_approved(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'mechanic'
      and p.approved = true
  );
$$;

-- ====== Timestamp / lifecycle triggers ======

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- requests status lifecycle automation
create or replace function public.requests_status_lifecycle()
returns trigger
language plpgsql
as $$
begin
  -- Set submitted_at on insert if not provided
  if (tg_op = 'INSERT') then
    if new.submitted_at is null then
      new.submitted_at = now();
    end if;
    return new;
  end if;

  -- On update, set lifecycle timestamps on status transitions
  if (new.status is distinct from old.status) then
    if new.status = 'accepted' and new.accepted_at is null then
      new.accepted_at = now();
    elsif new.status = 'arrived' and new.arrived_at is null then
      new.arrived_at = now();
    elsif new.status = 'completed' and new.completed_at is null then
      new.completed_at = now();
    elsif new.status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at = now();
    end if;
  end if;

  return new;
end;
$$;

-- mechanic_profiles updated_at
drop trigger if exists trg_mechanic_profiles_updated_at on public.mechanic_profiles;
create trigger trg_mechanic_profiles_updated_at
before update on public.mechanic_profiles
for each row execute function public.set_updated_at();

-- profiles updated_at
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- requests updated_at
drop trigger if exists trg_requests_updated_at on public.requests;
create trigger trg_requests_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

-- requests lifecycle
drop trigger if exists trg_requests_lifecycle on public.requests;
create trigger trg_requests_lifecycle
before insert or update on public.requests
for each row execute function public.requests_status_lifecycle();

-- ====== Indexes ======

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_approved on public.profiles(approved);

create index if not exists idx_requests_requester_id on public.requests(requester_id);
create index if not exists idx_requests_assigned_mechanic_id on public.requests(assigned_mechanic_id);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_submitted_at on public.requests(submitted_at desc);

-- Option A (analytics/search columns + indexes)
alter table if exists public.requests
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_plate text,
  add column if not exists issue_description text,
  add column if not exists address text,
  add column if not exists user_email text,
  add column if not exists assigned_mechanic_email text;

create index if not exists idx_requests_vehicle_plate on public.requests (vehicle_plate);
create index if not exists idx_requests_vehicle_make on public.requests (vehicle_make);
create index if not exists idx_requests_vehicle_model on public.requests (vehicle_model);
create index if not exists idx_requests_created_at on public.requests (created_at);
create index if not exists idx_requests_status on public.requests (status);

create index if not exists idx_request_notes_request_id_created_at on public.request_notes(request_id, created_at desc);
create index if not exists idx_request_notes_author_id on public.request_notes(author_id);

-- ====== Row Level Security ======

-- PROFILES
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (
  auth.uid() = id
  or public.is_admin()
);

-- MECHANIC_PROFILES
alter table public.mechanic_profiles enable row level security;

drop policy if exists "mechanic_profiles_select_self_or_admin" on public.mechanic_profiles;
create policy "mechanic_profiles_select_self_or_admin" on public.mechanic_profiles
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "mechanic_profiles_upsert_self" on public.mechanic_profiles;
create policy "mechanic_profiles_upsert_self" on public.mechanic_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "mechanic_profiles_update_self_or_admin" on public.mechanic_profiles;
create policy "mechanic_profiles_update_self_or_admin" on public.mechanic_profiles
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- REQUESTS
alter table public.requests enable row level security;

-- requester can see own requests; approved mechanics can see all requests; admin can see all
drop policy if exists "requests_select_requester_mechanic_admin" on public.requests;
create policy "requests_select_requester_mechanic_admin" on public.requests
for select
using (
  public.is_admin()
  or (requester_id = auth.uid())
  or (public.is_mechanic() and public.is_mechanic_approved(auth.uid()))
);

-- requester can create a request for themselves
drop policy if exists "requests_insert_requester" on public.requests;
create policy "requests_insert_requester" on public.requests
for insert
with check (requester_id = auth.uid());

-- update rules: requester can update while new/pending; mechanics can update assigned; admin can update
-- NOTE: status transitions are not strictly enforced here; app should control allowed transitions.
drop policy if exists "requests_update_requester_mechanic_admin" on public.requests;
create policy "requests_update_requester_mechanic_admin" on public.requests
for update
using (
  public.is_admin()
  or (
    requester_id = auth.uid()
    and status in ('new','pending')
  )
  or (
    public.is_mechanic()
    and public.is_mechanic_approved(auth.uid())
    and assigned_mechanic_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or (
    requester_id = auth.uid()
    and status in ('new','pending')
  )
  or (
    public.is_mechanic()
    and public.is_mechanic_approved(auth.uid())
    and assigned_mechanic_id = auth.uid()
  )
);

-- allow approved mechanic to accept an unassigned request (set assigned_mechanic_id to self)
drop policy if exists "requests_accept_by_mechanic" on public.requests;
create policy "requests_accept_by_mechanic" on public.requests
for update
using (
  public.is_mechanic()
  and public.is_mechanic_approved(auth.uid())
  and assigned_mechanic_id is null
)
with check (
  assigned_mechanic_id = auth.uid()
);

-- REQUEST_NOTES
alter table public.request_notes enable row level security;

-- select: admin sees all; requester sees notes for own request; assigned approved mechanic sees notes
drop policy if exists "request_notes_select_allowed" on public.request_notes;
create policy "request_notes_select_allowed" on public.request_notes
for select
using (
  public.is_admin()
  or exists (
    select 1 from public.requests r
    where r.id = request_notes.request_id
      and r.requester_id = auth.uid()
  )
  or exists (
    select 1 from public.requests r
    where r.id = request_notes.request_id
      and r.assigned_mechanic_id = auth.uid()
      and public.is_mechanic()
      and public.is_mechanic_approved(auth.uid())
  )
);

-- insert: author must be requester, assigned approved mechanic, or admin
drop policy if exists "request_notes_insert_allowed" on public.request_notes;
create policy "request_notes_insert_allowed" on public.request_notes
for insert
with check (
  author_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1 from public.requests r
      where r.id = request_notes.request_id
        and r.requester_id = auth.uid()
    )
    or exists (
      select 1 from public.requests r
      where r.id = request_notes.request_id
        and r.assigned_mechanic_id = auth.uid()
        and public.is_mechanic()
        and public.is_mechanic_approved(auth.uid())
    )
  )
);

-- updates/deletes to notes: admin only
drop policy if exists "request_notes_update_admin" on public.request_notes;
create policy "request_notes_update_admin" on public.request_notes
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "request_notes_delete_admin" on public.request_notes;
create policy "request_notes_delete_admin" on public.request_notes
for delete
using (public.is_admin());
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
