-- Phase B — ensure authenticated clients can call map RPC + read/write own rows
GRANT EXECUTE ON FUNCTION public.get_active_map_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_map_users() TO service_role;

GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_locations TO authenticated;
GRANT SELECT, INSERT ON public.location_history TO authenticated;
GRANT SELECT ON public.app_config TO authenticated;
GRANT SELECT ON public.users_public TO authenticated;
