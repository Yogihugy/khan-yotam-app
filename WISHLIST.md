# Chan Yotam — Wishlist / polish backlog

Informal list of future improvements and UX polish items. Not committed to a phase or timeline.

---

## Map & UI

1. **Emergency call bar tap affordance** — The emergency call bar ("חירום - לחצו להתקשר") doesn't visually look clickable/tappable — consider styling it more like a button (e.g. add a phone icon, button-style border/shadow, or a more prominent tap affordance) so users recognize at a glance that tapping it triggers a phone call.

2. **POI marker visual design — low priority polish** — POI markers currently use a dark rounded-square shape with a small dot/symbol inside (recently resized smaller, ~75% of original). This works functionally but could be improved for better visual quality — worth revisiting when there's time for a proper design pass, similar to the teardrop pin redesign already done for user markers. Not urgent; current version is acceptable for now.

## Sharing

1. **Short invite links** — Invite URLs currently expose the full raw invite_token (UUID) in the link, which is long and not user-friendly when shared/previewed (e.g. in WhatsApp link previews). Consider adding a short code (e.g. `/i/ab3f9k`) that maps to the real token server-side, so shared links are shorter and cleaner without changing the underlying auth/verify-invite logic.

## Rollout / onboarding

1. **Manual walkthrough video for Nir** — Create a short manual walkthrough video for Nir (first real user/admin) before sending him the production link. Show: opening the invite link, allowing location, viewing the map, using the distress button, and checking messages. Record on phone (mirrors his actual usage) with Hebrew narration. To be done just before sending him the invite.

