# Khan Yotam — Sea Trail App — V1 Technical Specification
**Version:** 1.1 (post Perplexity + Cursor review)  
**Date:** June 2026  
**Platform:** PWA (Progressive Web App)  
**UI Language:** Hebrew (RTL)  
**Code Language:** English  
**Stack:** React + Vite, Node.js/Express, Supabase (PostgreSQL + Realtime + Auth), Leaflet.js + OpenStreetMap, WhatsApp Business API (distress notifications)

---

## 1. Overview

A live-map PWA for the Sea Trail (Shvil HaYam) between Dado Beach (Haifa) in the north and Caesarea in the south — approximately 50 km. Active users appear on the map with their name and location. Users can chat directly with each other and trigger a distress alert that immediately notifies the Khan Yotam duty officer via WhatsApp.

**Khan Yotam coordinates:** `lat: 32.6905, lng: 34.9433`  
**Map bounding box:** `SW: 32.48, 34.88 — NE: 32.82, 34.98`

---

## 2. Roles & Permissions

| Level | Role | Capabilities | Session Duration |
|-------|------|--------------|-----------------|
| 1 | guest | Map, chat, distress button, quiet mode | 15 days |
| 2 | staff | All guest + read POI (v1) | 12 months |
| 3 | admin | Everything + ChaML dashboard + user management + protocol | No expiry |

> **POI management (add/edit/delete): admin only in v1.**  
> **traveler_type** field (hiker/cyclist/staff/other) is separate from **role** to avoid confusion.

---

## 3. Architecture Decisions

### 3.1 Frontend ↔ Backend split

| What | Where |
|------|-------|
| Map, chat, location updates, user profile | Frontend → Supabase directly (with RLS) |
| Distress alert + WhatsApp notification | Frontend → Express server |
| Invite creation + SMS/WhatsApp sending | Express server |
| Admin user management | Frontend → Express server |

Express server is kept lean — only for operations requiring server-side secrets (WhatsApp API key, invite logic, audit trail).

### 3.2 Auth Flow

**Two separate endpoints (decided):**
1. `POST /auth/verify-invite` — called on link open. Validates token, creates Supabase Auth user, returns partial session.
2. `POST /auth/complete-profile` — called on profile submit. Saves name, traveler_type, color. Full session active after this.

**Flow:**
1. Admin adds user in dashboard (name + phone + role)
2. Express generates `invite_token` (UUID, 48h expiry) and sends WhatsApp message:  
   *"Join the Sea Trail map — [link] (expires in 48 hours)"*
3. User opens link → `verify-invite` called → Supabase Auth user created with same UUID as `users.id`
4. Onboarding screen shown (explanation + location permission)
5. User completes profile → `complete-profile` called → row inserted in `public.users`
6. Session stored as Supabase refresh token in `localStorage` — auto-restored on app open, updates `last_seen_at`
7. **Phone number locked from invite** — displayed read-only in profile, cannot be changed
8. `invite_token` nulled out after use (kept as null for audit, not deleted)

**First admin:** created manually via Supabase dashboard (seed script provided in README).

### 3.3 "Active on Map" Policy

| Condition | Display |
|-----------|---------|
| `last_location_at` < 10 min ago | Shown on map, no timestamp |
| `last_location_at` 10–30 min ago | Shown with "last seen X min ago" |
| `last_location_at` > 30 min ago | Hidden from regular users; admin sees faded icon |
| status = quiet | Hidden from all users; admin sees distinct icon |

### 3.4 Row Level Security (RLS) — Key Policies

- `live_locations`: users see only `active` status rows; admin sees all
- `messages`: users see only their own conversations
- `users.phone`: never exposed to non-admin via API or RLS
- `distress_calls`: insert by any authenticated user; read/update by admin only
- `quiet` users: invisible to other users in all queries

### 3.5 Render Free Tier — Cold Start Solution

Render free tier sleeps after 15 min inactivity. Solution: a **keep-alive ping** — a lightweight cron job (GitHub Actions, free) that hits `GET /health` every 14 minutes. Zero cost, prevents cold starts on distress calls.

