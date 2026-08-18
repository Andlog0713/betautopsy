-- Closes two live IDOR vectors on SECURITY DEFINER RPCs callable by anon
-- (flagged by Andrew via direct anon-key probe, 2026-08-18):
--
--   dashboard_stats(p_user_id uuid, p_since timestamptz): took an arbitrary
--   p_user_id with no auth check. Anyone holding the public anon key and a
--   user UUID could read that user's net P&L, total wagered, and average
--   stake.
--
--   check_rate_limit(p_key text, p_limit int, p_window_ms bigint): took a
--   caller-controlled p_key/p_limit/p_window_ms with no auth check. Anyone
--   could burn another user's rate-limit bucket or set an arbitrary
--   (permissive) limit/window for their own.
--
-- dashboard_stats: adds an explicit auth.uid() check inside the function
-- body (kept SECURITY DEFINER rather than switching to SECURITY INVOKER +
-- RLS - the function only ever reads public.bets, which already has a
-- correct `auth.uid() = user_id` SELECT policy, so INVOKER would work
-- identically, but the inline check is smaller, self-contained, and
-- doesn't couple this fix to the RLS policy staying exactly as-is).
--
-- check_rate_limit: grants only. Traced every caller in the app - all of
-- them go through lib/rate-limit.ts's checkRateLimit(), which always uses
-- the SERVICE ROLE key (never anon or authenticated). Rewriting the
-- function to derive p_key from auth.uid() internally (as first proposed)
-- would have broken app/api/unsubscribe/route.ts, which is keyed by IP for
-- an intentionally unauthenticated unsubscribe flow, and would collapse
-- the distinct per-action buckets (user.id, user.id + ':parse',
-- 'ask-report:' + user.id) onto a single key. Revoking EXECUTE from both
-- anon and authenticated (service_role keeps its own explicit grant) closes
-- the exploitable direct-RPC vector with zero functional impact, since the
-- app never calls this any other way.

create or replace function public.dashboard_stats(
  p_user_id uuid,
  p_since timestamp with time zone default null
)
returns json
language sql
security definer
set search_path = ''
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
  where user_id = p_user_id
    and p_user_id = auth.uid();
$$;

revoke execute on function public.dashboard_stats(uuid, timestamp with time zone) from anon;

revoke execute on function public.check_rate_limit(text, integer, bigint) from anon, authenticated;

-- Both functions also carried a `PUBLIC` grant (Postgres grants EXECUTE to
-- PUBLIC by default on function creation unless explicitly revoked - every
-- role, including anon, is implicitly a member of PUBLIC). The role-specific
-- REVOKEs above did not touch it, so a live anon-key probe still succeeded
-- after applying them; caught and closed here, then re-granted explicitly
-- to the roles that actually need it as cheap insurance against relying on
-- grant-order/PUBLIC-membership semantics.
revoke execute on function public.dashboard_stats(uuid, timestamp with time zone) from public;
revoke execute on function public.check_rate_limit(text, integer, bigint) from public;

grant execute on function public.dashboard_stats(uuid, timestamp with time zone) to authenticated;
grant execute on function public.check_rate_limit(text, integer, bigint) to service_role;
