-- Stripe webhook idempotency ledger.
-- Stripe retries webhooks on timeout/5xx, which can cause duplicate report-paid
-- flips and duplicate subscription upgrades. This table lets the webhook handler
-- short-circuit on any event.id it has already processed.
create table if not exists public.stripe_events (
  id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

-- No policies: only the service role (which bypasses RLS) ever touches this table.

-- error_logs table. Defined in supabase/schema.sql but was never applied to this
-- project, so /api/log-error inserts have been silently failing. Create it now
-- with a strict INSERT policy (own row only). The /api/log-error and
-- log-error-server.ts code paths both use the service role key for the insert,
-- so they bypass RLS entirely -- this policy is defense-in-depth for any future
-- client-side path that hits the table directly via the anon key.
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  source text not null, -- 'client', 'api', 'server'
  message text not null,
  stack text,
  path text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_error_logs_created on public.error_logs(created_at desc);
create index if not exists idx_error_logs_source on public.error_logs(source, created_at desc);

alter table public.error_logs enable row level security;

-- Drop any pre-existing INSERT policies (idempotent re-run safety) and replace
-- with the strict own-row policy.
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'error_logs'
      and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.error_logs', r.policyname);
  end loop;
end $$;

create policy "Users can insert own error logs"
  on public.error_logs
  for insert
  with check (auth.uid() = user_id);

-- SELECT policy: users can read their own error rows. Admin dashboards use the
-- service role key and bypass RLS.
drop policy if exists "Users can view own error logs" on public.error_logs;
create policy "Users can view own error logs"
  on public.error_logs
  for select
  using (auth.uid() = user_id);
