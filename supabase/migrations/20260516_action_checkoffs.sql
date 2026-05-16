-- Per-user persistent state for Chapter 7 action item check-offs. Closes
-- the loop the heated-session push opened: notification -> report ->
-- action -> check off -> dashboard progress ring.
--
-- recommendation_id is "${report_id}:${priority}". priority is the
-- engine-assigned integer on each Recommendation; it doubles as the iOS
-- Identifiable.id and survives any future re-sort of the rendered list.
-- Each report owns its own checkoffs; generating a new report does NOT
-- carry over state from prior reports (v1 semantics).
--
-- Idempotent on re-run: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS,
-- CREATE INDEX IF NOT EXISTS, ADD CONSTRAINT wrapped in DO blocks.

CREATE TABLE IF NOT EXISTS action_checkoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES autopsy_reports(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'action_checkoffs_user_recommendation_unique'
  ) THEN
    ALTER TABLE action_checkoffs
      ADD CONSTRAINT action_checkoffs_user_recommendation_unique
      UNIQUE (user_id, recommendation_id);
  END IF;
END $$;

-- GET /api/action-checkoffs?report_id=X reads (user_id, report_id) — both
-- in the index keeps the SELECT a single-page scan even as user volume
-- grows. RLS already adds user_id; the composite makes report_id
-- equality cheap on top of it.
CREATE INDEX IF NOT EXISTS idx_action_checkoffs_user_report
  ON action_checkoffs (user_id, report_id);

ALTER TABLE action_checkoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own action checkoffs" ON action_checkoffs;
CREATE POLICY "Users read own action checkoffs" ON action_checkoffs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own action checkoffs" ON action_checkoffs;
CREATE POLICY "Users insert own action checkoffs" ON action_checkoffs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own action checkoffs" ON action_checkoffs;
CREATE POLICY "Users update own action checkoffs" ON action_checkoffs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
