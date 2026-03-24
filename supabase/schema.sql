-- ============================================
-- BetAutopsy — Complete Database Schema
-- Run this in Supabase SQL Editor for a fresh setup.
-- ============================================

create extension if not exists "pgcrypto";

-- ── Profiles ──

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  stripe_customer_id text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'sharp')),
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'past_due', 'canceled')),
  bet_count integer default 0,
  bankroll numeric(12,2),
  streak_count integer default 0,
  streak_last_date date,
  streak_best integer default 0,
  login_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Increment login count (called from client after sign-in)
create or replace function public.increment_login_count()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set login_count = coalesce(login_count, 0) + 1
  where id = auth.uid();
end;
$$;

-- ── Uploads ──

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  filename text,
  display_name text,
  bet_count integer,
  sportsbook text,
  created_at timestamptz default now()
);

-- ── Bets ──

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  upload_id uuid references uploads(id) on delete set null,
  placed_at timestamptz not null,
  sport text not null,
  league text,
  bet_type text not null,
  description text not null,
  odds integer not null, -- American odds
  stake numeric(10,2) not null,
  result text not null check (result in ('win', 'loss', 'push', 'void', 'pending')),
  payout numeric(10,2) default 0,
  profit numeric(10,2) default 0,
  sportsbook text,
  is_bonus_bet boolean default false,
  parlay_legs integer,
  tags text[],
  notes text,
  created_at timestamptz default now()
);

-- ── Autopsy Reports ──

create table if not exists autopsy_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  report_type text not null check (report_type in ('full', 'weekly', 'quick')),
  bet_count_analyzed integer not null,
  date_range_start timestamptz,
  date_range_end timestamptz,
  report_json jsonb not null,
  report_markdown text not null,
  model_used text,
  tokens_used integer,
  cost_cents integer,
  created_at timestamptz default now()
);

-- ── Progress Snapshots ──

create table if not exists progress_snapshots (
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
  discipline_score integer,
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);

-- ── Share Tokens ──

create table if not exists share_tokens (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references autopsy_reports(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz default now()
);

-- ── Feedback ──

create table if not exists feedback (
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

-- ── Error Logs ──

create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  source text not null, -- 'client', 'api', 'server'
  message text not null,
  stack text,
  path text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ── Rate Limits ──

create table if not exists rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);

create index if not exists idx_rate_limits_reset on rate_limits(reset_at);

-- ============================================
-- Indexes
-- ============================================

create index if not exists idx_bets_user_id on bets(user_id);
create index if not exists idx_bets_user_placed on bets(user_id, placed_at desc);
create index if not exists idx_bets_user_result on bets(user_id, result);
create index if not exists idx_reports_user_id on autopsy_reports(user_id, created_at desc);
create index if not exists idx_uploads_user on uploads(user_id, created_at desc);
create index if not exists idx_snapshots_user on progress_snapshots(user_id, snapshot_date desc);
create index if not exists idx_feedback_type on feedback(type, created_at desc);
create index if not exists idx_error_logs_created on error_logs(created_at desc);
create index if not exists idx_error_logs_source on error_logs(source, created_at desc);

-- ============================================
-- Row Level Security
-- ============================================

-- Profiles
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Bets
alter table bets enable row level security;
create policy "Users can view own bets" on bets for select using (auth.uid() = user_id);
create policy "Users can insert own bets" on bets for insert with check (auth.uid() = user_id);
create policy "Users can update own bets" on bets for update using (auth.uid() = user_id);
create policy "Users can delete own bets" on bets for delete using (auth.uid() = user_id);

-- Autopsy Reports
alter table autopsy_reports enable row level security;
create policy "Users can view own reports" on autopsy_reports for select using (auth.uid() = user_id);
create policy "Users can insert own reports" on autopsy_reports for insert with check (auth.uid() = user_id);

-- Uploads
alter table uploads enable row level security;
create policy "Users can view own uploads" on uploads for select using (auth.uid() = user_id);
create policy "Users can insert own uploads" on uploads for insert with check (auth.uid() = user_id);
create policy "Users can update own uploads" on uploads for update using (auth.uid() = user_id);
create policy "Users can delete own uploads" on uploads for delete using (auth.uid() = user_id);

-- Progress Snapshots
alter table progress_snapshots enable row level security;
create policy "Users can view own snapshots" on progress_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert own snapshots" on progress_snapshots for insert with check (auth.uid() = user_id);

-- Share Tokens (public read for shared report cards)
alter table share_tokens enable row level security;
create policy "Anyone can view share tokens" on share_tokens for select using (true);
create policy "Users can insert own share tokens" on share_tokens for insert with check (auth.uid() = user_id);

-- Feedback
alter table feedback enable row level security;
create policy "Users can submit feedback" on feedback for insert with check (auth.uid() = user_id);
create policy "Users can view own feedback" on feedback for select using (auth.uid() = user_id);

-- Error Logs
alter table error_logs enable row level security;
create policy "Users can insert error logs" on error_logs for insert with check (true);
create policy "Users can view own error logs" on error_logs for select using (auth.uid() = user_id);

-- Rate Limits (service role only — accessed from API routes, not directly by users)
alter table rate_limits enable row level security;
