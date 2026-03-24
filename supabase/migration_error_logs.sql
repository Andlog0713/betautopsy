-- Error Logs table for production error tracking
-- Run this in Supabase SQL Editor

create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  source text not null, -- 'client', 'api', 'server'
  message text not null,
  stack text,
  path text, -- URL or API route where error occurred
  metadata jsonb, -- extra context (digest, component, etc.)
  created_at timestamptz default now()
);

create index if not exists idx_error_logs_created on error_logs(created_at desc);
create index if not exists idx_error_logs_source on error_logs(source, created_at desc);

-- RLS: users can insert their own errors, only service role can read all
alter table error_logs enable row level security;

create policy "Users can insert error logs" on error_logs
  for insert with check (true);

create policy "Users can view own error logs" on error_logs
  for select using (auth.uid() = user_id);

-- Auto-cleanup: delete error logs older than 30 days (run via Supabase cron or manually)
-- select cron.schedule('cleanup-error-logs', '0 3 * * *', $$delete from error_logs where created_at < now() - interval '30 days'$$);
