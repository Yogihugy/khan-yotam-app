-- Step 5 prep: allow phone reuse after permanent removal (ban), keep old row for audit.
-- Do not revive permanently_removed rows in ensureSelfRegUser (app change comes later).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS permanently_removed boolean NOT NULL DEFAULT false;

-- Drop table-level UNIQUE on phone (inline UNIQUE from 001 becomes users_phone_key).
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_phone_key;

-- At most one non-permanently-removed row per phone.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_active_unique
  ON public.users (phone)
  WHERE permanently_removed = false;