### 3.6 WhatsApp Provider (decided: WATI for v1)

WhatsApp Business API via **WATI free plan** for v1:
- Free up to 500 conversations/month — sufficient for pilot
- Faster setup than Meta direct API
- Can migrate to Meta direct in v2 if needed
- Distress message format:
  ```
  🆘 DISTRESS ALERT
  Name: [name] | Phone: [xxx]
  Location: https://maps.google.com/?q=[lat],[lng]
  Duty officer: [name]
  Time: [HH:MM]
  ```
- Sent to: primary duty officer WhatsApp + backup (from `duty_officer` table)
- **Day 1:** mock/stub acceptable. Real WATI integration required before Phase A is marked done.

### 3.7 Location Update Strategy

- Update sent to server only if user moved **more than 10 meters** from last position
- If stationary: update every **2 minutes** (heartbeat)
- `live_locations`: one row per user, upserted on every update
- `location_history`: insert every 5 minutes or on significant movement; auto-deleted after 24h

---

## 4. Screens

### 4.1 Onboarding (first launch only)

- App name + tagline
- One-sentence description: "See who's on the trail, chat, call for help"
- Location permission request (mandatory — with explanation)
- Distress button explanation: "The red button is for emergencies only — it will immediately alert Khan Yotam staff"
- "Got it, let's go" button → Profile screen
- **If location denied:** clear message with "Open Settings" button — app cannot function without GPS
- **Emergency phone number always visible** (configurable by admin in DB, not hardcoded)

### 4.2 Main Screen — Map

**Map:**
- OpenStreetMap via Leaflet.js
- Opens on user's current location (zoom 14)
- Default bounds: Dado Beach (N) to Caesarea (S)
- Standard controls: zoom in/out, "back to my location"

**Icons:**
- Active user: colored circle with initials + name above + timestamp if 10–30 min stale
- Own icon: bold border
- Quiet user: hidden from others; admin sees gray faded icon
- Khan Yotam: house icon with label at `32.6905, 34.9433`
- POI: icon by type (khan / parking / water / warning / other)
- Tap on user icon: popup with name + traveler_type + "Send message" button

**Distress button:**
- Red, prominent, fixed bottom-right
- No double confirmation
- States after tap:
  - ✅ Connected: "Alert sent ✓" (locked 60 seconds)
  - ⏳ No network: "Waiting for signal — trying to send" + bold message: "No signal — call directly: [emergency number]"
- Queued offline and retried automatically when connection returns
- **Emergency phone number displayed prominently at all times on every screen**

**Bottom navigation:**
- Map / Messages / Profile / Status (active · quiet · disconnect)

### 4.3 Messages Screen

- List of active conversations
- New conversation: pick from active users on map
- Chat: text only, RTL, Hebrew, stored 30 days
- Conversation identified by pair of user IDs (sorted, combined as `user_a_id:user_b_id`)

### 4.4 Profile Screen

Fields:
- Display name (required)
- Phone (read-only — locked from invite, shown for reference)
- Traveler type: hiker / cyclist / staff / other
- Icon color (8 options): `#E74C3C, #3498DB, #2ECC71, #F39C12, #9B59B6, #1ABC9C, #E67E22, #34495E`
- Save button

### 4.5 Status / Quiet Mode

Bottom nav button → modal:
- **Active** — visible to everyone
- **Quiet** — invisible to other users, can still see others; location known to admin only
- **Disconnect** — logs out

### 4.6 Expired Access Screen

Shown when session is valid but `expires_at` has passed:
- "Your access has expired"
- "Contact Khan Yotam to renew"
- Emergency number shown
- No way to bypass — blocked until admin manually renews

### 4.7 Admin / ChaML Dashboard

Accessible to admin role only. Optimized for desktop, functional on mobile.

**Tab A — Full Map:**
- All users including quiet (faded) and stale
- Click user: name, phone, traveler_type, last_location_at, last_seen_at
- "Show trail" button: 24h location history from `location_history`

