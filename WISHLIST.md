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

## Admin / Configuration

1. **Emergency phone number not editable via admin UI** — The top "חירום - לחצו להתקשר" bar reads its number from app_config.emergency_phone, but there's currently no admin UI to change it — it can only be updated via direct SQL. Consider adding a simple Settings/Config tab (or a field within an existing tab) so admins can update this number without developer/DB access. Note this is a different number from the Duty Officer contact (used for WhatsApp distress alerts) — both should probably be editable from the same place for clarity.

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
   - *Size/risk: Medium — needs browser/PWA push notification support (permissions, service worker push handling); well-trodden pattern but a real feature, not a tweak.*
