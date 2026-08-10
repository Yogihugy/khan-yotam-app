-- Force traveler_type = 'staff' for non-guest roles (staff/admin).
-- Documents SQL already applied manually in the Supabase SQL Editor.
-- Closes the gap where client profile updates (RLS) could set any traveler_type.

-- Enforce that any user with role <> 'guest' (staff/admin) always has
-- traveler_type = 'staff', regardless of what the client sends.
-- This closes the gap where profile edits (which bypass the Express
-- server and write directly via Supabase client + RLS) could otherwise
-- let a staff/admin user set an arbitrary traveler_type.

CREATE OR REPLACE FUNCTION public.users_force_staff_traveler_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'guest' THEN
    NEW.traveler_type := 'staff';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_force_staff_traveler_type ON public.users;
CREATE TRIGGER users_force_staff_traveler_type
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_force_staff_traveler_type();

-- One-time backfill for existing staff/admin rows.
UPDATE public.users
SET traveler_type = 'staff'
WHERE role <> 'guest';
