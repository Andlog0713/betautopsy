-- Share tokens for public report cards
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS share_tokens (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references autopsy_reports(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz default now()
);

-- Public read access (no auth needed to view shared cards)
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view share tokens" ON share_tokens FOR SELECT USING (true);
CREATE POLICY "Users can insert own share tokens" ON share_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
