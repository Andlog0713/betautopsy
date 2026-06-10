# Engine hardening — R0 recon + WS-TEMPORAL / WS-NUMERIC outlines

Branch `hardening/june-10` · 2026-06-10 · outline-only run, no product code
changed. Artifacts: this report + 7 synthetic golden fixtures under
`__tests__/fixtures/ingestion/`. No Notion rows created (pending approval).

---

## R0 — Recon findings

### R0a. Parse layer + ingestion entry points

**Parse layer confirmed:** `lib/csv-parser.ts`, functions `parseCSV()` (line 124)
and `parseRow()` (line 260). The two audit-cited sites, at today's line numbers:

- **Unparseable dates default to NOW — lines 310–317** (audit said 314; the
  default lands on 315):
  ```ts
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) throw new Error('Invalid date');
    placedAt = d.toISOString();
  } catch {
    placedAt = new Date().toISOString();   // ← TODAY, full current timestamp
    if (dateStr) warnings.push(`Row ${lineNum}: Could not parse date "${dateStr}", using today`);
  }
  ```
  Note it stores the current *timestamp*, not the calendar date — so re-uploads
  of the same broken row get different `placed_at` values, defeating the
  day-keyed dedup in `lib/import-bets.ts:29` (`placed_at.split('T')[0]`).

- **Cash-outs erased to $0 — two-step mechanism, lines 37 + 330–333.**
  `RESULT_MAP` (line 37) maps `cashed_out / cashedout / cashout / "cashed out"`
  → `'void'`; then:
  ```ts
  // Push and void ALWAYS have $0 profit — override any CSV value
  if (result === 'push' || result === 'void') profit = 0;
  ```
  Any partial cash-out P&L the CSV carried is destroyed at parse time. Because
  the zeroing happens pre-insert, **historical cash-outs are unrecoverable**
  (DB has `result='void', profit=0`; original CSVs are gone).

**Ingestion entry points (all converge on `importBets()`, `lib/import-bets.ts:16`):**

| Route | Parser | Shares csv-parser date/profit path? |
|---|---|---|
| `app/api/upload/route.ts` (CSV multipart) | `parseCSV()` → `parseRow()` | Yes — both bugs apply |
| `app/api/parse-paste/route.ts` (paste) | Claude LLM extraction; profit via `calculateProfit()` (lines 67–80) | No — own path. Prompt: "If only a date is given, use T12:00:00" (line 17). Cash-out behavior is whatever the LLM maps to the result enum — unspecified |
| `app/api/parse-screenshot/route.ts` (screenshot) | Claude vision; inline profit calc (lines 174–181) | No — own path. Dates normalized to `YYYY-MM-DD` only (line 186) — **time-of-day always lost** on this path |
| `app/api/upload-parsed/route.ts` (pre-parsed JSON) | none — validates `ParsedBet[]` and inserts | No — no date/profit normalization at all |

**Canonical row shape:** `ParsedBet` (`types/index.ts:1075–1091`); DB table
`bets` (`supabase/schema.sql:85–105`): `placed_at timestamptz` is the **only**
bet timestamp; `result text check (result in ('win','loss','push','void','pending'))`;
`odds integer not null` (0 allowed). **There is no `settled_at` anywhere** —
not in `ParsedBet`, not in the table, not in any column alias.

### R0b. Prod bet timestamps (read-only PostgREST sample, all 7,647 rows)

- Storage: `timestamptz`, always serialized `+00:00`. Result mix: 3,046 win /
  4,435 loss / 113 push / 44 void / 9 pending.
- **5,001 of 7,647 rows (65.4%) are exactly `T00:00:00` UTC** — date-only
  parses with no time-of-day. Hour 00 falls inside the engine's late-night
  window (`h >= 23 || h < 5`), so two-thirds of all prod bets currently read
  as "late night."
- The timed cohort is **naive local time stored as UTC**, not true UTC: hours
  cluster 10:00–23:00 with a near-empty 01:00–09:00 trough. True-UTC
  timestamps from US users would peak 00:00–04:00 UTC (evening ET/PT);
  instead that band is almost empty. The strings were local wall-clock,
  parsed by `new Date()` on a UTC server.
