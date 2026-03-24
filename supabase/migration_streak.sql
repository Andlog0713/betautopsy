-- Analysis Streak + Discipline Score
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_last_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_best integer DEFAULT 0;

-- Add discipline_score to progress_snapshots
ALTER TABLE progress_snapshots ADD COLUMN IF NOT EXISTS discipline_score integer;
