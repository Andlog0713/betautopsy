-- Feedback system
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  type text not null check (type in ('report_reaction', 'bug', 'feature_request', 'general')),
  rating text check (rating in ('positive', 'neutral', 'negative')),
  message text,
  report_id uuid references autopsy_reports(id) on delete set null,
  page text,
  metadata jsonb,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type, created_at DESC);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can submit feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON feedback FOR SELECT USING (auth.uid() = user_id);
