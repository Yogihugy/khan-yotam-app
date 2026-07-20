-- Fix guest map peer visibility without widening public.users RLS.
-- live_locations SELECT used an EXISTS subquery on public.users, which guests
-- cannot read (users SELECT is self-or-admin only). That made the EXISTS always
-- false for other users, so guests only saw their own location row.

CREATE OR REPLACE FUNCTION public.is_user_active_on_map(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_is_active_on_map(u)
  FROM public.users u
  WHERE u.id = check_user_id
$$;

REVOKE ALL ON FUNCTION public.is_user_active_on_map(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_active_on_map(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active_on_map(uuid) TO service_role;

DROP POLICY IF EXISTS live_locations_select ON public.live_locations;
CREATE POLICY live_locations_select ON public.live_locations
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_user_active_on_map(live_locations.user_id)
  );
