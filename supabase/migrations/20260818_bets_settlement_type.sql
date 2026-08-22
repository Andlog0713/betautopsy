-- Stage 8: additive settlement_type column on public.bets.
--
-- lib/csv-parser.ts's RESULT_MAP previously force-mapped every cash-out
-- variant ("cashed_out", "cashed out", "cashedout", "cashout") to 'void',
-- which forced profit to $0 regardless of the CSV's own profit/net column
-- value for that row - a real win or loss silently discarded to zero.
-- Disclosed as a known limitation in the FAQ pending this fix.
--
-- The parser now reclassifies a cash-out by its actual settlement value
-- (win/loss when the CSV has a usable nonzero profit figure, falling back
-- to the same void/$0 treatment only when it doesn't) instead of always
-- forcing void. `result` still only ever holds 'win' | 'loss' | 'push' |
-- 'void' | 'pending' - this migration does not touch or widen that column
-- or its (nonexistent) enum. settlement_type is a new, purely additive,
-- nullable sibling that marks HOW a bet settled (cash-out vs. run to
-- completion) for anything that wants that distinction later; every
-- existing row and every future non-cash-out row gets NULL and is
-- unaffected.
--
-- NOT auto-applied by this session - additive schema changes to the live
-- production database need Andrew's explicit go-ahead, not just approval
-- of the feature. Must be applied BEFORE the code change that adds
-- `settlement_type` to lib/import-bets.ts's INSERT payload merges/deploys,
-- or every CSV upload will start failing with "column settlement_type
-- does not exist" the moment that code runs.

alter table public.bets
  add column if not exists settlement_type text;

comment on column public.bets.settlement_type is
  'Additive (Stage 8). ''cash_out'' when this bet was settled via a sportsbook cash-out rather than run-to-completion or a genuine push/void; NULL otherwise. result/profit already carry the bet''s real settlement value in both cases.';
