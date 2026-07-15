# Khan Yotam — Sea Trail App

Live-map PWA for the Sea Trail (Shvil HaYam). Hebrew RTL UI. Stack: React + Vite + PWA, Express, Supabase, Leaflet (Phase B+), WATI WhatsApp.

Spec: [`khan_yotam_v1_spec.md`](./khan_yotam_v1_spec.md)

## Phase A status

Foundation only: project scaffold, Supabase schema/RLS/Realtime, invite + auth endpoints, `/health`, seed script, Vercel/Render configs, GitHub Actions keep-alive. **Do not expect the map yet** (Phase B).

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

## Auth endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/verify-invite` | Body `{ token }` → session + profile flag |
| POST | `/auth/complete-profile` | Bearer token + `{ name, traveler_type, color }` |
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
- Multi-khan is DB/POI-driven
- Express stays lean (secrets + WhatsApp + invite/auth)

## Phase boundary

Stop at Phase A. Phase B starts map, location, quiet mode, expired-access screen.