**Tab B — Distress Calls:**
- Loud audio + red flash on new call
- Details: name, phone, last location (map link), time, 1h trail
- Buttons: "Call user" (tel: link) / "Close incident" + notes field
- Full log with open/close timestamps

**Tab C — User Management:**
- Full user list with role, expiry, status
- "Add user": name + phone + role → WhatsApp invite sent (48h token)
- "Remove user": immediate (soft delete + session revoke)
- "Extend access"

**Tab D — Points of Interest:**
- Add/edit/delete map markers
- Types: khan / parking / water / warning / other
- Name + short description

**Tab E — Emergency Protocol:**
- Free-text field Nier fills in
- Displayed to duty officer during distress call
- Example content: "1. Call user → 2. No answer: dispatch help to last location → 3. Injury: dial 101"

**Tab F — Duty Officer:**
- Prominent field at top: "Current duty officer: [name] | [phone]"
- Updated manually by admin on shift change
- Included in WhatsApp distress message

**Tab G — Activity Log:**
- Chronological: logins, logouts, distress events, status changes
- Filter by date / user / event type
- For reporting to the NGO

---

## 5. Distress Flow

```
User taps red button
        ↓
Button shows spinner: "Sending alert..."
        ↓
    Has connection?
    YES ──→ Server saves: timestamp + last location + user details
            Parallel:
              A. WhatsApp to primary duty officer + backup:
                 "🆘 DISTRESS — [name] | Phone: [xxx] | Location: [Google Maps link]
                  Duty officer: [name]"
              B. Bold alert in ChaML dashboard (audio + red flash)
            Button → "Alert sent ✓" (locked 60 sec)
        ↓
    NO  ──→ Saved locally (IndexedDB), auto-retry on reconnect
            Button → "⏳ Waiting for signal"
            Bold message: "No signal — call directly: [number]"
        ↓
Duty officer handles → clicks "Close incident" + short note
        ↓
Saved in distress_calls log
```

**Idempotency:** each distress request has a `client_request_id` (UUID generated on tap) — server ignores duplicates.

---

## 6. Database Schema

> **Critical:** `users.id` must equal `auth.users.id` (Supabase Auth UUID). This is required for all RLS policies using `auth.uid()`. Users are created in `auth.users` first (via Supabase Auth), then a matching row is inserted in `public.users` with the same UUID.

### users
```sql
id uuid PRIMARY KEY REFERENCES auth.users(id),  -- same UUID as Supabase Auth
name text NOT NULL,
phone text NOT NULL UNIQUE,                      -- one account per phone number
role text NOT NULL DEFAULT 'guest'               -- guest | staff | admin
  CHECK (role IN ('guest','staff','admin')),
traveler_type text                               -- hiker | cyclist | staff | other
  CHECK (traveler_type IN ('hiker','cyclist','staff','other')),
status text NOT NULL DEFAULT 'active'            -- active | quiet | offline
  CHECK (status IN ('active','quiet','offline')),
color text NOT NULL DEFAULT '#3498DB',
last_seen_at timestamptz,                        -- updated on app open / session restore
last_location_at timestamptz,                    -- updated on every location upsert
created_at timestamptz DEFAULT now(),
expires_at timestamptz,
invite_token uuid UNIQUE,                        -- nulled out after use
invite_expires_at timestamptz,
is_deleted boolean DEFAULT false
```

### live_locations
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid NOT NULL REFERENCES users(id) UNIQUE,  -- one row per user, upserted
lat double precision NOT NULL,
lng double precision NOT NULL,
accuracy float,
updated_at timestamptz DEFAULT now()
```

### location_history
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
lat double precision NOT NULL,
lng double precision NOT NULL,
accuracy float,
recorded_at timestamptz DEFAULT now()
-- auto-deleted after 24h via pg_cron
```

