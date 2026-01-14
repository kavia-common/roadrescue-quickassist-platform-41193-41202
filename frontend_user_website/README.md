# RoadRescue – QuickAssist (User Website)

User-facing website for submitting and tracking vehicle breakdown requests.

## Key flows

- Register / Login
- Submit Request (vehicle + issue + contact)
- My Requests list and Request detail view

## Auth & Data (Supabase-only)

This app uses **Supabase directly from the browser** for:

- Authentication (`supabase.auth.getUser`, `onAuthStateChange`, OAuth)
- User profile (`public.profiles`)
- Requests (`public.requests`)

### Required environment variables

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

If these are missing, the app will fail fast with a clear error (mock/demo mode has been removed).

See `../assets/supabase.md` for suggested table schemas and RLS notes.