- A small **true-UTC cohort exists**: `Draftkings Sportsbook` (n=46) is the
  only book whose rows all carry millisecond precision (`time_placed_iso`
  ISO-Z, Pikkit-style export) and whose hours include the 22:00–02:00 UTC
  evening band. ESPN BET (n=108) also shows 00–03 UTC hours and may be true
  UTC. Note the duplicate book identity: `DraftKings` (n=2,008, 74% midnight)
  vs `Draftkings Sportsbook` (n=46, 0% midnight) are different export
  pipelines for the same book.
- Per-book midnight (date-only) fractions: PointsBet 360/360, bet365 240/240,
  DraftKings 1,483/2,008, FanDuel 1,356/1,990, BetMGM 949/1,647, Caesars
  612/1,090, Underdog Fantasy 0/79, PrizePicks 0/78, ESPN BET 6/108 (hour-00
  rows there may be genuine), Draftkings Sportsbook 0/46 (millis: 46/46).
- **`profiles` has no timezone column** (25 columns inspected; none temporal
  beyond audit timestamps). No table stores tz. The only tz-aware seam in the
  codebase is the pre-bet check-in: `check-in-scorer.ts:327–329` consumes an
  optional `localHour` that iOS sends (`PreBetCheckInRequest`,
  `types/index.ts:1218–1221` documents `Calendar.current`); web never sends it.

**Takeaway shaping WS-TEMPORAL:** prod rows are a three-way mix — date-only
(65%), naive-local-as-UTC (~34%), true-UTC ISO (~1%, growing if Pikkit becomes
the recommended path). A single global "convert from UTC to user tz" fix would
*corrupt* the naive-local majority while fixing only the 1% — normalization
must be per-row-quality, not blanket.

### R0c. Per-source settlement matrix

**Headline: no source delivers settlement time into the system today.** The
parser's only settlement-adjacent aliases are for the *result category*
(`result: ['result','outcome','status','settlement','settled']`,
csv-parser.ts:14). No alias exists for a settlement timestamp column; no
`settled_at` field exists to receive one.

| Source | Settlement data in export | What we capture today | placed_at quality (per R0b + parser) |
|---|---|---|---|
| Pikkit (CSV) | Settlement timestamp typically present in exports (their schema carries settle time); parser **discards** anything not matching the result alias | result category only (`SETTLED_WIN` etc., prefix stripped at parser line ~300) | ISO-Z with millis via `time_placed_iso` → **true UTC, full precision** (the n=46 cohort) |
| FanDuel (CSV) | Unconfirmed without a fresh export sample; nothing captured regardless | result category only | mixed: 68% date-only midnight; rest naive local |
| DraftKings (CSV) | Unconfirmed without a fresh export sample; nothing captured regardless | result category only | mixed: 74% date-only; rest naive local |
| PrizePicks (DFS) | Entries resolve as a unit; no per-pick settlement concept | result category only | naive local datetimes (0% midnight) |
| Paste (LLM) | Whatever the text says — prompt never asks for settlement | nothing | date-only → forced `T12:00:00` per prompt; else naive |
| Screenshot (LLM) | Visible on some slips — prompt never asks | nothing | **date-only always** (normalized `YYYY-MM-DD`, line 186) |

Consequence: settlement-ordered post-loss logic has **zero data to run on for
any source** until (a) a `settled_at` capture path ships and (b) users
re-upload from sources that carry it. Design must lead with the honest
reframe, with settlement-ordering as the upgrade where data arrives.

### R0d. schema_version consumers + report differs

- **Writers (current value 2):** `app/api/analyze/route.ts:444`,
  `lib/iap-upgrade.ts:208`.
- **Readers:** none gate on it. It is passed through the list-mode slim
  whitelist (`app/api/reports/route.ts:84`), typed at `types/index.ts:229`,
  seeded in one test fixture. **Zero conditional logic anywhere reads the
  value** — write-only today.
- **Differs (none schema_version-aware):**
  - `lib/what-changed.ts` — `computeWhatChanged(prior, current)` diffs
    `betting_archetype.name`, `betiq.score`, and per-bias `estimated_cost`
    (matched case-insensitively by `bias_name`). Called from
    `app/api/analyze/route.ts:461–489` with the prior report fetched raw —
    no version check. Today's bias-cost deltas diff **LLM-invented numbers
    against other LLM-invented numbers**.
  - `lib/report-comparison.ts` — `compareReports()` diffs emotion
    (`emotion_score ?? tilt_score` v1 fallback), `discipline_score.total`,
    `betiq.score`, bias name/severity sets, session grades
    (`session_detection.sessionGradeDistribution ?? _snapshot_teaser.sessionGrades`),
    heated count. Called from `app/(dashboard)/reports/page.tsx:461–472`.
    Survives v1↔v2 via field-fallback chains, silently mixing semantics.
  - `components/WhatChangedSection.tsx` — pure presenter of the above.
  - `components/ProgressChart.tsx` + `hooks/useSnapshots.ts` — read
    `progress_snapshots` (separate table, no version column, and its upsert
    has been commented out since 2026-05-11 — chart is stale regardless).