### messages
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
thread_id text NOT NULL,        -- sorted "userA_id:userB_id"
from_user_id uuid NOT NULL REFERENCES users(id),
to_user_id uuid NOT NULL REFERENCES users(id),
content text NOT NULL,
created_at timestamptz DEFAULT now(),
read_at timestamptz
-- auto-deleted after 30 days
```

### distress_calls
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
client_request_id uuid UNIQUE NOT NULL,   -- idempotency key generated on client
user_id uuid NOT NULL REFERENCES users(id),
lat double precision,
lng double precision,
triggered_at timestamptz DEFAULT now(),
closed_at timestamptz,
closed_by uuid REFERENCES users(id),
notes text,
whatsapp_sent boolean DEFAULT false
```

### poi
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
name text NOT NULL,
description text,
lat double precision NOT NULL,
lng double precision NOT NULL,
type text NOT NULL CHECK (type IN ('khan','parking','water','warning','other')),
created_by uuid REFERENCES users(id),
created_at timestamptz DEFAULT now()
```

### emergency_protocol
```sql
-- Single row, always upserted. Use fixed id.
id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002',
content text NOT NULL DEFAULT '',
updated_by uuid REFERENCES users(id),
updated_at timestamptz DEFAULT now()
```

### activity_log
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid REFERENCES users(id),
event_type text NOT NULL
  CHECK (event_type IN ('login','logout','distress','status_change','invite_sent')),
metadata jsonb,
created_at timestamptz DEFAULT now()
```

### duty_officer
```sql
-- Single row, always upserted. Use fixed id.
id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
name text NOT NULL,
phone text NOT NULL,
backup_name text,
backup_phone text,
set_by uuid REFERENCES users(id),
set_at timestamptz DEFAULT now()
```

### app_config
```sql
-- Key-value store for runtime config (e.g. emergency_phone number)
key text PRIMARY KEY,
value text NOT NULL,
updated_by uuid REFERENCES users(id),
updated_at timestamptz DEFAULT now()
```
> Seed on setup: `INSERT INTO app_config (key, value) VALUES ('emergency_phone', '+972XXXXXXXXX');`

---

### Required Indexes
```sql
CREATE INDEX ON messages(thread_id);
CREATE INDEX ON location_history(user_id, recorded_at DESC);
CREATE INDEX ON activity_log(created_at DESC);
CREATE INDEX ON activity_log(user_id);
CREATE INDEX ON users(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX ON users(role);
CREATE INDEX ON users(status) WHERE is_deleted = false;
```

---

### RLS Policy Design Notes

**Admin detection:** all RLS policies identify admin via `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')`. Express admin routes additionally verify role server-side using the Supabase service role key.

**live_locations:**
- Regular users: SELECT only rows where `users.status = 'active'` AND `users.last_location_at > now() - interval '30 minutes'` AND `users.is_deleted = false` (via join or security-definer RPC)
- Admin: SELECT all rows
- Any authenticated user: INSERT/UPDATE own row only (`user_id = auth.uid()`)

**users.phone privacy:**
- Non-admins never receive the `phone` column — enforced via a Supabase view `users_public` that excludes phone, used by all non-admin queries

**messages:**
- SELECT: `from_user_id = auth.uid() OR to_user_id = auth.uid()`
- INSERT: `from_user_id = auth.uid()`

**distress_calls:**
- INSERT: Express only (service role) — client never inserts directly
- SELECT/UPDATE: admin only

**quiet mode:**
- Users with `status = 'quiet'` are excluded from `live_locations` SELECT for non-admins (same join as above)
- Admin sees quiet users with a distinct visual indicator

---

### Realtime Publications
Enable replication for:
- `live_locations` — map updates
- `messages` — chat
- `distress_calls` — ChaML dashboard alerts

---

## 7. API Endpoints

### Auth
- `POST /auth/verify-invite` — validate token, create Supabase user, return session
- `POST /auth/complete-profile` — save display name, traveler_type, color

### Location (Supabase direct via RLS)
- Upsert `live_locations` — from frontend via Supabase client
- Insert `location_history` — from frontend every 5 min
- `GET /api/users/active` — returns users with `last_location_at > now() - 30 min` AND `status = active` (via Supabase RPC)

### Messages (Supabase direct via RLS + Realtime)
- All CRUD via Supabase client
- Realtime subscription on `messages` table filtered by `thread_id`

