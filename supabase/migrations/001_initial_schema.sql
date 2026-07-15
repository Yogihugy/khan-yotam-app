-- Khan Yotam V1 — initial schema (tables, indexes, RLS, realtime)
-- Run in Supabase SQL Editor or via supabase db push

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'guest'
    CHECK (role IN ('guest', 'staff', 'admin')),
  traveler_type text
    CHECK (traveler_type IS NULL OR traveler_type IN ('hiker', 'cyclist', 'staff', 'other')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'quiet', 'offline')),
  color text NOT NULL DEFAULT '#3498DB',
  last_seen_at timestamptz,
  last_location_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  invite_token uuid UNIQUE,
  invite_expires_at timestamptz,
  is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.live_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) UNIQUE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy float,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy float,
  recorded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL,
  from_user_id uuid NOT NULL REFERENCES public.users(id),
  to_user_id uuid NOT NULL REFERENCES public.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.distress_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id uuid UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id),
  lat double precision,
  lng double precision,
  triggered_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid REFERENCES public.users(id),
  notes text,
  whatsapp_sent boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.poi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  type text NOT NULL CHECK (type IN ('khan', 'parking', 'water', 'warning', 'other')),
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emergency_protocol (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002',
  content text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES public.users(id),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  event_type text NOT NULL
    CHECK (event_type IN ('login', 'logout', 'distress', 'status_change', 'invite_sent')),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.duty_officer (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  name text NOT NULL,
  phone text NOT NULL,
  backup_name text,
  backup_phone text,
  set_by uuid REFERENCES public.users(id),
  set_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_by uuid REFERENCES public.users(id),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS messages_thread_id_idx ON public.messages (thread_id);
CREATE INDEX IF NOT EXISTS location_history_user_recorded_idx
  ON public.location_history (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS users_invite_token_idx
  ON public.users (invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
CREATE INDEX IF NOT EXISTS users_status_active_idx
  ON public.users (status) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(is_deleted, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_active_on_map(u public.users)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(u.is_deleted, false) = false
    AND u.status = 'active'
    AND u.last_location_at IS NOT NULL
    AND u.last_location_at > now() - interval '30 minutes';
$$;

-- Public profile view: excludes phone for non-admin consumers
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
  is_deleted
FROM public.users
WHERE COALESCE(is_deleted, false) = false;

-- Active users helper for map (Phase B will call this via RPC)
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
    u.is_deleted
  FROM public.users u
  WHERE public.current_user_is_active_on_map(u)
    AND (
      public.is_admin()
      OR u.id = auth.uid()
      OR u.status = 'active'
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distress_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_protocol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_officer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- users
DROP POLICY IF EXISTS users_select_self_or_admin ON public.users;
CREATE POLICY users_select_self_or_admin ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS users_update_self_or_admin ON public.users;
CREATE POLICY users_update_self_or_admin ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- No direct INSERT from clients: Express service role creates rows.

-- live_locations
DROP POLICY IF EXISTS live_locations_select ON public.live_locations;
CREATE POLICY live_locations_select ON public.live_locations
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = live_locations.user_id
        AND public.current_user_is_active_on_map(u)
    )
  );

DROP POLICY IF EXISTS live_locations_insert_own ON public.live_locations;
CREATE POLICY live_locations_insert_own ON public.live_locations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS live_locations_update_own ON public.live_locations;
CREATE POLICY live_locations_update_own ON public.live_locations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- location_history
DROP POLICY IF EXISTS location_history_select ON public.location_history;
CREATE POLICY location_history_select ON public.location_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS location_history_insert_own ON public.location_history;
CREATE POLICY location_history_insert_own ON public.location_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- messages
DROP POLICY IF EXISTS messages_select_own ON public.messages;
CREATE POLICY messages_select_own ON public.messages
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS messages_insert_own ON public.messages;
CREATE POLICY messages_insert_own ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS messages_update_own ON public.messages;
CREATE POLICY messages_update_own ON public.messages
  FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- distress_calls: Express (service role) inserts; admin reads/updates
DROP POLICY IF EXISTS distress_calls_admin_select ON public.distress_calls;
CREATE POLICY distress_calls_admin_select ON public.distress_calls
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS distress_calls_admin_update ON public.distress_calls;
CREATE POLICY distress_calls_admin_update ON public.distress_calls
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- poi: authenticated read; admin write
DROP POLICY IF EXISTS poi_select_all ON public.poi;
CREATE POLICY poi_select_all ON public.poi
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS poi_admin_insert ON public.poi;
CREATE POLICY poi_admin_insert ON public.poi
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS poi_admin_update ON public.poi;
CREATE POLICY poi_admin_update ON public.poi
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS poi_admin_delete ON public.poi;
CREATE POLICY poi_admin_delete ON public.poi
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- emergency_protocol: authenticated read; admin write
DROP POLICY IF EXISTS emergency_protocol_select ON public.emergency_protocol;
CREATE POLICY emergency_protocol_select ON public.emergency_protocol
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS emergency_protocol_admin_update ON public.emergency_protocol;
CREATE POLICY emergency_protocol_admin_update ON public.emergency_protocol
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS emergency_protocol_admin_insert ON public.emergency_protocol;
CREATE POLICY emergency_protocol_admin_insert ON public.emergency_protocol
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- activity_log: admin read; inserts via service role / security definer later
DROP POLICY IF EXISTS activity_log_admin_select ON public.activity_log;
CREATE POLICY activity_log_admin_select ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- duty_officer: authenticated read; admin write
DROP POLICY IF EXISTS duty_officer_select ON public.duty_officer;
CREATE POLICY duty_officer_select ON public.duty_officer
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS duty_officer_admin_update ON public.duty_officer;
CREATE POLICY duty_officer_admin_update ON public.duty_officer
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS duty_officer_admin_insert ON public.duty_officer;
CREATE POLICY duty_officer_admin_insert ON public.duty_officer
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- app_config: authenticated read (emergency_phone); admin write
DROP POLICY IF EXISTS app_config_select ON public.app_config;
CREATE POLICY app_config_select ON public.app_config
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS app_config_admin_upsert ON public.app_config;
CREATE POLICY app_config_admin_upsert ON public.app_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime publications
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.distress_calls;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- Singleton stubs (safe to re-run; seed script fills real values)
-- ---------------------------------------------------------------------------

INSERT INTO public.emergency_protocol (id, content)
VALUES ('00000000-0000-0000-0000-000000000002', '')
ON CONFLICT (id) DO NOTHING;
