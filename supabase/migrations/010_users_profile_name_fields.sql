-- Split display identity: first_name / last_name + optional bio / social_link.
-- Approach A: keep public.users.name as the composed display string so existing
-- readers (map, chat, distress, admin joins, RPCs/views that select name) stay
-- unchanged. App write paths will sync name from first_name + last_name.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS social_link text;

-- Existing rows: put the whole historical name into first_name; leave last_name
-- NULL (cleaner than '') so "not set yet" is distinct from an explicit empty value.
UPDATE public.users
SET first_name = name
WHERE first_name IS NULL;
