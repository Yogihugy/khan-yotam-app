# Chan Yotam — SMS & Self-Registration: Project Brief

**Status:** Scoped, not yet built. Last updated: July 2026.

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

## Open decisions before build starts
1. Twilio account setup (not yet created)
2. Confirm Messages API (not Verify API) is the intended approach for OTP, per earlier scoping
3. Decide whether to build self-registration + removal model as one combined delivery, or
   phase it (e.g. SMS-for-distress first, self-registration later)
4. Pre-build code review (see below) — not yet done

## Recommendation: code review before starting

Given the scope of this change, a review pass is worth doing **before** writing any new
code, not after:

- This touches the **auth/identity model** (phone becomes the sole credential via OTP,
  replacing invite-link-as-credential)
- It changes a **UNIQUE constraint's real-world meaning** (phone reuse policy across
  soft-delete/hard-delete/re-registration)
- It adds a **new table** (`banned_phones`) that the registration path must check
- It touches **RLS policies**, the **distress alert send path**, and every place
  `is_deleted` is currently checked

A focused, investigate-only review (same methodology as everything else this session)
covering: the full current auth/invite flow, every `is_deleted` call site, current RLS
policies touching `users`/`live_locations`, and the distress alert handler — would surface
edge cases before they become half-built code. This is a bigger, more foundational change
than anything shipped so far; a review pass first is proportionate to that, not overkill.
