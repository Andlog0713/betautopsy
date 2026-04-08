create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms bigint
)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_reset_at timestamptz := v_now + (p_window_ms || ' milliseconds')::interval;
  v_count integer;
begin
  -- Attempt atomic insert-or-update
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, v_reset_at)
  on conflict (key) do update
  set
    count = case
      when public.rate_limits.reset_at <= v_now then 1
      else public.rate_limits.count + 1
    end,
    reset_at = case
      when public.rate_limits.reset_at <= v_now then v_reset_at
      else public.rate_limits.reset_at
    end
  returning count into v_count;

  -- Check if the (possibly incremented) count exceeds the limit
  return v_count <= p_limit;
end;
$$;
