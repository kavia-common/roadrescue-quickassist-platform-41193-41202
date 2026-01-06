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
