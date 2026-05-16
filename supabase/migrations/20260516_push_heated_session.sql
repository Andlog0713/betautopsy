-- v1 of reactive heated-session push notifications. Two tables:
--   1. device_tokens — per-user APNs registrations. iOS posts here on
--      first launch after permission grant. The environment column drives
--      per-token APNs host routing (sandbox vs production), since one
--      user can have a dev TestFlight build + a prod App Store build
--      registered simultaneously.
--   2. notifications_sent — idempotency ledger. UNIQUE(user_id, kind,
--      ref_id) prevents duplicate pushes for the same logical event.
--      For heated_session, ref_id is "${normalized_date_iso}:${startTime}"
--      because session.id from the engine is a per-report sequence and
--      not stable across re-analyses of the same dataset.
--
-- Idempotent on re-run: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS,
-- CREATE INDEX IF NOT EXISTS, ADD CONSTRAINT wrapped in DO blocks.

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  bundle_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  inactive_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'device_tokens_user_token_unique'
  ) THEN
    ALTER TABLE device_tokens
      ADD CONSTRAINT device_tokens_user_token_unique UNIQUE (user_id, token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active
  ON device_tokens (user_id) WHERE inactive_at IS NULL;

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own device tokens" ON device_tokens;
CREATE POLICY "Users insert own device tokens" ON device_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own device tokens" ON device_tokens;
CREATE POLICY "Users read own device tokens" ON device_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own device tokens" ON device_tokens;
CREATE POLICY "Users update own device tokens" ON device_tokens
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE endpoint deferred to v1.1. No DELETE policy intentional.

CREATE TABLE IF NOT EXISTS notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'token_inactive')),
  apns_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_id UUID REFERENCES autopsy_reports(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_sent_idempotency_unique'
  ) THEN
    ALTER TABLE notifications_sent
      ADD CONSTRAINT notifications_sent_idempotency_unique UNIQUE (user_id, kind, ref_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_sent_user_kind
  ON notifications_sent (user_id, kind);

ALTER TABLE notifications_sent ENABLE ROW LEVEL SECURITY;

-- Server-only writes via service_role. Authenticated users can SELECT
-- their own rows for transparency / future UI.
DROP POLICY IF EXISTS "Users read own notifications_sent" ON notifications_sent;
CREATE POLICY "Users read own notifications_sent" ON notifications_sent
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
