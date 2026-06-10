-- Recovery + Control System
-- Adds first-class plans, rules, cooldowns, risk events, and recovery-mode
-- profile state. Also extends pre_bet_checkins with JSON context + override
-- reason so Check-In 2.0 can persist the decision gate it showed.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS manual_recovery_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_mode_reason text,
  ADD COLUMN IF NOT EXISTS recovery_mode_started_at timestamptz;

ALTER TABLE pre_bet_checkins
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS override_reason text;

CREATE TABLE IF NOT EXISTS control_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Control Plan',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  source_report_id uuid REFERENCES autopsy_reports(id) ON DELETE SET NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  accountability_message text,
  why_this_matters text,
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS control_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES control_plans(id) ON DELETE SET NULL,
  source_report_id uuid REFERENCES autopsy_reports(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  rationale text NOT NULL,
  rule_type text NOT NULL CHECK (
    rule_type IN (
      'loss_streak_stop',
      'late_night_cutoff',
      'ban_category',
      'stake_cap',
      'session_limit',
      'cooldown_after_loss',
      'emotion_block',
      'post_heated_session_pause',
      'rapid_fire_limit',
      'custom'
    )
  ),
  scope text NOT NULL DEFAULT 'global' CHECK (
    scope IN ('global', 'sport', 'bet_type', 'session', 'time_window', 'emotion_state')
  ),
  scope_value text,
  severity text NOT NULL DEFAULT 'guardrail' CHECK (
    severity IN ('supportive', 'guardrail', 'critical')
  ),
  enforcement text NOT NULL DEFAULT 'soft' CHECK (
    enforcement IN ('soft', 'hard')
  ),
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'paused', 'expired')
  ),
  provenance text NOT NULL DEFAULT 'engine_recommended' CHECK (
    provenance IN ('engine_recommended', 'user_authored', 'manual_override', 'recovery_plan_rule')
  ),
  trigger_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_report_id uuid REFERENCES autopsy_reports(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES control_rules(id) ON DELETE SET NULL,
  cooldown_id uuid,
  check_in_id uuid REFERENCES pre_bet_checkins(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'late_night_bet',
      'oversized_stake',
      'post_loss_escalation',
      'heated_session',
      'rapid_fire_session',
      'rule_violation',
      'cooldown_override',
      'bet_type_relapse',
      'loss_streak_breach',
      'emotion_trigger',
      'recovery_mode_trigger'
    )
  ),
  severity text NOT NULL DEFAULT 'warning' CHECK (
    severity IN ('info', 'warning', 'high', 'critical')
  ),
  summary text NOT NULL,
  detail text NOT NULL,
  recurrence_count integer NOT NULL DEFAULT 1,
  window_days integer NOT NULL DEFAULT 14,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cooldowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES control_rules(id) ON DELETE SET NULL,
  risk_event_id uuid REFERENCES risk_events(id) ON DELETE SET NULL,
  trigger_type text NOT NULL CHECK (
    trigger_type IN (
      'check_in_flag',
      'heated_session',
      'post_loss_escalation',
      'late_night_pattern',
      'user_choice',
      'rule_violation',
      'cooldown_override',
      'manual_recovery'
    )
  ),
  trigger_reason text NOT NULL,
  user_explanation text NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'honored', 'broken', 'expired', 'canceled')
  ),
  override_reason text,
  broken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'risk_events_cooldown_id_fkey'
      AND conrelid = 'public.risk_events'::regclass
  ) THEN
    ALTER TABLE risk_events
      ADD CONSTRAINT risk_events_cooldown_id_fkey
      FOREIGN KEY (cooldown_id) REFERENCES cooldowns(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_control_plans_user_active
  ON control_plans(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_control_rules_user_status
  ON control_rules(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_events_user_recent
  ON risk_events(user_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_events_type_recent
  ON risk_events(user_id, event_type, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_cooldowns_user_status
  ON cooldowns(user_id, status, expires_at DESC);

ALTER TABLE control_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own control plans" ON control_plans;
CREATE POLICY "Users view own control plans" ON control_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own control plans" ON control_plans;
CREATE POLICY "Users insert own control plans" ON control_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own control plans" ON control_plans;
CREATE POLICY "Users update own control plans" ON control_plans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own control rules" ON control_rules;
CREATE POLICY "Users view own control rules" ON control_rules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own control rules" ON control_rules;
CREATE POLICY "Users insert own control rules" ON control_rules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own control rules" ON control_rules;
CREATE POLICY "Users update own control rules" ON control_rules
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own control rules" ON control_rules;
CREATE POLICY "Users delete own control rules" ON control_rules
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own risk events" ON risk_events;
CREATE POLICY "Users view own risk events" ON risk_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own risk events" ON risk_events;
CREATE POLICY "Users insert own risk events" ON risk_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own risk events" ON risk_events;
CREATE POLICY "Users update own risk events" ON risk_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own cooldowns" ON cooldowns;
CREATE POLICY "Users view own cooldowns" ON cooldowns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own cooldowns" ON cooldowns;
CREATE POLICY "Users insert own cooldowns" ON cooldowns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own cooldowns" ON cooldowns;
CREATE POLICY "Users update own cooldowns" ON cooldowns
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
