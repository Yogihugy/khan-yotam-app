# User Deletion Guide

Reference for permanently and fully deleting a user from the system — not
soft-delete (הסרה) or ban (חסימה), which intentionally keep the row and
allow reconnection with the same phone number. This guide is for cases
where the phone number must be completely free of history, so a future
invite/registration is treated as a brand-new user with zero memory of
the previous one.

## ⚠️ Before you start

- **This is irreversible.** There is no undo once these rows are deleted.
- **Deleting a user's messages deletes the conversation for the other
  participant too** — messages are a single shared row per message, not
  a separate copy per side. If you delete User A's messages, User B loses
  their copy of that conversation as well.
- **distress_calls rows may have safety/audit value** — think twice before
  deleting a user's distress call history, even in a test-cleanup context.
- Migrations 014 (staff traveler_type trigger) and 015 (column
  privilege lock + escalation guard) only affect `INSERT`/`UPDATE` via
  the `authenticated` Postgres role. They do not block `DELETE` run via
  the SQL Editor (postgres / service role).

## Every foreign key referencing public.users(id)

| Table.column | Cleans up automatically? |
|---|---|
| `activity_log.user_id` | No — must delete manually |
| `app_config.updated_by` | No — must delete/reassign manually |
| `banned_phones.banned_by` | Yes — `ON DELETE SET NULL` |
| `distress_calls.user_id` | No — must delete manually |
| `distress_calls.closed_by` | No — must delete/reassign manually |
| `duty_officer.set_by` | No — must delete/reassign manually |
| `emergency_protocol.updated_by` | No — must delete/reassign manually |
| `live_locations.user_id` | No — must delete manually |
| `location_history.user_id` | Yes — `ON DELETE CASCADE` |
| `messages.from_user_id` | No — must delete manually (see warning above) |
| `messages.to_user_id` | No — must delete manually (see warning above) |
| `poi.created_by` | No — must delete/reassign manually |

Also: `public.users.id` references `auth.users(id)` (no cascade either
direction) — Supabase Auth is a separate system from `public.users`.

## Deletion order

1. Check `banned_phones` for this phone number — remove the ban row if
   present (otherwise a future invite/registration to the same number
   will still be blocked even after everything else below is deleted).
2. Delete/reassign every blocking row from the table above (skip the two
   that auto-clean).
3. `DELETE FROM public.users WHERE id = '<user-id>';`
4. Delete the matching Supabase Auth user — via Dashboard
   (Authentication → Users → find by UUID or the synthetic email
   `u_<...>@users.khanyotam.local` → Delete user) or
   `auth.admin.deleteUser(id)`. This automatically cascades
   `auth.identities`, `auth.sessions`, and `auth.refresh_tokens` — no
   manual cleanup needed there.
5. Optional: clear old `otp_codes` rows for that phone number (not
   required — doesn't block anything).

## SQL template

Replace `<USER_ID>` and `<PHONE>` before running. Run manually in the
Supabase SQL Editor — never auto-applied.

```sql
-- 1. Remove any ban on this phone (safe no-op if none exists)
DELETE FROM public.banned_phones WHERE phone = '<PHONE>';

-- 2. Clear/reassign blocking references
DELETE FROM public.activity_log WHERE user_id = '<USER_ID>';
DELETE FROM public.live_locations WHERE user_id = '<USER_ID>';
DELETE FROM public.messages WHERE from_user_id = '<USER_ID>' OR to_user_id = '<USER_ID>';
DELETE FROM public.distress_calls WHERE user_id = '<USER_ID>' OR closed_by = '<USER_ID>';
DELETE FROM public.poi WHERE created_by = '<USER_ID>';
-- duty_officer.set_by / app_config.updated_by / emergency_protocol.updated_by:
-- only relevant if this user happens to be the one who last touched those
-- singleton config rows. Check first:
-- SELECT * FROM public.duty_officer WHERE set_by = '<USER_ID>';
-- SELECT * FROM public.app_config WHERE updated_by = '<USER_ID>';
-- SELECT * FROM public.emergency_protocol WHERE updated_by = '<USER_ID>';
-- If any match, reassign updated_by/set_by to another admin's id instead
-- of deleting the config row itself.

-- 3. Delete the user
DELETE FROM public.users WHERE id = '<USER_ID>';

-- 4. Verify
SELECT id, name, phone FROM public.users WHERE id = '<USER_ID>';
-- Expect: 0 rows
```

Then delete the matching Auth user via the Dashboard (step 4 above — not
SQL).
