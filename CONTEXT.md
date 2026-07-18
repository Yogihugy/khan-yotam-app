# Khan Yotam — session context

Handoff notes for the live Sea Trail map PWA. For the original product spec see [`khan_yotam_v1_spec.md`](./khan_yotam_v1_spec.md). For polish backlog see [`WISHLIST.md`](./WISHLIST.md).

---

## 1. Stack / URLs

| Piece | Detail |
|-------|--------|
| Frontend | React + Vite + PWA on **Vercel** — https://khan-yotam-app.vercel.app |
| Backend | Node + Express on **Render** (`khan-yotam-api`) — https://khan-yotam-app.onrender.com |
| Database / Auth / Realtime | **Supabase** project `cnywcjfdadndlpnxpmkk` — https://cnywcjfdadndlpnxpmkk.supabase.co |
| Repo | https://github.com/Yogihugy/khan-yotam-app (`main`) |
| WhatsApp | WATI (currently `WATI_MOCK=true` on Render) |
| Keep-alive | GitHub Actions cron → Render `/health` every ~14 min |

Local layout: `client/` (Vite), `server/` (Express), `supabase/migrations/`.

---

## 2. Current status

- **Phases A–D:** complete (auth/invite, map + location, chat + distress, admin / ChaML).
- **Phase E (production go-live):** complete and tested end-to-end on Vercel + Render + Supabase.

---

## 3. Recent fixes (last session / recent commits)

- CORS config for Vercel ↔ Render (`CORS_ORIGIN`).
- Supabase env var placeholder bug.
- Duplicated anon key bug.
- Map bounds widened to the full Israeli coastline (was a narrow Hadera/Atlit strip).
- Sleep/wake GPS resume fix.
- InvitePage session-resume fix (don’t re-verify a consumed invite when a session already exists).
- Emergency UI clarity: top bar = phone call (`חירום - לחצו להתקשר`); FAB = WhatsApp distress (`הודעת מצוקה` + icon).
- Distress button anti-spam cooldown shortened to **30s**.
- Map HUD pill cleanup (removed always-on “מיקום פעיל” / “האיקון שלי על המפה”).
- Personalized Hebrew WhatsApp invite greeting (mock logs + live template params).
- Distress button / zoom-control overlap fix (RTL `inset-inline-end` was landing on Leaflet `bottomleft`).
- Social link-preview meta tags (`og:*` / Twitter) in `client/index.html`.

---

## 4. Confirmed working end-to-end

- Invite → onboarding → map flow
- GPS / live location on the map
- Distress alert + WATI mock path
- Real-time 1:1 chat
- Admin dashboard (all 7 tabs)
- GitHub Actions keep-alive against Render `/health`

---

## 5. Known test accounts still active

| Name | Role | Notes |
|------|------|--------|
| **Laptop Observer** | admin | Primary admin test account |
| **Sleep Test** | guest | Primary guest / phone test account |

Other one-off test users were cleaned up (or intended to be). Soft-delete is via admin **הסרה** (`is_deleted = true`).

---

## 6. Pending / not yet done

- **Send Yoav his test invite** — link already created:  
  https://khan-yotam-app.vercel.app/invite/8c711311-fb5c-45f2-9b08-d39645dd52ba  
  (`Yoav` / `+972524712888` / guest; expires ~48h from creation on 2026-07-18)
- Record walkthrough video for **Nir** (see WISHLIST rollout)
- Write short end-user manual for hikers/volunteers
- Create **Nir’s** real admin invite (when ready to onboard him)
- Several polish items tracked in **WISHLIST.md** (marker label overlap, emergency bar tap affordance, etc.)
- When going live with real WhatsApp: set `WATI_MOCK=false` and ensure the WATI template includes a `name` parameter matching the personalized invite

---

## 7. Where to look next

| Doc | Purpose |
|-----|---------|
| [`WISHLIST.md`](./WISHLIST.md) | Full polish / UX backlog |
| [`khan_yotam_v1_spec.md`](./khan_yotam_v1_spec.md) | Original v1 product + schema spec |
| [`README.md`](./README.md) | Deploy checklist, env vars, phase status |
