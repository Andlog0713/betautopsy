-- Uploads tracking + upload_id on bets
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  filename text,
  display_name text,
  bet_count integer,
  sportsbook text,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id, created_at DESC);
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own uploads" ON uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own uploads" ON uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own uploads" ON uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON uploads FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE bets ADD COLUMN IF NOT EXISTS upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL;

-- If table already exists, add display_name column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS display_name text;
