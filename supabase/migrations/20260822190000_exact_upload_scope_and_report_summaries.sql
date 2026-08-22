-- P0 paid-report integrity: logical upload cohorts and lightweight lists.

create table if not exists public.upload_bets (
  upload_id uuid not null references public.uploads(id) on delete cascade,
  bet_id uuid not null references public.bets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (upload_id, bet_id),
  unique (upload_id, position)
);

create index if not exists upload_bets_bet_id_idx
  on public.upload_bets (bet_id);
create index if not exists upload_bets_user_upload_idx
  on public.upload_bets (user_id, upload_id);

alter table public.upload_bets enable row level security;

drop policy if exists "Users can view own upload memberships" on public.upload_bets;
create policy "Users can view own upload memberships"
  on public.upload_bets for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own upload memberships" on public.upload_bets;
create policy "Users can create own upload memberships"
  on public.upload_bets for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.uploads
      where uploads.id = upload_bets.upload_id
        and uploads.user_id = auth.uid()
    )
    and exists (
      select 1 from public.bets
      where bets.id = upload_bets.bet_id
        and bets.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own upload memberships" on public.upload_bets;
create policy "Users can delete own upload memberships"
  on public.upload_bets for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.upload_bets to authenticated;

insert into public.upload_bets (upload_id, bet_id, user_id, position)
select
  ranked.upload_id,
  ranked.id,
  ranked.user_id,
  ranked.position
from (
  select
    bets.upload_id,
    bets.id,
    bets.user_id,
    (row_number() over (
      partition by bets.upload_id
      order by bets.placed_at, bets.id
    ) - 1)::integer as position
  from public.bets
  where bets.upload_id is not null
) as ranked
on conflict do nothing;

alter table public.autopsy_reports
  add column if not exists analyzed_upload_ids uuid[],
  add column if not exists analyzed_sportsbook text,
  add column if not exists analyzed_bet_ids uuid[],
  add column if not exists analyzed_bets_snapshot jsonb,
  add column if not exists report_summary jsonb not null default '{}'::jsonb;

-- Freeze a legacy upload-locked cohort only when it can be reconstructed to
-- exactly the count that report actually analyzed. Date and sportsbook locks
-- are applied before the historical 5000-bet cap. Ambiguous rows stay NULL so
-- checkout fails safely instead of labeling a broader cohort as exact.
with reconstructed as (
  select
    reports.id as report_id,
    array_agg(recent.bet_id order by recent.placed_at, recent.bet_id) as bet_ids
  from public.autopsy_reports as reports
  cross join lateral (
    select distinct
      memberships.bet_id,
      bets.placed_at
    from public.upload_bets as memberships
    join public.bets on bets.id = memberships.bet_id
    where memberships.user_id = reports.user_id
      and memberships.upload_id::text = any (reports.analyzed_upload_ids::text[])
      and (reports.analyzed_sportsbook is null or bets.sportsbook = reports.analyzed_sportsbook)
      and (reports.date_range_start is null or bets.placed_at >= reports.date_range_start)
      and (reports.date_range_end is null or bets.placed_at <= reports.date_range_end)
    order by bets.placed_at desc, memberships.bet_id
    limit 5000
  ) as recent
  where reports.analyzed_bet_ids is null
    and coalesce(cardinality(reports.analyzed_upload_ids), 0) > 0
  group by reports.id
)
update public.autopsy_reports as reports
set analyzed_bet_ids = reconstructed.bet_ids
from reconstructed
where reports.id = reconstructed.report_id
  and cardinality(reconstructed.bet_ids) = reports.bet_count_analyzed;

update public.autopsy_reports as reports
set report_summary = coalesce(
  (
    select jsonb_object_agg(entry.key, entry.value)
    from jsonb_each(reports.report_json) as entry
    where entry.key = any (array[
      'betting_archetype',
      'betiq',
      'summary',
      'summaryCounts',
      'discipline_score',
      'emotion_score',
      'emotion_percentile',
      'tilt_score',
      'bankroll_health',
      'schema_version',
      '_snapshot_counts',
      '_snapshot_teaser'
    ])
  ),
  '{}'::jsonb
)
where reports.report_summary = '{}'::jsonb;

update public.autopsy_reports as reports
set report_summary = reports.report_summary || jsonb_build_object(
  'card_biases',
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'bias_name', bias.value ->> 'bias_name',
          'severity', bias.value ->> 'severity'
        )
        order by bias.ordinality
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(reports.report_json -> 'biases_detected')
      with ordinality as bias(value, ordinality)
    where bias.ordinality <= 3
      and jsonb_typeof(bias.value) = 'object'
      and bias.value ? 'bias_name'
      and bias.value ? 'severity'
  )
)
where jsonb_typeof(reports.report_json -> 'biases_detected') = 'array';

comment on column public.autopsy_reports.analyzed_bet_ids is
  'Exact ordered bet cohort frozen when this report was generated.';
comment on column public.autopsy_reports.analyzed_bets_snapshot is
  'Immutable raw analytical inputs for a new snapshot. Never returned on report APIs.';
comment on column public.autopsy_reports.report_summary is
  'Small card-only projection. Full report_json is loaded only on detail.';
