-- banned_phones — permanent (but reversible) phone bans for hard-delete model.
-- Soft-delete continues to use users.is_deleted; this table only blocks re-registration
-- after a hard delete. Unban = DELETE the row (no history in v1).

CREATE TABLE IF NOT EXISTS public.banned_phones (
  phone text PRIMARY KEY,
  banned_at timestamptz NOT NULL DEFAULT now(),
  banned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason text
);

ALTER TABLE public.banned_phones ENABLE ROW LEVEL SECURITY;

-- Admin can list / add / remove bans (unban = DELETE).
DROP POLICY IF EXISTS banned_phones_admin_select ON public.banned_phones;
CREATE POLICY banned_phones_admin_select ON public.banned_phones
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS banned_phones_admin_insert ON public.banned_phones;
CREATE POLICY banned_phones_admin_insert ON public.banned_phones
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS banned_phones_admin_delete ON public.banned_phones;
CREATE POLICY banned_phones_admin_delete ON public.banned_phones
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS banned_phones_admin_update ON public.banned_phones;
CREATE POLICY banned_phones_admin_update ON public.banned_phones
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_phones TO authenticated;

-- Service role bypasses RLS and retains full access via default Supabase privileges;
-- invite / future OTP ban checks use getSupabaseAdmin() (service role).
