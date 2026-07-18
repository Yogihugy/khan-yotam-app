# Khan Yotam — Wishlist / polish backlog

Informal list of future improvements and UX polish items. Not committed to a phase or timeline.

---

## Map & UI

1. **Emergency call bar tap affordance** — The emergency call bar ("חירום - לחצו להתקשר") doesn't visually look clickable/tappable — consider styling it more like a button (e.g. add a phone icon, button-style border/shadow, or a more prominent tap affordance) so users recognize at a glance that tapping it triggers a phone call.

## Sharing

1. **Short invite links** — Invite URLs currently expose the full raw invite_token (UUID) in the link, which is long and not user-friendly when shared/previewed (e.g. in WhatsApp link previews). Consider adding a short code (e.g. `/i/ab3f9k`) that maps to the real token server-side, so shared links are shorter and cleaner without changing the underlying auth/verify-invite logic.

## Rollout / onboarding

1. **Manual walkthrough video for Nir** — Create a short manual walkthrough video for Nir (first real user/admin) before sending him the production link. Show: opening the invite link, allowing location, viewing the map, using the distress button, and checking messages. Record on phone (mirrors his actual usage) with Hebrew narration. To be done just before sending him the invite.

2. **End-user manual for hikers/volunteers** — Write a short end-user manual (separate from Nir's admin walkthrough video) covering the basics for hikers/volunteers using the app: how to open the invite link and add it to your home screen, what the location permission prompt does and why to accept it, how the distress button works, what quiet mode means, and how to message another user. Keep it to one page. Could later become an in-app help screen.

3. **No self-service re-login after Disconnect** — Once a user taps "התנתקות" (Disconnect), their only way back in is an admin re-sending an invite via "הוספה + הזמנה" with their existing phone number (this does work today — it regenerates invite_token on their existing row — but there's no user-facing way to trigger it themselves, and no visible guidance telling them this is what's needed). Worth considering either a lightweight self-service re-request flow, or at minimum a clearer in-app message when someone lands on an expired/invalid invite explaining that they need to contact Khan Yotam for a new link (which the Expired Access screen partially does, but the "Invalid or used invite token" error on a stale link doesn't).

## Admin / Configuration

1. **Emergency phone number not editable via admin UI** — The top "חירום - לחצו להתקשר" bar reads its number from app_config.emergency_phone, but there's currently no admin UI to change it — it can only be updated via direct SQL. Consider adding a simple Settings/Config tab (or a field within an existing tab) so admins can update this number without developer/DB access. Note this is a different number from the Duty Officer contact (used for WhatsApp distress alerts) — both should probably be editable from the same place for clarity.
