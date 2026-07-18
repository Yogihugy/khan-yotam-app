# Khan Yotam — Wishlist / polish backlog

Informal list of future improvements and UX polish items. Not committed to a phase or timeline.

---

## Map & UI

1. **Map HUD status pills** — The pills "מיקום פעיל" / "האיקון שלי על המפה" take up significant screen space on mobile and add little value for regular end users. Consider hiding them by default, making them more compact, or only showing them in a debug/admin context.

2. **Overlapping user marker labels** — When two or more user markers are close together on the map, their name labels overlap and become unreadable (e.g. "Sleep Test" and "Admin Test 2" overlapping). The colored circle icons can overlap fine, but the text labels above them should be separated/offset so each name stays legible, even when markers are stacked close together.

3. **Emergency call bar tap affordance** — The emergency call bar ("חירום - לחצו להתקשר") doesn't visually look clickable/tappable — consider styling it more like a button (e.g. add a phone icon, button-style border/shadow, or a more prominent tap affordance) so users recognize at a glance that tapping it triggers a phone call.

## Sharing

1. **Short invite links** — Invite URLs currently expose the full raw invite_token (UUID) in the link, which is long and not user-friendly when shared/previewed (e.g. in WhatsApp link previews). Consider adding a short code (e.g. `/i/ab3f9k`) that maps to the real token server-side, so shared links are shorter and cleaner without changing the underlying auth/verify-invite logic.

## Rollout / onboarding

1. **Manual walkthrough video for Nir** — Create a short manual walkthrough video for Nir (first real user/admin) before sending him the production link. Show: opening the invite link, allowing location, viewing the map, using the distress button, and checking messages. Record on phone (mirrors his actual usage) with Hebrew narration. To be done just before sending him the invite.

2. **End-user manual for hikers/volunteers** — Write a short end-user manual (separate from Nir's admin walkthrough video) covering the basics for hikers/volunteers using the app: how to open the invite link and add it to your home screen, what the location permission prompt does and why to accept it, how the distress button works, what quiet mode means, and how to message another user. Keep it to one page. Could later become an in-app help screen.
