-- Phase 3 of the pre-bet check-in feature. Persists every successful
-- /api/check-in score plus the user's eventual decision (placed_anyway /
-- waited / placed_bet) submitted via /api/check-in/outcome. Closes the
-- longitudinal-memory loop the iOS Phase 1/2 builds set up.
--
-- Idempotent on re-run: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS,
-- CREATE INDEX IF NOT EXISTS. ADD CONSTRAINT is not natively idempotent;
-- wrapped in DO blocks so re-apply doesn't error.

CREATE TABLE IF NOT EXISTS pre_bet_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request snapshot
  sport TEXT NOT NULL,
  stake NUMERIC NOT NULL,
  odds INTEGER NOT NULL,
  bet_type TEXT NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL,
  local_hour INTEGER,

  -- Response snapshot (for analysis: did users wait when score was low?)
  bet_quality_score INTEGER NOT NULL,
  flag_count INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL,

  -- Outcome (filled via /api/check-in/outcome)
  outcome TEXT,
  outcome_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pre_bet_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own check-ins" ON pre_bet_checkins;
CREATE POLICY "Users insert own check-ins" ON pre_bet_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own check-ins" ON pre_bet_checkins;
CREATE POLICY "Users read own check-ins" ON pre_bet_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own check-ins" ON pre_bet_checkins;
CREATE POLICY "Users update own check-ins" ON pre_bet_checkins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pre_bet_checkins_user_recent
  ON pre_bet_checkins(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pre_bet_checkins_pending
  ON pre_bet_checkins(user_id, created_at DESC) WHERE outcome IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pre_bet_checkins_outcome_check'
      AND conrelid = 'public.pre_bet_checkins'::regclass
  ) THEN
    ALTER TABLE pre_bet_checkins
      ADD CONSTRAINT pre_bet_checkins_outcome_check
      CHECK (outcome IS NULL OR outcome IN ('placed_anyway', 'waited', 'placed_bet'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pre_bet_checkins_outcome_at_check'
      AND conrelid = 'public.pre_bet_checkins'::regclass
  ) THEN
    ALTER TABLE pre_bet_checkins
      ADD CONSTRAINT pre_bet_checkins_outcome_at_check
      CHECK (
        (outcome IS NULL AND outcome_at IS NULL)
        OR (outcome IS NOT NULL AND outcome_at IS NOT NULL)
      );
  END IF;
END $$;
