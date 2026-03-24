-- Progress Snapshots table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  snapshot_date date not null,
  total_bets integer,
  total_profit numeric(10,2),
  roi_percent numeric(6,2),
  win_rate numeric(6,2),
  tilt_score integer,
  avg_stake numeric(10,2),
  parlay_percent numeric(6,2),
  loss_chase_ratio numeric(6,2),
  bankroll_health text,
  overall_grade text,
  created_at timestamptz default now(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user ON progress_snapshots(user_id, snapshot_date DESC);

ALTER TABLE progress_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own snapshots" ON progress_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snapshots" ON progress_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
