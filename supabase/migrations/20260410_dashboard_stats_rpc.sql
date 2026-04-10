-- Fast aggregate stats for the dashboard. Returns all numbers in one query
-- instead of fetching every bet row and computing client-side.
-- Accepts an optional p_since timestamp to count bets placed after the last
-- report (for the "new bets since report" nudge).
create or replace function public.dashboard_stats(
  p_user_id uuid,
  p_since timestamptz default null
)
returns json
language sql
security definer set search_path = ''
as $$
  select json_build_object(
    'total_bets', count(*),
    'total_wagered', coalesce(sum(stake), 0),
    'net_pnl', coalesce(sum(profit), 0),
    'wins', count(*) filter (where result = 'win'),
    'settled', count(*) filter (where result in ('win', 'loss', 'push')),
    'avg_stake', case when count(*) > 0 then coalesce(sum(stake), 0) / count(*) else 0 end,
    'newest_created_at', max(created_at),
    'bets_since', case when p_since is not null then
      count(*) filter (where placed_at > p_since)
    else 0 end
  )
  from public.bets
  where user_id = p_user_id;
$$;