### Distress
- `POST /api/distress` — save call + send WhatsApp (idempotent via client_request_id)
- `PATCH /api/admin/distress/:id/close` — close incident
- `GET /api/admin/distress` — full log

### Admin — Users
- `POST /api/admin/users` — add user + send WhatsApp invite
- `DELETE /api/admin/users/:id` — soft delete + revoke session
- `PATCH /api/admin/users/:id/extend` — extend expiry

### Admin — Other
- `GET/PUT /api/admin/duty-officer` — get/set duty officer
- `GET/PUT /api/admin/protocol` — get/set emergency protocol text
- `GET/POST/PUT/DELETE /api/admin/poi` — POI management
- `GET /api/admin/activity-log` — filtered log
- `GET /health` — keep-alive ping endpoint

---

## 8. Infrastructure & Costs

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel | Free |
| Backend (Express) | Render Free | Free |
| Database + Auth + Realtime | Supabase Free Tier | Free |
| Map | OpenStreetMap + Leaflet.js | Free |
| Distress notifications | WhatsApp Business API | Free (≤1000 conv/month) |
| Keep-alive cron | GitHub Actions | Free |
| Domain (optional) | TBD | ~₪50/year |
| **Total v1** | | **~₪0/month** |

**Backups:**
- Supabase: daily automatic, 7 days retention
- Weekly export to Khan Google Drive (automated script)
- Code: GitHub

**Note on Express:** In v1, Express handles secrets and WhatsApp. In v2, consider migrating to Supabase Edge Functions to eliminate the separate server.

---

## 9. Development Checklist (revised order)

### Phase A — Foundation + Auth scaffold (Week 1)
- [ ] Create React + Vite + PWA project
- [ ] Supabase: create all tables, RLS policies, realtime config
- [ ] Express server setup + `/health` endpoint
- [ ] WhatsApp Business API integration (test message)
- [ ] Invite flow: generate token → send WhatsApp → verify → create Supabase session
- [ ] Seed first admin user via Supabase dashboard
- [ ] Initial deploy: Vercel + Render
- [ ] GitHub Actions keep-alive cron

### Phase B — Core map + location (Week 2)
- [x] Onboarding screen + location permission handling
- [x] Profile screen
- [x] Map with Leaflet + OpenStreetMap
- [x] Smart location updates (10m threshold / 2min heartbeat)
- [x] Live location upsert + location_history inserts
- [x] User icons on map with freshness policy (10/30 min thresholds)
- [x] Khan Yotam POI hardcoded at 32.6905, 34.9433
- [x] Quiet mode (status toggle)
- [x] Expired access screen

### Phase C — Communication + distress (Week 3)
- [x] 1-on-1 chat (Supabase Realtime)
- [x] Distress button — 3 states (sent / waiting / failed)
- [x] Offline distress queue (IndexedDB + retry)
- [x] No-connection screen with map cache
- [x] Emergency number from `app_config` table
- [x] POI display on map (read-only)

### Phase D — Admin / ChaML dashboard (Week 4)
- [x] Full map view with all users + quiet/stale indicators
- [x] Distress alerts (audio + visual) + incident log
- [x] User management (add/remove/extend) + WhatsApp invite
- [x] POI CRUD
- [x] Emergency protocol editor
- [x] Duty officer field (name + phone + backup)
- [x] Activity log with filters

### Phase E — Polish + hardening (Week 4–5)
- [x] Production deploy path documented (Vercel + Render + keep-alive)
- [ ] Auto-expiry enforcement (middleware check on every request)
- [ ] Auto-delete old data (location_history 24h, messages 30d) via pg_cron
- [ ] Weekly backup script to Google Drive
- [ ] iOS + Android device testing
- [ ] README + credentials doc for Nier

---

## 10. Infrastructure — Where It Lives

**Three locations:**
1. **Developer laptop** — code written in Cursor, local testing only
2. **GitHub** — code backup, source of truth, triggers auto-deploy
3. **Cloud (live 24/7)** — Vercel (frontend) + Render (Express) + Supabase (DB)

**Deploy flow:** `git push` → Vercel + Render auto-detect → live in 2–3 min.

