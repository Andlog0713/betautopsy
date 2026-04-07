-- Discipline Scores: longitudinal tracking with component breakdown
-- Stores a score after every report generation for trend analysis

create table if not exists discipline_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  score integer not null check (score >= 0 and score <= 100),
  components jsonb not null default '{}',
  report_id uuid references autopsy_reports(id) on delete set null,
  created_at timestamptz default now()
);

-- Fast trend queries: "get my last 10 scores"
create index if not exists idx_discipline_scores_user
  on discipline_scores(user_id, created_at desc);

-- RLS: users can only read their own scores
alter table discipline_scores enable row level security;

create policy "Users can read own discipline scores"
  on discipline_scores for select
  using (auth.uid() = user_id);

create policy "Service role can insert discipline scores"
  on discipline_scores for insert
  with check (true);
