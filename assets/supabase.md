# Supabase integration (RoadRescue – QuickAssist)

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

## Database schema (implemented)

### `public.profiles`

Used for roles and mechanic profile data.

Columns:

- `id` (uuid, PK) — references `auth.users(id)` (cascade delete)
- `role` (text) — defaults to `user` (used for RLS role checks)
  - expected values in this MVP: `user`, `mechanic`, `approved_mechanic`, `admin`
- `display_name` (text, nullable)
- `service_area` (text, nullable)
- (may exist from earlier iterations): `full_name`, `created_at`

### `public.requests`

Stores breakdown requests and assignment/status.

Required fields for this subtask (now present):

- `user_id` (uuid, NOT NULL) — references `auth.users(id)` (cascade delete)
- `status` (text, defaults to `open`)
- `lat` (double precision, nullable)
- `lon` (double precision, nullable)
- `address` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz, defaults to now())

Other columns may already exist (vehicle fields, contacts, assignment fields, etc.) and are left intact.

### Automatic `updated_at`

A trigger updates `requests.updated_at` on every update (if `updated_at` column exists).

## RLS (Row Level Security) (implemented)

Because the JS code reads/writes directly from the browser, RLS must allow the required operations.

### Helper functions (used by policies)

- `public.is_admin()` returns true if `profiles.role = 'admin'` for `auth.uid()`
- `public.is_mechanic()` returns true if role is in `('mechanic','approved_mechanic','admin')`

### `public.profiles` policies

Enabled: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`

Policies:

- **Self read**: authenticated users can `SELECT` their own profile row
- **Self insert**: authenticated users can `INSERT` their own profile row (id must equal `auth.uid()`)
- **Self update**: authenticated users can `UPDATE` their own profile row
- **Admin read**: admins can `SELECT` all profiles
- **Admin update**: admins can `UPDATE` all profiles

### `public.requests` policies

Enabled: `ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;`

Policies:

- **User insert**: authenticated users can `INSERT` requests only when `user_id = auth.uid()`
- **User read**: authenticated users can `SELECT` their own requests (`user_id = auth.uid()`)
- **User update**: authenticated users can `UPDATE` their own requests (`user_id = auth.uid()`)

Mechanic/admin access for the mechanic portal/admin panel:

- **Mechanic read**: mechanics can `SELECT` requests
- **Mechanic update**: mechanics can `UPDATE` requests that are either:
  - unassigned (`assigned_mechanic_id is null`) to allow accepting, OR
  - assigned to them (`assigned_mechanic_id = auth.uid()`)

- **Admin read**: admins can `SELECT` all requests
- **Admin update**: admins can `UPDATE` all requests

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
