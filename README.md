# Chan Yotam — Sea Trail App

Live-map PWA for the Sea Trail (Shvil HaYam). Hebrew RTL UI. Stack: React + Vite + PWA, Express, Supabase, Leaflet (Phase B+), WATI WhatsApp.

Spec: [`khan_yotam_v1_spec.md`](./khan_yotam_v1_spec.md)

## Phase E — Production go-live

Code is ready to ship. Deploy configs already in the repo:

| Piece | File |
|-------|------|
| Frontend (Vercel) | `vercel.json` |
| Backend (Render) | `render.yaml` |
| Keep-alive cron | `.github/workflows/keep-alive.yml` |
| Env template | `.env.example` |

**I cannot log into your Vercel / Render / GitHub accounts from here.** Follow the checklist below on your machine after the code is on GitHub.

### Order of operations

1. Push this repo to `Yogihugy/khan-yotam-app` (done when you finish the git push step).
2. Deploy **Render** API first → copy the public URL.
3. Deploy **Vercel** frontend with `VITE_API_URL` = that Render URL.
4. Set Render `CORS_ORIGIN` + `APP_URL` to the Vercel URL → **redeploy** Render.
5. Add GitHub Actions secret `RENDER_HEALTH_URL`.
6. Smoke-test production: `/health`, invite link, map, distress, `/admin`.

### Manual checklist (logins you must do)

#### A. GitHub (`Yogihugy/khan-yotam-app`)

- [ ] Confirm you can open https://github.com/Yogihugy/khan-yotam-app
- [ ] After push, verify latest commit is on `main`
- [ ] Settings → Secrets and variables → Actions → New repository secret:
  - Name: `RENDER_HEALTH_URL`
  - Value: `https://<your-render-service>.onrender.com/health` (fill after step B)

#### B. Render (backend) — workspace as you prefer (`khan-yotam`)

1. Log in at https://dashboard.render.com
2. **New → Blueprint** (uses `render.yaml`) **or** **New → Web Service** from GitHub repo `Yogihugy/khan-yotam-app`
3. If manual Web Service:
   - Root Directory: `server`
   - Build: `npm install`
   - Start: `npm start`
   - Health Check Path: `/health`
4. Environment variables (copy from your local `server/.env` / `.env.example` — **never commit secrets**):

| Key | Example / notes |
|-----|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` (Render may also inject `PORT`) |
| `SUPABASE_URL` | same as local |
| `SUPABASE_ANON_KEY` | same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (secret) |
| `CORS_ORIGIN` | set **after** Vercel exists, e.g. `https://your-app.vercel.app` |
| `APP_URL` | same Vercel URL (invite links) |
| `WATI_MOCK` | `true` for first prod smoke; later `false` + real WATI |
| `WATI_API_ENDPOINT` | optional until live WhatsApp |
| `WATI_API_KEY` | optional until live WhatsApp |
| `WATI_INVITE_TEMPLATE_NAME` | `invite_sea_trail` |
| `WATI_INVITE_TEMPLATE_LANGUAGE` | `he` |
| `GUEST_SESSION_DAYS` | `15` |
| `STAFF_SESSION_DAYS` | `365` |

5. Deploy → open `https://<service>.onrender.com/health` → expect `{ "ok": true, ... }`
6. Copy that base URL for Vercel (`VITE_API_URL`) and for the Actions secret.

#### C. Vercel (frontend)

1. Log in at https://vercel.com
2. **Add New… → Project** → Import `Yogihugy/khan-yotam-app`
3. Leave root as repo root (`vercel.json` builds `client/`)
4. Environment variables (Production):

| Key | Value |
|-----|--------|
| `VITE_SUPABASE_URL` | your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | anon key (safe for browser) |
| `VITE_API_URL` | `https://<your-render-service>.onrender.com` (**no** trailing slash) |
| `VITE_KHAN_LAT` | `32.6905` |
| `VITE_KHAN_LNG` | `34.9433` |
| `VITE_MAP_BOUNDS_SW` | `29.5,34.2` |
| `VITE_MAP_BOUNDS_NE` | `33.09,35.6` |
| `VITE_APP_NAME` | `Chan Yotam` |

5. Deploy → copy the `*.vercel.app` URL
6. Go back to Render → set `CORS_ORIGIN` and `APP_URL` to that Vercel URL → **Manual Deploy** so CORS updates
7. Optional: Vercel → Domains if you use a custom domain; then update Render `CORS_ORIGIN`/`APP_URL` again

#### D. GitHub Actions keep-alive

1. Repo → **Actions** → enable workflows if prompted
2. Confirm secret `RENDER_HEALTH_URL` is set (step A)
3. Actions → **Keep-alive Render API** → **Run workflow** (workflow_dispatch) once to verify
4. Cron runs every 14 minutes (`*/14 * * * *`) to reduce free-tier sleep

#### E. Supabase (production project)

- [ ] Migrations `001`–`004` applied on the **same** project used by Render/Vercel
- [ ] Realtime enabled for `live_locations`, `messages`, `distress_calls`
- [ ] Auth site URL / redirect allowlist includes your Vercel origin if required by your Supabase settings

#### F. Smoke test on production

