-- Expose bio + social_link on the public map profile surface.
-- users_public is the SETOF return type for get_active_map_users; PG allows
-- CREATE OR REPLACE VIEW to append columns at the end only.
-- The RPC body lists columns explicitly (not SELECT *), so it must be updated
-- in lockstep with the view.
-- Grants/RLS unchanged: SELECT on users_public and EXECUTE on the RPC are
-- object-level (002_phase_b_grants.sql); no column-level restrictions.

CREATE OR REPLACE VIEW public.users_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  role,
  traveler_type,
  status,
  color,
  last_seen_at,
  last_location_at,
  created_at,
  expires_at,
  is_deleted,
  bio,
  social_link
FROM public.users
WHERE COALESCE(is_deleted, false) = false;

CREATE OR REPLACE FUNCTION public.get_active_map_users()
RETURNS SETOF public.users_public
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.name,
    u.role,
    u.traveler_type,
    u.status,
    u.color,
    u.last_seen_at,
    u.last_location_at,
    u.created_at,
    u.expires_at,
    u.is_deleted,
    u.bio,
    u.social_link
  FROM public.users u
  WHERE public.current_user_is_active_on_map(u)
    AND (
      public.is_admin()
      OR u.id = auth.uid()
      OR u.status = 'active'
    );
$$;
