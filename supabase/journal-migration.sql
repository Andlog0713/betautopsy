-- Behavioral Journal — Pre-bet context logging
-- Users log their mental/emotional state before placing bets.
-- After 30+ entries, the system correlates states with outcomes.

CREATE TABLE IF NOT EXISTS bet_journal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),

  -- Mental state
  confidence integer NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  emotional_state text NOT NULL CHECK (emotional_state IN ('calm', 'excited', 'frustrated', 'anxious', 'bored', 'confident')),
  research_time text NOT NULL CHECK (research_time IN ('none', 'under_5', '5_to_15', '15_to_30', 'over_30')),

  -- Context
  had_alcohol boolean DEFAULT false,
  time_pressure boolean DEFAULT false,
  chasing_losses boolean DEFAULT false,

  -- Optional
  notes text,

  -- What happened after (filled in by future correlation engine)
  linked_bet_ids uuid[] DEFAULT '{}',
  session_result_dollars numeric DEFAULT null
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON bet_journal_entries(user_id, created_at DESC);

-- RLS
ALTER TABLE bet_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
  ON bet_journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON bet_journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON bet_journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON bet_journal_entries FOR DELETE
  USING (auth.uid() = user_id);