- [ ] `GET {RENDER}/health`
- [ ] Open Vercel app → invite flow (create invite via local script targeting prod `APP_URL`, or ChaML **משתמשים**)
- [ ] Map + GPS
- [ ] Distress (expect `[WATI MOCK]` in Render logs if `WATI_MOCK=true`)
- [ ] Chat between two browsers
- [ ] `/admin` as admin

### Spec note

Spec §9 “Phase E” also lists offline data purge / pg_cron / backups / device QA. Those are **post-deploy polish** and are tracked separately after go-live.

## Phase D status

Admin / ChaML dashboard: full map (quiet/stale + 24h trail), distress alerts (audio/flash) + incident log, user management (invite/remove/extend), POI CRUD, emergency protocol editor, duty officer, activity log filters.

Open as admin: `/admin` (also **ניהול** in the bottom nav).

Run in Supabase SQL Editor:

- `supabase/migrations/002_phase_b_grants.sql`
- `supabase/migrations/003_phase_c_grants.sql`
- `supabase/migrations/004_phase_d_grants.sql`

## Phase C status

Communication + distress: 1-on-1 chat, `POST /api/distress` + WhatsApp mock, IndexedDB offline queue, offline banner + map cache, read-only POI.

## Phase B status

Core map experience: onboarding + location permission, Leaflet/OSM map, smart GPS upserts (10 m / 2 min heartbeat + history), freshness icons, Chan Yotam POI, quiet-mode status toggle, profile screen, expired-access gate.

## Repo layout

```
client/                 React + Vite + PWA
server/                 Express API (secrets, WhatsApp, invite/auth)
supabase/migrations/    SQL schema, indexes, RLS, realtime
.github/workflows/      Keep-alive cron (infrastructure, not app code)
vercel.json             Frontend deploy
render.yaml             Backend deploy blueprint
```

## Prerequisites

- Node.js 20+
- Supabase project
- GitHub repo (this one)
- Vercel account (frontend)
- Render account (backend)
- WATI account (optional for Phase A — mock mode works)

## 1. Environment

```bash
cp .env.example .env
# Also copy Vite vars into client/.env for local frontend:
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
```

Fill Supabase URL/keys. Keep `WATI_MOCK=true` until WATI credentials + template are ready.

## 2. Supabase schema

In the Supabase SQL Editor, run the full contents of:

`supabase/migrations/001_initial_schema.sql`

Then enable Realtime for `live_locations`, `messages`, and `distress_calls` in the dashboard if the publication alter did not apply (Dashboard → Database → Publications).

## 3. Seed first admin + config

```bash
cd server
npm install
npm run seed
```

Creates:

- Admin in `auth.users` + `public.users`
- `app_config.emergency_phone`
- Singleton `duty_officer` row
- Singleton `emergency_protocol` row

## 4. Local run

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm install && npm run dev
```

- API: `http://localhost:3001/health`
- App: `http://localhost:5173`

### Invite flow (local)

```bash
cd server
npm run create-invite -- "Test Guest" "+972501234567" guest
```

Open the printed `inviteUrl` (or `/invite/<token>`). Complete profile. Session is stored via Supabase refresh token in `localStorage`.

## Auth / API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/verify-invite` | Body `{ token }` → session + profile flag |
| POST | `/auth/complete-profile` | Bearer token + `{ name, traveler_type, color }` |
| POST | `/api/distress` | Bearer token + `{ client_request_id, lat?, lng? }` → save + WhatsApp |
| GET | `/health` | Keep-alive / uptime |

Invite **creation** (auth user + `public.users` + token + WhatsApp) is implemented as `createInvitedUser` (seed helper + Phase D admin API). `verify-invite` mints the session; `complete-profile` finalizes fields and nulls `invite_token`.

## WhatsApp (WATI)

- Mock: `WATI_MOCK=true` logs the message (default for local).
- Live: set `WATI_API_ENDPOINT`, `WATI_API_KEY`, `WATI_MOCK=false`, and an approved template name in `WATI_INVITE_TEMPLATE_NAME`.

## Deploy

### Frontend — Vercel

1. Import `Yogihugy/khan-yotam-app` in Vercel.
2. Root directory: repo root (uses `vercel.json`).
3. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (Render URL), optional map/khan vars from `.env.example`.
4. Deploy.

### Backend — Render

1. New Web Service from the same GitHub repo, or apply `render.yaml`.
2. Root directory: `server`.
3. Build: `npm install` · Start: `npm start`.
4. Set env vars from `.env.example` (server section). Set `CORS_ORIGIN` to the Vercel URL, `APP_URL` to the Vercel URL.
5. Confirm `GET https://<service>.onrender.com/health` returns `{ ok: true }`.

### Keep-alive (GitHub Actions)

1. Repo → Settings → Secrets → Actions.
2. Add `RENDER_HEALTH_URL` = `https://<service>.onrender.com/health`.
3. Workflow `.github/workflows/keep-alive.yml` pings every 14 minutes.
4. When upgrading off Render free tier, **delete that workflow file only** — no app code change.

## Upgrade posture (spec §12)

- All config via environment variables
- Keep-alive is infrastructure (Actions), not application logic
- Multi-chan is DB/POI-driven
- Express stays lean (secrets + WhatsApp + invite/auth)

## Phase boundary

Phases A–D are implemented. Production deploy checklist is under **Phase E — Production go-live** above. Spec polish items (pg_cron purge, Drive backups, device matrix) remain optional follow-ups.
