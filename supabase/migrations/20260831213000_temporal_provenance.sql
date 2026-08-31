begin;

alter table public.bets
  alter column placed_at drop not null,
  add column if not exists source_placed_at text,
  add column if not exists placed_date date,
  add column if not exists placed_time time without time zone,
  add column if not exists source_timezone text,
  add column if not exists timestamp_quality text;

update public.bets
set timestamp_quality = 'legacy_unknown'
where timestamp_quality is null;

alter table public.bets
  alter column timestamp_quality set default 'legacy_unknown',
  alter column timestamp_quality set not null;

alter table public.bets
  drop constraint if exists bets_timestamp_quality_check,
  add constraint bets_timestamp_quality_check
    check (timestamp_quality in ('instant', 'local_datetime', 'date_only', 'legacy_unknown'));

alter table public.bets
  drop constraint if exists bets_temporal_provenance_check,
  add constraint bets_temporal_provenance_check check (
    (
      timestamp_quality = 'legacy_unknown'
      and placed_at is not null
    )
    or (
      timestamp_quality = 'instant'
      and placed_at is not null
      and source_placed_at is not null
      and placed_date is not null
      and placed_time is not null
      and source_timezone is not null
    )
    or (
      timestamp_quality = 'local_datetime'
      and placed_at is null
      and source_placed_at is not null
      and placed_date is not null
      and placed_time is not null
      and source_timezone is null
    )
    or (
      timestamp_quality = 'date_only'
      and placed_at is null
      and source_placed_at is not null
      and placed_date is not null
      and placed_time is null
      and source_timezone is null
    )
  );

alter table public.bets
  add column if not exists recorded_date date generated always as (
    coalesce(placed_date, (placed_at at time zone 'UTC')::date)
  ) stored;

create index if not exists idx_bets_user_recorded_date
  on public.bets (user_id, recorded_date desc, placed_at desc);

alter table public.autopsy_reports
  add column if not exists date_range_start_date date,
  add column if not exists date_range_end_date date;

comment on column public.bets.placed_at is
  'Real UTC instant only. Null when the source omitted the timezone or clock time.';
comment on column public.bets.source_placed_at is
  'Exact source timestamp text captured during ingestion. Never normalized or inferred.';
comment on column public.bets.timestamp_quality is
  'Temporal provenance: instant, local_datetime, date_only, or legacy_unknown.';
comment on column public.bets.recorded_date is
  'Date-only compatibility key for display and filtering. It is not an instant.';

commit;
