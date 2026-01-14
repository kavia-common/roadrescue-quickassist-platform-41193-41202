# RoadRescue – QuickAssist (User Website)

User-facing website for submitting and tracking vehicle breakdown requests.

## Key flows

- Register / Login
- Submit Request (vehicle + issue + contact)
- My Requests list and Request detail view

## Auth & Data

This app supports two modes:

1. **Supabase mode** (recommended): if `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY` are set (and `REACT_APP_USE_MOCKS` is not enabled), auth uses `supabase.auth` and data is persisted in Supabase tables.
2. **Mock mode**:
   - **Explicit**: set `REACT_APP_USE_MOCKS=true` to force full offline mode (no network calls allowed).
   - **Fallback**: if Supabase env vars are missing/empty, the app uses `localStorage` with seeded demo users and requests.

### MOCK MODE (offline)

Set:

- `REACT_APP_USE_MOCKS=true`

Behavior:

- All network calls are blocked (Supabase, fetch, Twilio demo, reverse-geocoding).
- Authentication + requests + profile are served from local mock data (seeded and stored in localStorage).
- The UI should be fully navigable offline.

Demo accounts (mock mode):

- `user@example.com` / `password123`
- `mech@example.com` / `password123`
- `admin@example.com` / `password123`

See `../assets/supabase.md` for suggested table schemas.