2. **End-user manual for hikers/volunteers** — Write a short end-user manual (separate from Nir's admin walkthrough video) covering the basics for hikers/volunteers using the app: how to open the invite link and add it to your home screen, what the location permission prompt does and why to accept it, how the distress button works, what quiet mode means, and how to message another user. Keep it to one page. Could later become an in-app help screen.

3. **No self-service re-login after Disconnect** — Once a user taps "התנתקות" (Disconnect), their only way back in is an admin re-sending an invite via "הוספה + הזמנה" with their existing phone number (this does work today — it regenerates invite_token on their existing row — but there's no user-facing way to trigger it themselves, and no visible guidance telling them this is what's needed). Worth considering either a lightweight self-service re-request flow, or at minimum a clearer in-app message when someone lands on an expired/invalid invite explaining that they need to contact Chan Yotam for a new link (which the Expired Access screen partially does, but the "Invalid or used invite token" error on a stale link doesn't).

4. **Revisit /register OTP screen UI** — countdown display too large/visually dominant, confusing UX; resend button also needs review (specifics TBD on next design pass). Parked until self-registration flow is closer to going fully live.

5. **Two paths for self-registration discovery** — (1) Drafted a brief and visual mockup for a new section/page on the Chan Yotam Wix site (yotamwaysideinn.org) linking to /register, same-tab, for self-service sign-up. Pending: confirming who has Wix edit access (via Nir), and coordinating who builds it. (2) Direct link — the /register URL can also be sent standalone (SMS, WhatsApp, etc.) without going through the Wix site at all, landing straight on the phone-entry screen. Both paths lead to the same flow. Neither should go live/be sent until real SMS (Twilio) is active — otherwise visitors hit a dead end waiting for a verification code that never arrives.

6. **PWA update banner hard to notice** — The "יש עדכון חדש — לחצו לרענון" banner (added for fixing stale cached versions after deploys) is easy to miss/overlook in practice — real usage showed it wasn't visually prominent enough. Worth revisiting styling/placement to make it more noticeable.

## Admin / Configuration

1. **Emergency phone number not editable via admin UI** — The top "חירום - לחצו להתקשר" bar reads its number from app_config.emergency_phone, but there's currently no admin UI to change it — it can only be updated via direct SQL. Consider adding a simple Settings/Config tab (or a field within an existing tab) so admins can update this number without developer/DB access. Note this is a different number from the Duty Officer contact (used for WhatsApp distress alerts) — both should probably be editable from the same place for clarity.

2. **Activity log shows "logout" for ban/remove actions** — When an admin bans or removes a user, the activity log event type is 'logout' (with metadata.via: 'admin_permanent_ban' or 'admin_remove' correctly recorded), but the log's visible label just says "logout," which reads like a routine sign-out rather than an admin action. Fix should likely be display-layer only — read metadata.via and show a clearer label (e.g. "נחסם ע"י מנהל" / "הוסר ע"י מנהל") — without changing the underlying event_type or touching the ban/remove service logic.

3. **Fresh-start user cleanup** — Delete all current users except Ouri's account for a clean slate before real onboarding/Twilio SMS goes live. Needs investigation first: FK constraints referencing users (chat messages, distress alerts, activity_log, banned_phones, presence/location tables) and ON DELETE behavior, relationship between public.users and Supabase auth.users/identities for phone-based OTP, and whether any current test phones are already in banned_phones. Deliberately deferred until ready — do not execute any SQL yet.

## Future / v3 (from Nir's feedback session, July 2026)

See also: [SMS_SELFREG_BRIEF.md](./SMS_SELFREG_BRIEF.md) for the full scoping on SMS/self-registration.

1. **Self-service registration** — allow users to register directly via the Chan Yotam site without requiring admin pre-approval/invite. Admin retains ability to remove a user after the fact if they don't follow the rules.
   - *Size/risk: Medium→large. Today possession of the invite link IS the credential — no phone verification exists. Open registration without adding phone/WhatsApp verification (OTP-style) would let anyone register using someone else's phone number and receive their distress/invite traffic — should ship together with verification, not as a standalone smaller change. Also: soft-deleted users still hold a UNIQUE phone constraint, so "delete and re-register" needs a phone-reuse policy first.*

2. **Media attachments in distress chat** — allow attaching a photo or voice note to the emergency/distress alert, not just text.
   - *Size/risk: Small — additive to existing chat feature, no architecture change.*

3. **User groups + group messaging** — ability to create named user groups and send broadcast messages to a group, not just 1:1 chat.
   - *Size/risk: Medium — needs a groups table/relation and broadcast logic, but doesn't touch auth or alerting; can be built alongside existing chat.*

4. **WhatsApp voice calls (1:1 and group)** — actual voice calling via WhatsApp, beyond the current messaging/distress-alert flow.
   - *Size/risk: Medium — depends on what WATI's real (non-mock) API supports for calling vs. messaging; check vendor capabilities before any app-side design work.*

5. **Disclaimer text** — draft legal/liability disclaimer wording for the app (placement TBD — likely onboarding and/or distress flow).
   - *Size/risk: Small — pure content/copy, no engineering complexity, can ship independently anytime.*

6. **Duty officer logging + per-segment backups** — log every duty officer assignment for after-the-fact investigation purposes. Split the trail into segments (10) with a dedicated backup duty officer per segment, rather than one global backup.
   - *Size/risk: Large. No segment concept exists anywhere today (schema, admin UI, or map data) — current model is a single duty-officer row with primary + backup phone (max 2 numbers). Building segments requires a new data model (geometry/bounds per segment), admin CRUD, and geo-routing logic (map a user's GPS to a segment). Could be phased: first expand the duty-officer model to support more than 2 fixed numbers (small, no segments needed) as a stepping stone before full segment-based routing.*

7. **Distress alerts fan out to admin + all backups** — currently reaches at most 2 fixed numbers (primary + backup); should notify the admin (חמ"ל) and all backup duty officers, tied to the segment structure in item 6.
   - *Size/risk: Small→medium ON TOP of item 6 — the WhatsApp-sending loop already supports messaging N phones; the real work is resolving which recipients belong to a given segment, not building multi-recipient sending from scratch.*

8. **Audible + visible message notifications** — when a message arrives, trigger both a written/visible alert and a ringing/notification sound, not just a silent counter/badge.
   - *Size/risk: Medium — needs browser/PWA push notification support (permissions, service worker push handling); well-trodden pattern but a real feature, not a tweak. Real push notifications (app closed/backgrounded) only work on iOS 16.4+ and only if the user has "Added to Home Screen" — a regular Safari/Chrome tab cannot receive push on iOS at all. In-app notification (sound/badge while the app is open) is simple and platform-independent; background push is the harder, iOS-constrained part. Revisit platform mix once real users are on the app.*

9. **Media attachments in regular chat** — allow attaching photos, files, and voice notes to regular 1:1 messages, not just the distress/emergency chat (see item 2, which is distress-only and already scoped separately).
   - *Size/risk: Medium — broader than item 2's distress-chat scope; needs file upload/storage handling (Supabase Storage or similar), size limits, and UI for regular chat, not just the emergency flow. No urgency — decide scope once prioritized.*

10. **Optional quick-reason chips after distress alert** — After a distress alert is sent (never before/blocking it), show 3-4 optional tap-to-select reason chips (e.g. "נפצעתי" / "הלכתי לאיבוד" / "דרוש סיוע") so the duty officer has context before calling. The initial alert send must never be delayed, gated, or made to look incomplete without a reason — copy must clearly state "ההתראה כבר נשלחה" (the alert has already been sent) before offering the optional reason.
   - *Size/risk: Medium. New nullable reason column on distress_calls (separate from the existing admin-only notes column) + a small PATCH /api/distress/:id/reason endpoint, owner-only, only while closed_at IS NULL. v1 should NOT trigger a second SMS/WhatsApp — just update the admin קריאות מצוקה table; a follow-up outbound message to duty officers is a possible later enhancement, not required for v1. UI needs a layout change (current distress-wrap is too narrow, ~10.5rem, for 3-4 chips) and new copy shown only in the sent state (never during sending/waiting, to avoid the impression that a reason is required before help is dispatched). /help page (§5) would need a matching update to describe this optional step.*

11. **Role-based fixed marker colors (no user color picker)** — Instead of users choosing their own map marker color, assign a fixed color automatically by role (e.g. guest=blue, staff=green, admin=red), removing the color picker from registration/profile entirely.
   - *Size/risk: Small–medium. ~15 call sites read/write users.color today (registration, profile edit, map markers, popup, chat dots, admin lists, offline cache) — but the map/chat/admin UI itself doesn't need rewriting, since it can keep reading users.color as the source of truth; only the write paths (registration, profile, invite creation, and any future role-change path) need to switch to auto-assigning by role. Retroactively updating existing users' colors is a simple, low-risk one-time SQL UPDATE (no FK/constraint complications) — can be done together with the code change or deferred, product preference either way. Key trade-off to resolve before building: today, each user's individually-chosen color is the fastest way to visually distinguish nearby people on the map at a glance; switching to fixed role-based colors means all users of the same role look identical except for the initial-letter-on-marker, map position, and tapping the popup — worth deciding if that's an acceptable trade, or if a hybrid approach (e.g. role determines a color range, not one identical color) is worth the added complexity. Also: role changes must remember to update color too, not just the one-time backfill.*

12. **Revisit profile_complete check** — Currently checks traveler_type && name && color only, not first_name/last_name. This means existing users who already satisfy this triple will never be organically routed through CompleteProfilePage (or any form) to fill in the split name fields — ProfilePage is the only path. Worth deciding whether to update the completeness check itself once ProfilePage's edit UX is live and stable.
   - *Size/risk: small change, but touches profile-completeness gating logic used in three places (server invite, server OTP verify, client invite resume) — needs care.*

13. **Auto-dial voice call for distress alerts (in addition to SMS)** — When a distress alert is triggered, in addition to the existing SMS notification to the duty officer (+ backup), also place an automatic outbound voice call via Twilio Voice API that plays a recorded/TTS message (e.g. "Distress alert received from user X at location Y"). Rationale: a ringing phone call is harder to miss than an SMS, and doesn't depend on the affected user manually completing an additional tap/dial after pressing the distress button (current tel: link behavior, if that's confirmed as how it works today — worth verifying in a future investigate-first pass). Would use the same Twilio account being set up now for SMS; requires purchasing a number with Voice capability (worth doing now while buying the SMS number, even though the voice feature itself isn't built yet) and building a TwiML call flow — separate scoped project, not part of closing V1.
   - *Size/risk: medium — new Twilio Voice integration, TwiML scripting, and testing a live automated call flow; not urgent, but worth having the phone number capability ready for when this is prioritized.*
