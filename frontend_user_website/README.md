# RoadRescue – QuickAssist (User Website)

User-facing website for submitting and tracking vehicle breakdown requests.

## Key flows

- Register / Login
- Submit Request (vehicle + issue + contact)
- My Requests list and Request detail view

## Auth & Data

This app supports two modes:

1. **Supabase mode** (recommended): if `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` are set, auth uses `supabase.auth` and data is persisted in Supabase tables.
2. **Mock mode** (default): if env vars are missing/empty, the app uses `localStorage` with seeded demo users and requests.

Demo accounts (mock mode):

- `user@example.com` / `password123`
- `mech@example.com` / `password123`
- `admin@example.com` / `password123`

See `../assets/supabase.md` for suggested table schemas.