---

## WS-TEMPORAL outline

### T1. Per-row timestamp-quality classification (foundation)

New `timestamp_quality: 'datetime_tz' | 'datetime_naive' | 'date_only'`
determined at parse time and stored per bet.

- `parseRow()` classifies before serializing: explicit offset or trailing
  `Z` in the raw string → `datetime_tz`; parseable datetime without offset →
  `datetime_naive`; date-only string → `date_only`.
- LLM paths: parse-paste's forced `T12:00:00` and parse-screenshot's
  `YYYY-MM-DD` are declared `date_only` (the noon/midnight time is synthetic).
- Backfill for the 7,647 existing rows (one UPDATE): `T00:00:00` exactly →
  `date_only`; fractional seconds present → `datetime_tz` (the Pikkit
  cohort); else `datetime_naive`. Matches the R0b populations.

### T2. Timezone normalization — recommended source + fallback chain

**Recommendation: capture the client/device IANA timezone at upload time,
store it on the upload row, and seed a user-level preference from it.**
Backed by R0b: (a) the timed majority is already *local* wall-clock, so the
tz is needed mostly to interpret the true-UTC cohort and to label output —
but that true-UTC cohort (Pikkit `time_placed_iso`) is exactly the path the
product recommends to new users, so it grows; (b) no stored preference
exists today, so upload-time capture is the only source that requires zero
user effort; (c) precedent exists — iOS already ships `localHour` on
check-ins (`check-in-scorer.ts:327`), so shipping `TimeZone.current.identifier`
at upload is established practice, and the web equivalent is one line
(`Intl.DateTimeFormat().resolvedOptions().timeZone`).

Fallback chain, ranked (engine resolves once per run):

