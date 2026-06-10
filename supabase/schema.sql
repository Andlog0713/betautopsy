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
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro')),
  subscription_status text default 'active' check (subscription_status in ('active', 'inactive', 'past_due', 'canceled', 'trial')),
  trial_ends_at timestamptz,
  bet_count integer default 0,
  bankroll numeric(12,2),
  streak_count integer default 0,
  streak_last_date date,
  streak_best integer default 0,
  streak_freezes integer default 1,
  login_count integer default 0,
  is_admin boolean default false,
  email_digest_enabled boolean default true,
  last_digest_sent_at timestamptz,
  manual_recovery_mode boolean default false,
  recovery_mode_reason text,
  recovery_mode_started_at timestamptz,
  reports_used_this_period integer default 0,
  current_period_start timestamptz,
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
  report_type text not null check (report_type in ('snapshot', 'full', 'weekly', 'quick')),
  bet_count_analyzed integer not null,
  date_range_start timestamptz,
  date_range_end timestamptz,
  report_json jsonb not null,
  report_markdown text not null,
  model_used text,
  tokens_used integer,
  cost_cents integer,
  is_paid boolean default false,
  stripe_payment_intent_id text,
  upgraded_from_snapshot_id uuid references autopsy_reports(id),
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

-- ── Quiz Leads ──

create table if not exists quiz_leads (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  archetype text,
  emotion_estimate integer,
  created_at timestamptz default now()
);

-- ── Email Unsubscribe Tokens ──

create table if not exists email_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz default now()
);

create index if not exists idx_unsub_token on email_unsubscribe_tokens(token);

-- ── Behavioral Journal ──

create table if not exists bet_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  confidence integer not null check (confidence between 1 and 5),
  emotional_state text not null check (emotional_state in ('calm', 'excited', 'frustrated', 'anxious', 'bored', 'confident')),
  research_time text not null check (research_time in ('none', 'under_5', '5_to_15', '15_to_30', 'over_30')),
  had_alcohol boolean default false,
  time_pressure boolean default false,
  chasing_losses boolean default false,
  notes text,
  linked_bet_ids uuid[] default '{}',
  session_result_dollars numeric default null
);

create index if not exists idx_journal_user_id on bet_journal_entries(user_id, created_at desc);

-- ── Discipline Scores ──

create table if not exists discipline_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  score integer not null check (score >= 0 and score <= 100),
  components jsonb not null default '{}',
  report_id uuid references autopsy_reports(id) on delete set null,
  created_at timestamptz default now()
);

-- ── Pre-bet Check-ins ──

create table if not exists pre_bet_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sport text not null,
  stake numeric not null,
  odds integer not null,
  bet_type text not null,
  placed_at timestamptz not null,
  local_hour integer,
  bet_quality_score integer not null,
  flag_count integer not null,
  recommendation text not null,
  flags jsonb not null default '[]'::jsonb,
  summary text not null,
  context jsonb not null default '{}'::jsonb,
  outcome text,
  outcome_at timestamptz,
  override_reason text,
  created_at timestamptz not null default now()
);

-- ── Control Plans ──

