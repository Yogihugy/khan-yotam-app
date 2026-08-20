-- Lock client JWTs out of privilege/account columns on public.users,
-- and stop guests from setting or keeping traveler_type = 'staff'.
-- Closes a privilege-escalation gap where any authenticated guest could
-- PATCH their own role / is_deleted / permanently_removed / traveler_type
-- via a crafted request (RLS only checked row ownership, not columns).
-- service_role / SQL editor (no JWT) are unaffected.

-- ---------------------------------------------------------------------------
-- A. Column-level UPDATE allowlist
-- Table-level UPDATE must be revoked first; otherwise column GRANTs are a no-op.
-- SELECT stays table-level (profile/admin reads of role, phone, etc. must keep working).
-- ---------------------------------------------------------------------------

REVOKE UPDATE ON TABLE public.users FROM authenticated;

GRANT UPDATE (
  name,
  first_name,
  last_name,
  bio,
  social_link,
  traveler_type,
  color,
  status,
  last_seen_at,
  last_location_at
) ON public.users TO authenticated;

-- ---------------------------------------------------------------------------
-- B. Escalation guard — authenticated JWT cannot change role / deletion flags
-- current_setting(..., true) is NULL with no JWT (SQL editor / postgres),
-- so the IF is false. service_role JWT is 'service_role', not 'authenticated'.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.users_guard_authenticated_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
       OR NEW.permanently_removed IS DISTINCT FROM OLD.permanently_removed THEN
      RAISE EXCEPTION 'users: role and deletion flags cannot be changed by the client';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_authenticated_escalation ON public.users;
CREATE TRIGGER users_guard_authenticated_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_guard_authenticated_escalation();

-- ---------------------------------------------------------------------------
-- C. Guests may never set or keep traveler_type = 'staff'
-- Non-guest (staff/admin) still forced to 'staff'.
-- Existing trigger users_force_staff_traveler_type is left in place;
-- only the function body is replaced.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.users_force_staff_traveler_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'guest' THEN
    NEW.traveler_type := 'staff';
  ELSIF NEW.traveler_type = 'staff' THEN
    -- guests may never set or keep 'staff'
    NEW.traveler_type := CASE
      WHEN TG_OP = 'UPDATE' AND OLD.traveler_type IS DISTINCT FROM 'staff'
        THEN OLD.traveler_type
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- One-time backfill (runs as migration/SQL editor — not an authenticated JWT).
UPDATE public.users
SET traveler_type = NULL
WHERE role = 'guest'
  AND traveler_type = 'staff';
