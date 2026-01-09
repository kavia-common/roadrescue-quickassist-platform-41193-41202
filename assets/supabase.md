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

## Current Supabase state (verified)

Tables currently present in `public` schema:

- `profiles`
- `requests`
- `assignments`
- `fees`

## IMPORTANT: Backend requirements attachment missing (BLOCKER)

The work item requires implementing a production-ready Supabase backend (schema, RLS, triggers, indexes) **per the authoritative `user_input_ref` attachment**.

However, the attachment file path provided to this agent did not exist in the runtime filesystem (file-not-found). As a result, this agent could not safely apply the required DDL/RLS/triggers/indexes because the authoritative specification could not be read.

### What to do next (for the next agent)

1. Re-attach the requirements document as `user_input_ref` (or provide a correct, existing file path).
2. Then implement backend in this strict order:
   - `SupabaseTool_list_tables`
   - `SupabaseTool_create_table` (for any missing tables)
   - `SupabaseTool_run_sql` (RLS policies, triggers, indexes, helper functions)
3. Update this `assets/supabase.md` with:
   - Final schema (tables/columns + relationships)
   - RLS policies per role (`user`, `mechanic`, `admin`)
   - Triggers (e.g., `updated_at`, automation)
   - Indexes and rationale (query patterns)

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
