# roadrescue-quickassist-platform-41193-41202

## Run all frontends (User + Mechanic + Admin)

This repo contains three independent React apps:

- `frontend_user_website` (port **3000**)
- `../roadrescue-quickassist-platform-41193-41204/frontend_mechanic_portal` (port **3001**)
- `../roadrescue-quickassist-platform-41193-41203/frontend_admin_panel` (port **3002**)

### Prerequisites

- Node.js + npm installed
- Any required environment variables present (e.g. Supabase keys if you want Supabase mode)

### Option A (recommended, cross-platform): root npm script

From this folder:

```bash
npm install
npm run start:all
```

Notes:
- `npm install` at this repo root runs a `postinstall` hook that installs **frontend_user_website** dependencies. This is required for CI (the linter runs `frontend_user_website` build).
- `npm run start:all` installs dependencies for **all three** frontends, then starts them with prefixed logs like `[user]`, `[mechanic]`, `[admin]`. It will stop all apps if any one exits.

### Option B (bash): run-all.sh

From this folder:

```bash
bash ./run-all.sh
```

- Handles Ctrl+C and kills child processes.
- Prefixes logs per app.

If you want to run it as `./run-all.sh`, make it executable:

```bash
chmod +x ./run-all.sh
./run-all.sh
```
