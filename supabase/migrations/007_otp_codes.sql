-- otp_codes — Express-verified SMS OTP for self-registration (sub-step A).
-- Service role only: no authenticated/anon policies. Invite writes already use
-- the service-role admin client the same way.

CREATE TABLE IF NOT EXISTS public.otp_codes (
  phone text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count int NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Rolling-hour send budget (survives Render restarts; one row per phone)
  send_count_hour int NOT NULL DEFAULT 0,
  hour_window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies for authenticated/anon — clients cannot read or write.
-- Service role bypasses RLS for request-otp / future verify-otp.

REVOKE ALL ON public.otp_codes FROM anon, authenticated;
GRANT ALL ON TABLE public.otp_codes TO postgres, service_role;

-- Ensure ban checks from the API (service role) work after 006 was applied.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.banned_phones TO service_role;
