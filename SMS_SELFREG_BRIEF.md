# Chan Yotam — SMS & Self-Registration: Project Brief

**Status:** Backend built and deployed (mocked/safe). Frontend `/register` page is live but not yet linked from the main site. Last updated: July 2026.

## Goal
Replace the planned WhatsApp Business integration with SMS, and let hikers register
themselves directly via the Chan Yotam website instead of requiring admin-created invites.

## Why we moved off WhatsApp Business
- Required Meta business verification (days to weeks)
- Recurring monthly cost (~$60–70+/month) plus per-message fees
- Needed a dedicated phone number separate from personal WhatsApp
- Heavy overhead for what's fundamentally a low-volume, safety-critical feature

## The new approach: Twilio (or similar) SMS gateway

**Two uses, one integration:**
1. **Distress alerts** — same trigger as today (hiker presses distress button), but sent
   via SMS instead of WhatsApp to duty officer(s)
2. **OTP verification** — phone-based identity proof during self-registration (reuses the
   same SMS infrastructure, no separate vendor needed)

**Cost:** Pay-as-you-go, no forced subscription — roughly a few dollars/month at this app's
volume, versus WATI's $60–70+/month minimum.

**Complexity:** Low for the channel swap itself — the existing distress-alert code already
loops through a recipient list and calls a send function; swapping WATI for Twilio is a
small, contained change.

## Self-registration (the bigger piece)

Hikers register via a public landing page instead of receiving an admin-issued invite:
1. Enter phone number
2. Receive SMS OTP code
3. Enter code → account created → normal onboarding (name, traveler type, color)

**Scoped complexity: Medium** (down from an initial medium→large estimate, since it shares
Twilio infrastructure with distress alerts rather than needing separate verification tooling).

**What this eliminates:** No more invite links to send/manage for hikers. Admin invite flow
stays only for staff/admin onboarding.

## User removal model (needed to support self-registration safely)

Three states, replacing today's single delete flag:
- **Active** — normal
- **Soft delete** — reversible; same phone can self-register again later and silently
  reconnects to their existing record (no admin approval needed to return)
- **Hard delete + permanent ban** — for abuse/trolls; phone number is blocked from
  re-registering indefinitely, but **admin can view the ban list and lift a ban** if needed

**Technical approach:** Keep existing `is_deleted` flag for soft-delete; add a separate
`banned_phones` table for hard bans (this fits the "phone blocked even after the user row
is gone" requirement better than an enum approach).

**Combined scope (self-reg + full removal model):** Medium→large as one delivery — real
architecture work, not a quick add-on.

## Related, smaller pieces already scoped
- **Distress chat photo/voice attachments** — goes through the existing in-app chat (not
  SMS, since plain SMS can't carry media), small effort, reuses existing infrastructure
- **Unread message indicators** — parked, not urgent

## Decisions (resolved)

1. **Twilio account** — DONE (account created; SID / Auth Token configured)
2. **Messages API (not Verify API)** — CONFIRMED and implemented for OTP
3. **Phasing** — self-registration built as one delivery, following:
   phone-normalize → ban-table → OTP-request → OTP-verify → register-page
4. **Pre-build code review** — DONE (multiple investigate-only reviews completed before each step)

## Build progress

- **Shared phone normalization** (`server/src/lib/phone.js`) — also fixed a WhatsApp
  local-format (`05…`) send bug as a side effect
- **`banned_phones` table** + ban check wired into the admin invite flow
- **`otp_codes` table** + `POST /auth/register/request-otp` (rate-limited: 60s cooldown,
  5 requests/hour cap)
- **`POST /auth/register/verify-otp`** + `ensureSelfRegUser` — login for existing active
  users, silent reconnect for soft-deleted users, create for new users
- **Invite creation** now normalizes phone to E.164 (closed a legacy-format storage gap)
- **`/register` page** live at https://khan-yotam-app.vercel.app/register — **not** yet
  linked from GuestLanding (deliberate — still testing before going fully live)

## Remaining

- Admin banned-phones view (list + unban action) — not built yet
- Buy a real Twilio number / test live SMS send — currently `SMS_MOCK=true` everywhere
  (safe; no real messages sent)
- Link `/register` from GuestLanding when ready to launch to real users
- Currently mid-test: just fixed a missing `OTP_PEPPER` env var on Render; need to verify
  the full request-otp → verify-otp flow works end to end on the live site