1. **Stored preference** `profiles.timezone` (new column; user-editable in
   settings; seeded by first upload's device tz).
2. **Client/device tz at upload** `uploads.timezone` (new column; web sends
   `Intl` value, iOS sends `TimeZone.current` — iOS can send device tz at
   upload today, no app-architecture change).
3. **Inferred from bet distribution** — for legacy uploads only: take
   `datetime_tz` rows, find the 6-hour minimum-activity trough, align it to
   03:00–09:00 local. Only runs when 1–2 are absent; confidence-gated
   (needs ≥50 timed rows); result stored back to `uploads.timezone` with an
   `inferred` marker, never to `profiles`.
4. **UTC with honest labeling** — engine emits `timezone_basis: 'utc'` and
   every timing surface renders "times in UTC" instead of implying local.
   (The `timezoneLabel: 'Local time'` placeholder already in
   `lib/control-system.ts:338` / `ControlPageClient.tsx:97` becomes real.)

Normalization rule per `timestamp_quality`:
- `datetime_tz` → convert instant to resolved tz for hour/day bucketing.
- `datetime_naive` → treat stored UTC fields as already-local wall-clock
  (no conversion — converting would corrupt them; this is the R0b majority).
- `date_only` → no time-of-day exists; see T3.

### T3. Hour-bucketing correctness (single biggest fix)

`date_only` rows are **excluded from all hour-based analytics** instead of
bucketing at hour 0. Today 65% of prod bets sit at `getHours()===0`, inside
the `h>=23||h<5` late-night window — late-night findings are currently
~two-thirds artifact. The engine already has a midnight-detector hint
(`d.getHours()===0 && d.getMinutes()===0` at engine:391, 772) — it becomes
obsolete once quality flags exist.

Affected sites (all `lib/autopsy-engine.ts` unless noted): hour/day bucketing
403–404; Late-Night Betting bias 772–778; Sustained Late-Night Concentration
994–995; session 11pm grade deduction 1965; session display strings
2043, 2061–2064 (`toLocale*` renders server-UTC today); bet-annotation
hour/day signals 2239–2240; `lib/digest-helpers.ts:106–107` (UTC 3–9 band);
`lib/check-in-scorer.ts:327–329` (unify on the same resolver). `by_day`
keeps `date_only` rows (the date is real); `by_hour` and late-night metrics
gain an emitted `time_bearing_bet_count` so the UI can say "based on N bets
with time data."

### T4. Settlement-aware post-loss sequencing (designed against R0c)

Current chase logic (engine:1956–1962) keys purely on placement order within
a session: `if (sessionBets[i-1].result === 'loss' && stake[i] > stake[i-1])
→ chased`. With no settlement data in the system, every "after a loss" claim
is a causal confound — the prior bet usually hadn't settled when the next was
placed (see fixture `rapid-fire-unsettled.csv`: four bets in 14 minutes on
games that tip later).

Design, two tiers:

1. **Where settlement data exists** (`settled_at` non-null on the prior bet):
   chase = `placed_at[i] > settled_at[i-1] && result[i-1]==='loss' &&
   stake[i] > stake[i-1]`. Capture path: `ParsedBet.settled_at?` + nullable
   `bets.settled_at timestamptz` + new aliases
   (`settled_at, settle_time, settled_date, result_date, closed, time_settled`)
   in `COLUMN_ALIASES`, with the same quality classification as T1.
2. **Where it doesn't** (all historical rows; sources per matrix): the signal
   is **renamed and reframed** to *rapid-fire escalation* — stake escalation
   within a session, no loss-reaction causality claimed. Copy changes in the
   bias name, session `heatSignals` descriptors, LLM prompt context, and
   markdown. "Post-Loss Escalation" only ships when tier-1 evidence backs it.

Per-source behavior after this lands:

| Source | Behavior |
|---|---|
| Pikkit | Settlement timestamp captured on new uploads → true post-loss sequencing |
| FanDuel / DraftKings CSV | Rapid-fire reframe until an export sample confirms a settlement column; aliases ready if it exists |
| PrizePicks / Underdog | Rapid-fire reframe (no per-pick settlement concept) |
| Paste / screenshot | Rapid-fire reframe; extending LLM prompts to extract settlement is deferred (low yield, high hallucination risk) |
| All pre-existing rows | Rapid-fire reframe permanently (settlement unrecoverable) |

### T5. Date-parse failures: reject, never default

`parseRow()` 310–317: failure → **skip the row** and append to `warnings[]`
(`"Row N: unparseable date <raw> — row skipped"`), surfaced in the existing
upload-result warning UI. Empty date cell → same. The `new Date()` (no
argument) default for missing `dateStr` is removed. Fixture:
`unparseable-dates.csv` (6 bad variants + 1 valid control row → expect 1
parsed bet, 6 warnings).

### T6. Downstream effects (enumerated)

| Surface | Effect of T1–T5 |
|---|---|
| Session detection (engine:1858, 3h gap) | Gap math is tz-independent (instant deltas) — unchanged. But `date_only` rows currently glue into fake midnight "sessions"; they get excluded from session detection (no real ordering exists within a day). Session counts drop for date-only-heavy users → interacts with the 20-session sufficiency floor |
| Late-night claims (bias 772, 994; digest) | Fire on time-bearing rows in resolved tz; expect large prevalence drop (65% of rows leave the window). Existing reports that showed late-night findings will not reproduce them — schema_version moment |
| Timing charts (`AutopsyReport.tsx:1781–1915`) | by_hour from time-bearing rows only + honest tz label + N-of-M caption; by_day unchanged in basis |
| Heated-session selection in snapshots (top-3 by grade severity, LOOSEN surface) | The −5 "after 11pm" deduction (1965) re-bases → some sessions regrade → different top-3 picked → snapshot teaser + `heatedSessionCount` in report-comparison shift |
| Bet annotations (2239–2240) | hour/day signals null for `date_only` rows; annotation prose stops claiming time-of-day for them |
| Digest email (digest-helpers:106) | Same resolver; band becomes real local 22:00–04:00 |
| Check-in scorer | Falls back to resolver instead of raw UTC when `localHour` absent (web) |

### T7. schema_version 2 → 3 — see shared section below (applies in full)

WS-TEMPORAL-specific diff exposure: timing isn't directly diffed by
`compareReports`/`computeWhatChanged`, but bias sets are — late-night biases
vanishing across the boundary would otherwise render as "improvement."
Annotation must cover bias presence/absence deltas.

### T8. Interaction with ENGINE-PR-SNAPSHOT-LOOSEN — NOT independent

The in-flight sufficiency-floor work and WS-TEMPORAL share three seams:
(1) `lib/engine/constants/thresholds.ts` — hour-based detectors' effective
sample becomes *time-bearing settled bets*, shrinking counts against any
floor the LOOSEN work sets (a 100-bet user with 70 date-only rows has 30
eligible rows for late-night detection); floors for timing detectors must be
defined on the new basis or they silently re-tighten what LOOSEN loosened.
(2) Session regrading (T6) changes the heated-session aggregates and top-3
selection that the LOOSEN snapshot surface ships. (3) `verify-engine-floor.ts`
golden re-baselining collides if both land simultaneously.
**Sequencing: LOOSEN lands first; WS-TEMPORAL rebases, re-runs
verify-engine-floor + redaction suites, and re-baselines goldens once.**

### T9. Files / functions / blast radius / migration / fixtures / effort

**Files + functions (before → after):**

| File | Function | Before → after |
|---|---|---|
| `lib/csv-parser.ts` | `parseRow()` 260 | date default-to-today → reject+warn; classify `timestamp_quality`; map `settled_at` aliases |
| `types/index.ts` | `ParsedBet`, `Bet` | + `settled_at?`, + `timestamp_quality` |
| `lib/import-bets.ts` | `importBets()`, `dupKey()` 11/29 | pass-through new fields; dupKey unaffected (date part stable once defaults are gone) |
| `app/api/upload`, `parse-paste`, `parse-screenshot`, `upload-parsed` routes | handlers | accept + persist `timezone` (body/FormData field); LLM paths stamp `date_only` |
| `app/api/analyze/route.ts` | handler | resolve tz via fallback chain; pass to engine |
| `lib/autopsy-engine.ts` | new `resolveHour(bet, tz)`; `calculateTiming`, late-night detectors, `detectAndGradeSessions`, annotation loop, `runSnapshot` | 9 `getHours/getDay/toLocale*` sites → resolver; chase → two-tier T4; emit `timezone_basis`, `time_bearing_bet_count` |
| `lib/digest-helpers.ts`, `lib/check-in-scorer.ts` | late-night band | same resolver |
| `components/AutopsyReport.tsx` | timing chart section | tz label + N-of-M caption |
| `supabase/migrations/` | new migration | `bets.settled_at timestamptz`, `bets.timestamp_quality text`, `uploads.timezone text`, `profiles.timezone text` + backfill UPDATE (T1 heuristic) |

**Blast radius per changed value:** `timing_analysis.by_hour` (chart, BetIQ
timing component, LLM prompt) · `late_night_stats` + 2 late-night biases
(report UI, snapshot teaser counts, WhatChanged bias deltas, digest) ·
session grades (snapshot top-3, heated count → report-comparison) · bet
annotations (report detail, ask-report context) · markdown copy.

**Migration impact:** 4 additive nullable columns + 1 backfill UPDATE; no
destructive change; iOS Codable unaffected (additive optional fields; iOS
ignores unknown keys per its defensive `try?` pattern).

**Named fixtures:** `cross-tz-iso.csv`, `naive-and-dateonly.csv`,
`unparseable-dates.csv`, `rapid-fire-unsettled.csv`.

**Effort:** PR-T1 ingestion+schema ~6h · PR-T2 engine bucketing+labels ~9h ·
PR-T3 sequencing reframe+copy ~7h · fixtures/tests/goldens ~5h ≈ **27h / 3 PRs**.

---

## WS-NUMERIC outline

### N1. odds=0 / non-finite guards

- `calcWhatIfProfit` (engine:832–836): `100 / Math.abs(0)` = Infinity;
  undefined odds → NaN. Guard: a bet with `!Number.isFinite(odds) ||
  Math.abs(odds) < 100` is excluded from every what-if cohort (American odds
  cannot be inside ±100); emit `excluded_bet_count` on `metrics.what_ifs`.
- `impliedProb` (engine:510–513) + duplicate `oddsToImpliedProb` (287–290):
  odds=0 → 1.0. Same validity predicate; invalid rows skipped per caller:
  expected-wins/luck accumulation (328), stake-CV normalization (516), odds
  buckets (319–333), BetIQ line-value dog filter (1341), calibration MAE
  (1354–1360), enhanced-tilt odds drift (~1516). Dedupe the two functions
  into one exported helper while touching them.
- Wire guard in `lib/engine/whatIf.ts` (`buildWhatIfScenarios`):
  `Number.isFinite` assertion before emit — belt-and-suspenders so
  Infinity/NaN can never reach JSON again.
- Fixture: `odds-zero-and-missing.csv` (odds 0 / blank / `N/A` on wins and
  losses + valid controls).

### N2. Cash-out P&L per entry point

Introduce `'cashed_out'` as a first-class result end-to-end (recommended over
a void-with-profit-exemption hack — voids and cash-outs have opposite P&L
semantics and conflating them is the original sin):

- `lib/csv-parser.ts`: RESULT_MAP cash-out variants → `'cashed_out'`;
  zeroing override (330–333) stays push/void-only, so CSV profit survives.
- `app/api/parse-paste` + `parse-screenshot`: add `cashed_out` to the prompt
  result enum; profit passthrough (both already compute/accept profit).
- `app/api/upload-parsed`: accept the widened union.
- Engine: cash-outs count as **settled for P&L** (totalProfit/totalStaked,
  category aggregation, sessions) but **excluded from win rate** and from
  implied-prob calibration (realized odds no longer match closing odds).
- Migration: widen the `bets.result` check constraint
  (`schema.sql:96`) to include `'cashed_out'`.
- Historical data: unrecoverable (zeroed at parse; see R0a) — old rows stay
  `void`; only new uploads benefit. Stated honestly, no backfill attempted.
- Fixture: `cash-outs.csv` (4 variants, positive and negative partial P&L).

### N3. ROI denominator excludes pending/void

`engine:484–491`: `totalStaked`/`totalProfit`/`roiPercent` move from `sorted`
(all rows) to a `resolved` set = win/loss/push/cashed_out. Pending and void
stakes leave the denominator. Emission sites re-checked: summary (59, 860),
markdown (2781), snapshot repackaging (2529, 3606). Category ROI (656–673)
already filters settled — unchanged. Fixture: `pushes-pending-void.csv`
(pending/open + void/cancelled rows with stakes that must not dilute ROI).

### N4. Pushes out of win rate

`engine:497–498`: denominator `['win','loss','push']` → `['win','loss']`.
Pushes remain visible as their own count in summary. Same fixture as N3
(includes a push with a nonzero CSV profit that the parser must also zero —
guarding the N2 change keeps push-zeroing intact).

### N5. Category triple-count fix

`engine:656–673` maps each bet into up to 4 overlapping keys (`sport`,
`bet_type`, `sport+bet_type`, `sportsbook`) in one map — every dollar counted
up to 4×. Fix: tag each entry with its dimension
(`{dimension: 'sport'|'bet_type'|'combo'|'sportsbook'}`); any aggregation
that *sums across* category entries (strategic-leaks totals 2961–2973,
high-volume leak gating 747–753/982) sums within a single dimension only
(default: `combo`, the only true partition). Per-key ROI views stay — they
were never wrong individually, only their cross-sums.

### N6. Luck relabeled performance-vs-vig

`engine:304–370` compares actual wins to implied-prob expected wins —
implied prob includes vig, so a break-even bettor at −110 reads slightly
"cold" forever. **Recommendation: relabel, don't re-math.** The metric is
genuinely "results vs market expectation, vig included" — rename label/copy
("Running cold" → "Below market expectation") and document the vig bias in
the tooltip + LLM prompt context. A de-vigged baseline (pair-devig or
bucket-level overround removal) is real quant work with its own failure
modes — parked as an explicit non-goal of this WS.

### N7. Deterministic per-bias costs — **position: IN SCOPE**

The merge at `engine:2944–2958` takes `estimated_cost` from the LLM
(`claudeData.biases_detected[].estimated_cost ?? 0`) — fabricated, can
contradict the deterministic leak totals, and `computeWhatChanged` diffs it
across reports (noise vs noise). The deterministic detectors already carry
`evidence_bet_ids` (loss chasing 690, parlay 707, stake volatility 720,
favorite bias 741, category leak 753, high-volume leak 982, late-night 1012,
emotional drag 1038). Change: each detector computes its own
`estimated_cost` from its evidence cohort (e.g. chase detectors: sum of
losses on chase-flagged bets; category leak: the category's net negative
profit; volatility: profit delta vs flat-stake counterfactual reusing the
N1-guarded calcWhatIfProfit) and the merge keeps LLM prose
(description/fix) but **never** the LLM's number. The deterministic cost
also goes into the LLM prompt so the narrative can't contradict it. This
simultaneously fixes the snapshot `RedactedValue` honesty exposure (blurred
numbers become real) and makes WhatChanged bias-cost deltas meaningful.
Per-detector cost formulas get their own table in the implementation brief.

### N8. session_analysis / edge_profile reconciliation — **position: EXPLICIT DEFER**

Rationale: both are LLM-shaped, full-mode-only fields (`engine:2983–2987`;
`edge_profile` merges only deterministic `sharp_score`); recon found **no web
UI reader of edge_profile at all**, and `session_analysis` is narrative prose
beside the deterministic `session_detection`. Reconciling them is a
structured-outputs/prompt-contract project (already a product-audit
workstream) — bundling it here would couple deterministic math fixes to LLM
contract changes and balloon the blast radius. One cheap WS-NUMERIC nudge
ships anyway: N7 puts deterministic costs into the prompt, removing the worst
contradiction class. Defer the rest to the structured-outputs workstream with
this report as input.

### N9. insufficient_data inventory (emitters vs readers)

| Composite | Flag site | Floor | Read by |
|---|---|---|---|
| `betiq.insufficient_data` | engine:1314 | 50 settled | ✅ `AutopsyReport.tsx:1031,1072` — the only real reader |
| `discipline_score.insufficient_data` | engine:1156 | 50 | ❌ no UI check found |
| `emotion_score_insufficient_data` (+`tilt_` twin) | engine:2559–2560, 2996–2997 | 50 | ❌ web ignores (typed for iOS per types:252–257) |
| `betting_archetype.insufficient_data` | engine:930 | 50 ("Building Sample") | ❌ name string carries the signal; flag unread |
| `enhanced_tilt.insufficient_data` | engine:1457 | 100 | ❌ UI renders risk_level/signals regardless |
| `session_detection.insufficient_data` | engine:2187 | 20 sessions | ❌ UI checks `totalSessions > 0` only (AutopsyReport:2274) |
| `biases_detected` / `behavioral_patterns` / `strategic_leaks` | `gateArray` collapse → `[]` | 100 | ❌ structurally unreadable — empty array is indistinguishable from "no findings"; UI renders "none detected" |

WS-NUMERIC ships this inventory as documentation only; reader-side fixes and
any flag-shape change (e.g. `{items, insufficient_data}` wrappers for the
arrays) belong to the LOOSEN/sufficiency workstream, which owns these
thresholds. Flagged as its input.

### N10. schema_version 2 → 3 — see shared section (applies in full)

WS-NUMERIC-specific diff exposure is the worst of the two workstreams:
`betiq.score`, win-rate-derived values, and `estimated_cost` are exactly what
`computeWhatChanged`/`compareReports` diff. v2 costs are LLM noise; v3 costs
are deterministic — a cross-version cost delta is meaningless by
construction and must be suppressed under the annotation (below).

### N11. Interaction with ENGINE-PR-SNAPSHOT-LOOSEN — independent, with two caveats

WS-NUMERIC touches no thresholds and no redaction logic, so it can land
before or after the sufficiency-floor work. Caveats: (a) N7's deterministic
costs flow into snapshot bias teasers that LOOSEN-V2's
`scrubDollarsInSentence` must keep scrubbing — redaction suite (31
assertions) re-run mandatory; (b) N3/N5 change detector trigger inputs
(category ROI, leak gating) → bias counts can shift → `_snapshot_counts` /
teaser counts move → re-run `verify-engine-floor.ts` goldens. No sequencing
constraint, just suite re-runs on whichever lands second.

### N12. Files / functions / blast radius / migration / fixtures / effort

**Files + functions (before → after):**

| File | Function | Before → after |
|---|---|---|
| `lib/autopsy-engine.ts` | `calcWhatIfProfit` 832, `impliedProb` 510 + `oddsToImpliedProb` 287 (merge), summary calc 481–498, category map 656–673, luck 304–370, bias merge 2944–2958, detectors 677–1040 | guards + exclusion counts; resolved-set ROI; win/loss-only win rate; dimension-tagged categories; relabel; deterministic `estimated_cost` per detector |
| `lib/engine/whatIf.ts` | `buildWhatIfScenarios` | finite-number wire guard |
| `lib/csv-parser.ts` | RESULT_MAP 28–39, zero-override 330–333 | `cashed_out` first-class; zeroing push/void only |
| `app/api/parse-paste`, `parse-screenshot`, `upload-parsed` routes | prompt enums / validation | + `cashed_out` |
| `types/index.ts` | `ParsedBet['result']`, bias types | widen union; `estimated_cost` documented deterministic |
| `app/api/analyze/route.ts` | prompt assembly | deterministic costs into LLM context |
| `supabase/migrations/` | new migration | widen `bets.result` check constraint |

**Blast radius per changed value:** `roi_percent` (summary card, markdown,
LLM prompt, snapshot repack) · `win_rate` (summary, archetype inputs, LLM
prompt) · `what_ifs` (iOS WhatIfCard via wire `what_if_scenarios`, LLM
exec-diagnosis prompt — the PROGRESS watch-item about scenario-3 dual-guard
should be re-checked after N1) · `betiq.score` (paywall card, WhatChanged,
report-comparison) · `biases_detected[].estimated_cost` (bias cards,
snapshot blur values, WhatChanged topImpactDeltas) · `strategic_leaks`
totals (Ch5, snapshot teaser) · luck label (summary copy, LLM prompt).

**Migration impact:** 1 check-constraint widening; no backfill (historical
cash-outs unrecoverable, stated above). iOS: `result` union widening is
additive on the wire; iOS decoders treating result as String are unaffected;
if any Swift enum decodes result strictly, the iOS repo needs a one-case PR
**before** web ships N2 — flagged as a cross-repo pre-check.

**Named fixtures:** `odds-zero-and-missing.csv`, `cash-outs.csv`,
`pushes-pending-void.csv`.

**Effort:** PR-N1 guards + denominators + win rate + category dimensions
~8h · PR-N2 cashed_out end-to-end + constraint migration + iOS pre-check
~7h · PR-N3 deterministic bias costs + luck relabel + prompt wiring ~8h ·
fixtures/tests/goldens ~4h ≈ **27h / 3 PRs**.

---

## Shared: schema_version 2 → 3 handling — forced recommendation

Both workstreams change emitted *values* (not shapes): temporal kills
artifact late-night findings and regrades sessions; numeric moves ROI,
win rate, BetIQ inputs, and replaces LLM bias costs with deterministic ones.
Cross-version diffs would render methodology changes as user behavior change
("your late-night problem improved!").

**Recommendation (forced pick): ANNOTATE cross-version diffs.**

Mechanics: `computeWhatChanged` and `compareReports` receive both reports'
`schema_version` (default 1 when absent). When they differ:
- still compute **shape-stable, methodology-stable** deltas: archetype name,
  bias presence/absence by name, session/heated counts;
- **suppress numeric deltas whose formula changed**: `betiq.score`,
  emotion/discipline, `estimated_cost` (v2 = LLM noise, v3 = deterministic —
  comparing them is meaningless by construction);
- tag the result `methodology_changed: true`; `WhatChangedSection` renders a
  one-line caption ("Scoring methodology updated since your last report —
  score deltas resume next report"). Honest, matches the product's
  honesty-positioning push.

Why not the alternatives:
- **Suppress all cross-version diffs:** cheapest, but kills the longitudinal
  WhatChanged/vs-last surface for one full report cycle per user — and the
  product audit ranks longitudinal memory as the #1 moat and the Pro
  justification. Throwing away archetype/bias continuity that is actually
  still valid overshoots.
- **Recompute v2 under v3:** mutates paid artifacts users already saw
  (rewriting history is the dishonesty we're fixing, pointed the other way);
  requires the original bet cohort, which dedup/deletion may no longer
  reproduce; LLM prose would sit atop changed numbers unless re-generated
  (cost + drift); and the engine re-run fleet is real money for zero new
  revenue. Viable later as an opt-in "re-run my analysis," not as migration.

Coordination: **one bump, one release train.** First value-changing PR from
either workstream bumps 2→3 at both write sites
(`app/api/analyze/route.ts:444`, `lib/iap-upgrade.ts:208`); the other
workstream rides the same version if it lands in the same release window,
else takes 4 with the same annotation machinery (which is version-pair
agnostic by design: it keys on `prior !== current`, not on specific values).
The annotation PR itself must land **before or with** the first bump.

---

## Halt

R0 complete, both outlines complete, 7 fixtures authored. Awaiting approval
on: (1) WS-TEMPORAL outline incl. upload-time device-tz capture + date_only
exclusions + rapid-fire reframe; (2) WS-NUMERIC outline incl. `cashed_out`
end-to-end + deterministic bias costs in scope, session_analysis/edge_profile
reconciliation deferred; (3) ANNOTATE for schema_version 2→3; (4) sequencing
(LOOSEN → TEMPORAL; NUMERIC independent). Notion rows on approval.
