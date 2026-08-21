-- Record server-side, timestamped consent to the privacy/terms policy.
-- localStorage-only onboarding completion is not relied on for legal consent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz;
