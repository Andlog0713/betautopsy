-- BetAutopsy Database Schema
-- Run this in Supabase SQL Editor

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

-- ── Bets ──

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
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

-- ── Indexes ──

create index if not exists idx_bets_user_id on bets(user_id);
create index if not exists idx_bets_user_placed on bets(user_id, placed_at desc);
create index if not exists idx_bets_user_result on bets(user_id, result);
create index if not exists idx_reports_user_id on autopsy_reports(user_id, created_at desc);

-- ── Row Level Security ──

alter table profiles enable row level security;
alter table bets enable row level security;
alter table autopsy_reports enable row level security;

-- Profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Bets
create policy "Users can view own bets" on bets for select using (auth.uid() = user_id);
create policy "Users can insert own bets" on bets for insert with check (auth.uid() = user_id);
create policy "Users can update own bets" on bets for update using (auth.uid() = user_id);
create policy "Users can delete own bets" on bets for delete using (auth.uid() = user_id);

-- Autopsy Reports
create policy "Users can view own reports" on autopsy_reports for select using (auth.uid() = user_id);
create policy "Users can insert own reports" on autopsy_reports for insert with check (auth.uid() = user_id);
