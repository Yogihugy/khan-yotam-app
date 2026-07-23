# Chan Yotam — session context

Handoff notes for the live Sea Trail map PWA. For the original product spec see [`khan_yotam_v1_spec.md`](./khan_yotam_v1_spec.md). For polish backlog see [`WISHLIST.md`](./WISHLIST.md).

---

## Working methodology

1. **Investigate first.** When asked to investigate or fix something, investigate and report findings only — do not write, edit, or commit any code until explicitly told to proceed.
2. **Keep fixes local until approved.** After making changes, leave them uncommitted for review/testing. Never `git commit` or `git push` without explicit go-ahead in that same session.
3. **State commit status clearly.** Report whether a fix is committed, uncommitted-local, or not yet started. If a bug is reported “still broken” and a related fix is still uncommitted, check and mention that before re-diagnosing.

---

## 1. Stack / URLs

| Piece | Detail |
|-------|--------|
| Frontend | React + Vite + PWA on **Vercel** — https://khan-yotam-app.vercel.app |
| Backend | Node + Express on **Render** (`khan-yotam-api`) — https://khan-yotam-app.onrender.com |
| Database / Auth / Realtime | **Supabase** project `cnywcjfdadndlpnxpmkk` — https://cnywcjfdadndlpnxpmkk.supabase.co |
| Repo | https://github.com/Yogihugy/khan-yotam-app (`main`) |
| WhatsApp | WATI (still mocked on Render — invites log `[WATI MOCK]`; set `WATI_MOCK=false` + real credentials to go live) |
| Keep-alive | GitHub Actions cron → Render `/health` every ~14 min |

Local layout: `client/` (Vite), `server/` (Express), `supabase/migrations/`.

---

## 2. Current status

- **Phases A–D:** complete (auth/invite, map + location, chat + distress, admin / ChaML).
- **Phase E (production go-live):** complete and tested end-to-end on Vercel + Render + Supabase.
- In-app help page (`/help`) ships from Profile + map `?` control.

---

## 3. Recent fixes (shipped on `main`)

Earlier production hardening (still relevant):

- CORS (`CORS_ORIGIN`), Supabase env / anon-key fixes
- Map bounds widened to full Israeli coastline
- Sleep/wake GPS resume; InvitePage session-resume (don’t re-verify a consumed invite)
- Emergency UI clarity: top bar = `tel:` call; FAB = WhatsApp distress; cooldown **30s**
- Map HUD pills removed (“מיקום פעיל” / “האיקון שלי”)

More recent (this stretch of work):

- **Overlapping marker name-labels** — pixel clustering + vertical stack (`8929220`). Circles stay at true lat/lng; labels offset. Shared `MapView` (guest map + admin Full Map). Formerly WISHLIST Map & UI #2 — **resolved**.
- Distress FAB overlapping zoom controls — RTL `inset-inline-end` vs Leaflet `bottomleft` (`14d0a19`)
- Social invite link-preview meta (`og:title` / description / image, Twitter) (`9930f5c`, follow-ups)
- Personalized Hebrew WhatsApp invite greeting (`239b0be`) — confirmed via Render `[WATI MOCK]` logs / `mocked: true` activity rows
- Help page + map help control; Help back = `navigate(-1)`
- Wishlist additions: short invite links; no self-service re-login after Disconnect; emergency phone not editable in admin UI

---

## 4. Confirmed working end-to-end

- Invite → onboarding → map flow
- GPS / live location on the map (incl. close-marker label stacking)
- Distress alert + WATI mock path
- Real-time 1:1 chat
- Admin dashboard (all 7 tabs)
- Admin **הוספה + הזמנה** with an existing phone re-invites (regenerates `invite_token` on the same row + WhatsApp mock)
- GitHub Actions keep-alive against Render `/health`

---

## 5. Known test accounts still active

| Name | Role | Notes |
|------|------|--------|
| **Laptop Observer** | admin | Primary admin test account |
| **Sleep Test** | guest | Primary guest / phone test account |

All other one-off test users were cleaned up. Soft-delete is via admin **הסרה** (`is_deleted = true`).

---

## 6. Pending / not yet done

- **Yoav feedback** — invite **sent**; awaiting confirmation it works:  
  https://khan-yotam-app.vercel.app/invite/e705bca8-7b5f-4e4c-bc7f-85b67d798ba4  
  (`Yoav` / guest; not yet confirmed working)
- Record walkthrough video for **Nir** (WISHLIST Rollout #1)
- Short end-user manual for hikers/volunteers (WISHLIST Rollout #2; in-app `/help` already covers basics)
- Create **Nir’s** real admin invite when ready to onboard him
- Go-live WhatsApp: `WATI_MOCK=false` + real `WATI_*` credentials; template must support personalized `name` param
- `app_config.emergency_phone` is still the placeholder `+972500000001` (change via SQL until admin Settings UI exists)
- Open polish backlog: see **[`WISHLIST.md`](./WISHLIST.md)** (**6** open items: 1 Map & UI, 1 Sharing, 3 Rollout / onboarding, 1 Admin / Configuration). Do not duplicate here.

### Useful product facts (from recent investigation)

- **Disconnect** (`התנתקות`) only clears the local Supabase session — it does **not** set `users.status` to `offline`.
- Emergency call bar number ≠ Duty Officer phone (distress WhatsApp). No admin UI for `emergency_phone` yet.
- **Location tracking** only runs on MapPage (the map view), not when admin is browsing the admin dashboard alone. This is intentional — admin reviewing users/POIs/logs isn't "on the trail" and doesn't need their own location broadcast. If an admin wants their location tracked/visible, they need to have the map view open, same as any other user.

---

## 7. Where to look next

| Doc | Purpose |
|-----|---------|
| [`WISHLIST.md`](./WISHLIST.md) | Full open polish / UX backlog |
| [`khan_yotam_v1_spec.md`](./khan_yotam_v1_spec.md) | Original v1 product + schema spec |
| [`README.md`](./README.md) | Deploy checklist, env vars, phase status |