**What Nier manages:** Supabase account, WhatsApp Business account, Vercel/Render accounts (can be transferred from developer later).

---

## 11. Not in V1 — Deferred to V2

- Real background GPS on iOS (requires React Native)
- iOS Push Notifications
- Group chat
- Accommodation booking / hostel management
- English / Arabic UI
- Additional khan locations (infrastructure already supports it — just add POI rows)
- Distress call cancellation
- Supabase Edge Functions (replace Express)
- Per-khan admin scope

---

## 12. Upgrade Path — V1 to V2+

### Cost Estimate

| Component | V1 (now) | V2 minimal | V2 comfortable |
|-----------|----------|------------|----------------|
| Supabase | Free | Pro — $25/mo | Pro — $25/mo |
| Render | Free | Starter — $7/mo | Standard — $25/mo |
| WhatsApp (WATI) | Free | Free | Growth — $49/mo |
| Vercel | Free | Free | Free |
| **Total** | **$0** | **~$32/mo** | **~$57–99/mo** |

**Most likely v2 scenario:** Supabase Pro + Render Starter = **$32/month** — covers multiple khans, hundreds of concurrent users, no cold starts, proper backups.

### What Triggers the Upgrade

| Signal | Action |
|--------|--------|
| Render cold starts affecting distress calls | Upgrade Render to Starter ($7/mo) immediately |
| DB approaching 500MB or needing longer backups | Upgrade Supabase to Pro ($25/mo) |
| More than 500 WhatsApp conversations/month | Upgrade WATI to Growth ($49/mo) |
| Adding 3+ khans with active user bases | Consider Supabase Pro for performance |

### What to Build Right in V1 (zero extra effort, big v2 payoff)

**1. All config via environment variables**
No hardcoded URLs, API keys, phone numbers, or service endpoints anywhere in code. Everything in `.env`. Switching from free to paid = changing one line.

```
# .env example
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
WATI_API_KEY=...
EMERGENCY_PHONE=...   ← from app_config, not hardcoded
KHAN_LAT=32.6905
KHAN_LNG=34.9433
```

**2. Multi-khan support is already DB-only**
The POI table handles all khan locations. Adding Khan #2 = insert one row in `poi` table with `type = 'khan'`. Zero code changes. The map renders all khans automatically.

**3. Keep-alive cron is infrastructure, not app code**
The GitHub Actions keep-alive ping lives outside the app. When upgrading to Render Starter (always-on), just delete the workflow file. No app code touched.

**4. No free-tier workarounds inside application logic**
Offline queue, cache, retries — these are good engineering regardless of tier. But nothing in the app should "know" it's on a free plan. Upgrade = change env vars + delete keep-alive cron.

**5. Per-khan admin scope (ready for v2)**
The `duty_officer` table and admin role are already global. When v2 adds per-khan admins, add a `khan_id` column to `users` and `duty_officer` — RLS policies extend naturally.

### V2 Feature Additions (no architectural changes needed)

| Feature | What's needed |
|---------|--------------|
| Additional khans | Insert POI rows, assign local admin users |
| Real background GPS on iOS | Migrate to React Native (separate project, same backend) |
| English / Arabic UI | Add i18n layer (react-i18next), translate strings |
| Accommodation booking | New tables + screens, same stack |
| Per-khan distress routing | Add `khan_id` to `duty_officer`, filter in Express |
| Push notifications (iOS) | React Native only |

### What to Tell Cursor

> Build with upgrade in mind:
> - All configuration via environment variables — no hardcoded values
> - Keep-alive cron is a GitHub Actions file, not application logic
> - Multi-khan support is purely DB-driven — no conditional code per location
> - Express stays lean — only secrets and WhatsApp logic; everything else via Supabase direct
> - No free-tier assumptions baked into app logic

- Real background GPS on iOS (requires React Native)
- iOS Push Notifications
- Group chat
- Accommodation booking / hostel management
- English UI
- Additional khan locations along the trail (infrastructure already supports it — just add POI)
- Distress call cancellation
- Supabase Edge Functions (replace Express)
