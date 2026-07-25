-- Chat peer display names without widening public.users RLS.
-- Callers get id/name/color/traveler_type only for peers they share a message
-- with (or if admin). No phone. Includes deleted/banned rows for history.

CREATE OR REPLACE FUNCTION public.get_chat_peer_profiles(peer_ids uuid[])
RETURNS TABLE (
  id uuid,
  name text,
  color text,
  traveler_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.name,
    u.color,
    u.traveler_type
  FROM public.users u
  WHERE u.id = ANY (peer_ids)
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.messages m
        WHERE (m.from_user_id = auth.uid() AND m.to_user_id = u.id)
           OR (m.to_user_id = auth.uid() AND m.from_user_id = u.id)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_chat_peer_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_peer_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_peer_profiles(uuid[]) TO service_role;