create table if not exists control_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null default 'My Control Plan',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  source_report_id uuid references autopsy_reports(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  accountability_message text,
  why_this_matters text,
  decisions jsonb not null default '[]'::jsonb,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Control Rules ──

create table if not exists control_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  plan_id uuid references control_plans(id) on delete set null,
  source_report_id uuid references autopsy_reports(id) on delete set null,
  title text not null,
  description text not null,
  rationale text not null,
  rule_type text not null check (
    rule_type in (
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
  scope text not null default 'global' check (
    scope in ('global', 'sport', 'bet_type', 'session', 'time_window', 'emotion_state')
  ),
  scope_value text,
  severity text not null default 'guardrail' check (
    severity in ('supportive', 'guardrail', 'critical')
  ),
  enforcement text not null default 'soft' check (
    enforcement in ('soft', 'hard')
  ),
  status text not null default 'active' check (
    status in ('active', 'inactive', 'paused', 'expired')
  ),
  provenance text not null default 'engine_recommended' check (
    provenance in ('engine_recommended', 'user_authored', 'manual_override', 'recovery_plan_rule')
  ),
  trigger_json jsonb not null default '{}'::jsonb,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Risk Events ──

create table if not exists risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  source_report_id uuid references autopsy_reports(id) on delete set null,
  rule_id uuid references control_rules(id) on delete set null,
  cooldown_id uuid,
  check_in_id uuid references pre_bet_checkins(id) on delete set null,
  event_type text not null check (
    event_type in (
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
  severity text not null default 'warning' check (
    severity in ('info', 'warning', 'high', 'critical')
  ),
  summary text not null,
  detail text not null,
  recurrence_count integer not null default 1,
  window_days integer not null default 14,
  metadata jsonb not null default '{}'::jsonb,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── Cooldowns ──

create table if not exists cooldowns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  rule_id uuid references control_rules(id) on delete set null,
  risk_event_id uuid references risk_events(id) on delete set null,
  trigger_type text not null check (
    trigger_type in (
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
  trigger_reason text not null,
  user_explanation text not null,
  triggered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (
    status in ('active', 'honored', 'broken', 'expired', 'canceled')
  ),
  override_reason text,
  broken_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_events_cooldown_id_fkey'
      and conrelid = 'public.risk_events'::regclass
  ) then
    alter table risk_events
      add constraint risk_events_cooldown_id_fkey
      foreign key (cooldown_id) references cooldowns(id) on delete set null;
  end if;
end $$;

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
create index if not exists idx_discipline_scores_user on discipline_scores(user_id, created_at desc);
create index if not exists idx_pre_bet_checkins_user_recent on pre_bet_checkins(user_id, created_at desc);
create index if not exists idx_pre_bet_checkins_pending on pre_bet_checkins(user_id, created_at desc) where outcome is null;
create index if not exists idx_control_plans_user_active on control_plans(user_id, status, updated_at desc);
create index if not exists idx_control_rules_user_status on control_rules(user_id, status, created_at desc);
create index if not exists idx_risk_events_user_recent on risk_events(user_id, event_at desc);
create index if not exists idx_risk_events_type_recent on risk_events(user_id, event_type, event_at desc);
create index if not exists idx_cooldowns_user_status on cooldowns(user_id, status, expires_at desc);

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
-- SELECT deliberately NOT public: share_tokens.data embeds the full report
-- json. Public share-page lookups go through service-role server code only
-- (see 20260610_lock_token_tables.sql). Owners can read their own rows for
-- the /api/share dedupe check.
create policy "Users can view own share tokens" on share_tokens for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own share tokens" on share_tokens for insert with check (auth.uid() = user_id);
create policy "Users can update own share tokens" on share_tokens for update using (auth.uid() = user_id);

-- Feedback
alter table feedback enable row level security;
create policy "Users can submit feedback" on feedback for insert with check (auth.uid() = user_id);
create policy "Users can view own feedback" on feedback for select using (auth.uid() = user_id);

-- Error Logs
alter table error_logs enable row level security;
create policy "Users can insert error logs" on error_logs for insert with check (true);
create policy "Users can view own error logs" on error_logs for select using (auth.uid() = user_id);

-- Quiz Leads (service role insert, no user access needed)
alter table quiz_leads enable row level security;

-- Email Unsubscribe Tokens
alter table email_unsubscribe_tokens enable row level security;
-- SELECT deliberately NOT public: token id -> user_id mapping. The
-- unsubscribe route reads via service role (see 20260610_lock_token_tables.sql).
create policy "Users can insert own unsubscribe tokens" on email_unsubscribe_tokens for insert with check (auth.uid() = user_id);

-- Behavioral Journal
alter table bet_journal_entries enable row level security;
create policy "Users can view own journal entries" on bet_journal_entries for select using (auth.uid() = user_id);
create policy "Users can insert own journal entries" on bet_journal_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own journal entries" on bet_journal_entries for update using (auth.uid() = user_id);
create policy "Users can delete own journal entries" on bet_journal_entries for delete using (auth.uid() = user_id);

-- Discipline Scores
alter table discipline_scores enable row level security;
create policy "Users can read own discipline scores" on discipline_scores for select using (auth.uid() = user_id);
create policy "Service role can insert discipline scores" on discipline_scores for insert with check (true);

-- Pre-bet Check-ins
alter table pre_bet_checkins enable row level security;
create policy "Users insert own check-ins" on pre_bet_checkins for insert with check (auth.uid() = user_id);
create policy "Users read own check-ins" on pre_bet_checkins for select using (auth.uid() = user_id);
create policy "Users update own check-ins" on pre_bet_checkins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Control Plans
alter table control_plans enable row level security;
create policy "Users view own control plans" on control_plans for select using (auth.uid() = user_id);
create policy "Users insert own control plans" on control_plans for insert with check (auth.uid() = user_id);
create policy "Users update own control plans" on control_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Control Rules
alter table control_rules enable row level security;
create policy "Users view own control rules" on control_rules for select using (auth.uid() = user_id);
create policy "Users insert own control rules" on control_rules for insert with check (auth.uid() = user_id);
create policy "Users update own control rules" on control_rules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own control rules" on control_rules for delete using (auth.uid() = user_id);

-- Risk Events
alter table risk_events enable row level security;
create policy "Users view own risk events" on risk_events for select using (auth.uid() = user_id);
create policy "Users insert own risk events" on risk_events for insert with check (auth.uid() = user_id);
create policy "Users update own risk events" on risk_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cooldowns
alter table cooldowns enable row level security;
create policy "Users view own cooldowns" on cooldowns for select using (auth.uid() = user_id);
create policy "Users insert own cooldowns" on cooldowns for insert with check (auth.uid() = user_id);
create policy "Users update own cooldowns" on cooldowns for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Rate Limits (service role only — accessed from API routes, not directly by users)
alter table rate_limits enable row level security;
