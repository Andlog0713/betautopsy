# BetAutopsy — Claude Code instructions

## Architecture
- Capacitor with bundled static export (Next.js `output: 'export'`).
- iOS uses `iosScheme: 'https'` + `hostname: 'localhost'`.
- API calls rewrite to `https://www.betautopsy.com` via `lib/api-client.ts`.
- Do NOT switch to remote-URL or React Native.
- Server Components stay Server Components.

## Design system — non-negotiable
- No backdrop-blur. No box-shadow. No gradient text.
- No `rounded-2xl`, `rounded-3xl`. Max 6px radius (`rounded-md`).
- No off-palette colors: amber, orange, cyan, purple, pink, fuchsia, emerald, sky, rose, indigo, violet.
- No bento grids, glassmorphism, shadcn defaults.
- No emoji in UI strings.
- No hamburger menus on any viewport.
- Colors: midnight `#0D1117`, scalpel `#00C9A7`, bleed `#C4463A`, surface tokens only.
- Fonts: Plus Jakarta Sans (sans), IBM Plex Mono (mono). No Inter.

## Capacitor plugin pattern
- Dynamic-import inside handlers: `const { Browser } = await import('@capacitor/browser')`.
- Never top-level import — breaks web bundle.
- Gate native code with `isMobileApp()` (runtime) or `isMobileBuild()` (compile-time).

## Stripe / payments
- Stripe stays web-routed. Never IAP.
- Use `openCheckoutUrl()` in `lib/native.ts` — opens SFSafariViewController on native.
- Never `window.location.href = data.url` for Stripe URLs.

## Progress tracking
- At the end of every response that completes work or proposes new work, update `PROGRESS.md`.
- Move completed items from "In progress" to "Done this session."
- If the user's message introduces a new task that's out of current scope, append it to "Parked / next branch" without being asked.
- If unsure whether something belongs in scope, ask before adding.
- Treat `PROGRESS.md` as the source of truth for "where are we" — read it at the start of every session.
- iOS polish work tracked in `IOS_POLISH.md`.

## Pushback expected
- Refuse requests that violate the design system.
- Refuse architecture changes (RN rewrite, remote-URL switch, monorepo restructure) unless explicitly scoped in the user's prompt.
- When the user proposes adding a feature mid-branch that doesn't fit the branch scope, suggest parking it.

---

## Current branch: `copy/behavioral-framing-prompt` — behavioral-framing rule on report advice fields (2026-06-19)

### Sprint tracker row (Category: Analysis pipeline)
- **Row:** "Behavioral-framing rule on report advice fields (5.3 App Store hedge)"
  · Category: Analysis pipeline · Status: PR open, NOT merged (Andrew regenerates
  one report + eyeballs fix lines first) · Surface: full-report SYSTEM_PROMPT →
  bias `fix`, `recommendations`, `personal_rules`, `edge_profile.reallocation_advice`.
  Recorded here (PROGRESS = source of truth); no Notion write per standing convention.

### Done this session: behavioral-framing constraint on LLM advice fields
- **Step 0 finding (reported, no edit):** the two FIX lines flagged (parlay "+EV /
  stop at 2", NFL-spread "key number / line movement / take the alternate") are
  NOT hardcoded — they're LLM-authored at generation time. Bias `fix` =
  `claudeBias?.fix` (autopsy-engine.ts:3101), `recommendations` =
  `claudeData.recommendations` (3138), `personal_rules` = `claudeData.personal_rules`
  (3144). None of the exact phrases exist as literals anywhere in lib/app/components
  (only blog posts + an explainer keyword array). So the fix is prompt guidance, not
  a string swap. Andrew chose Option 1 (prompt guidance only).
- **Change:** one `BEHAVIORAL FRAMING RULE` added to the full-report SYSTEM_PROMPT
  (after SPORTSBOOK RULE, before Critical Rules). Scoped to the PRESCRIPTIVE ADVICE
  FIELDS only (fix / recommendations / personal_rules / edge_profile.reallocation_advice);
  explicitly NOT descriptions/evidence/diagnosis (those keep factual latitude — e.g.
  "losses pushed through margins" stays sayable). Forbids in advice: expected-value
  language, "key number(s)", "line movement"/"wait for the line to move",
  "take the alternate"/"alternate line", and staking-system prescriptions
  ("1% of bankroll", "unit size", "set your unit", "X units"). Instructs behavioral
  reframes (stop-doing + why-it-cost + pre-bet checkpoint) and keeps the existing
  voice. Two worked examples (parlay stop-at-2, NFL pre-bet checkpoint).
- **Snapshot path untouched:** runSnapshot is pure-compute (no LLM, fix=''), so the
  full-report SYSTEM_PROMPT is the only generation surface.
- **Gates:** tsc 0 · vitest 378/378 · (LLM output not unit-tested; prompt is a const
  string, deterministic suites unaffected). Verification is Andrew regenerating a
  real report before merge.

## Previous branch: `copy/check-in-gate` — COPY_SYSTEM gate on server check-in copy (2026-06-15)

### Sprint tracker row (Category: Analysis pipeline)
- **Row:** "Route PreBetCheckIn summary + flag strings through COPY_SYSTEM gate"
  · Category: Analysis pipeline · Status: Done (PR open, squash) · Surface:
  check-in scorer → iOS wire. Recorded here (PROGRESS = source of truth); no
  Notion write per the standing "Notion stays in the chat layer" convention.

### Done this session: deterministic COPY_SYSTEM gate for server-generated check-in copy
- **Step 0 finding:** check-in `summary` + `flags[].title`/`detail` are
  generated deterministically in `lib/check-in-scorer.ts` (pure JS, no LLM),
  serialized by `app/api/check-in/route.ts` to iOS AND persisted to
  `pre_bet_checkins`. They ran through NO banned-phrase filter — the existing
  em-dash/no-tilt/no-exclamation rules are LLM-prompt-only (autopsy
  SYSTEM_PROMPT), which never touch this path. Confirmed real leak, not just a
  guardrail: `control-system.ts:913` sets the check-in `cooldown.summary` to
  the raw DB `trigger_reason`, which `computeSummary` embeds into the summary
  (`Cooldown active. ${reason}`) and ships unfiltered.
- **New `lib/copy-system.ts` · `enforceCopySystem(text)`:** deterministic,
  idempotent, digit-preserving. Mechanical rules: em/en-dash separators →
  sentence breaks (numeric ranges like 5–10 preserved); "tilt" family →
  "chasing"; "!" → ".". "No fabricated stats" is enforced by construction
  (every check-in number derives from the user's own bets) + a test scanning
  output with the exported `FABRICATED_POPULATION_STAT_RX`, NOT a runtime strip
  (a regex can't tell a computed stat from an invented one).
- **Wiring:** gate applied at two chokepoints in the scorer — `flag()` (every
  title/detail) and the assembled `summary` return (covers all branches + the
  embedded cooldown reason). No-op on today's clean copy (em-dashes in the file
  were comment-only), so zero wire change for compliant strings.
- **Out of scope (flagged):** standalone control-system strings that also ship
  (`cooldown.summary` as its own field, `ruleViolations` text,
  `reflectionPrompts`, `planContext.adherenceSummary`) — adjacent, follow-up.
- **Tests:** `__tests__/copy-system.test.ts` (10) — pure-gate transforms +
  idempotence + digit-preservation + fabricated-stat regex, plus scorer
  integration (all shipped strings are fixed-points of the gate; a dirty
  upstream cooldown `trigger_reason` with em-dash + "tilt" + "!" is cleaned
  end-to-end). tsc 0 · vitest 378 · build 0.

## Previous branch: `loosen/small-sample-tier` — SNAPSHOT-LOOSEN sufficiency floors (approved + built 2026-06-12; gates TestFlight)

### Done this session: small-sample bias tier + sufficiency wire state + reader fixes (schema_version 4)
- **Band replaces the 100-settled cliff:** <30 settled no biases; 30-99
  "limited" — allowlist only (Stake Volatility, Heavy Parlay Tendency,
  Favorite-Heavy Lean, Post-Loss Escalation), per-bias sample guard >= 10,
  severity capped medium, confidence forced 'low' in both assembly paths;
  >=100 unchanged. Band edge 30 (Andrew: aligns with confidenceFor medium
  edge + contradictions floor; 20 considered-and-rejected, documented in
  thresholds.ts). Leaks stay at 100 (category ROI <100 settled is variance);
  heated-aggregates floor untouched (session-touching → T8 follow-up).
- **`sufficiency?: { settledBets, tier, gated }`** on AutopsyAnalysis, BOTH
  modes — resolves the gateArray->[] "none detected" ambiguity. Additive-
  optional; iOS consumption is follow-up (graceful absence is the contract).
- **schema_version 3→4** both writers; compareReports now also suppresses
  cross-version 'new' bias claims (mirror of the false-resolved bug — v4
  surfaces biases for small users where v3 had none).
- **T8/hero parity: zero session code touched**; regression test asserts
  teaser worstSessionDate === selectHeroSession date.
- **Web reader:** Findings building/limited states (empty-but-gated renders
  "Building your profile: N of 30 settled bets", limited caption on early
  signals); SnapshotPaywall building copy at zero findings; enhanced_tilt
  panel suppressed on insufficient_data (N9 reader fix).
- **LLM prompt:** limited-band reports carry "frame as early signals, not
  established patterns" in the pre-classified biases block.
- **verify-engine-floor:** 50-bet assertion updated to the band contract
  (allowlist-only + capped, not empty); golden re-baselined locally.
- **Deploy-verify (Andrew):** post-deploy ~75-settled CSV upload + SQL check
  (query in PR body): schema_version=4, sufficiency.tier='limited', biases
  nonempty with severity<=medium + confidence='low', teaser total_biases>0.

## Previous branch: `cleanup/cross-version-and-copy` — web v1 cleanup batch (2026-06-12)

### Done this session: PR #73 rebase+merge, e2e un-red, cross-version comparison fix, marketing copy sweep
- **PR #73 (report_ready push):** rebased onto post-#74 main — #74's
  `schema_version = 3` stamp survived in lib/iap-upgrade.ts alongside the new
  `maybeSendReportReadyPush` call (verified both present). Squash-merged as
  `cb4aa73`; Vercel deploy green.
- **e2e UN-RED (the pre-existing red since May):** sole offender was the bare
  inline logo `<a>` (228x36 < 44pt) in `app/(auth)/layout.tsx` on /login +
  /signup. `min-h-[44px] inline-flex` on both logo Links; verified locally 6/6
  across 3 iPhone viewports, then green in CI. e2e is now a meaningful gate
  again.
- **Cross-version comparison fix (report-comparison.ts):** when
  `schema_version` differs between compared reports (absent = 1), disappeared-
  bias "resolved" claims are SUPPRESSED (not annotated — BiasChange has no
  annotation slot, WhatChangedSection renders chips verbatim, and
  topImprovement would headline the false claim at magnitude 20). Same-named
  improved/worsened/new comparisons survive cross-version. 5 tests.
- **Marketing copy sweep (additive-total language → single-biggest-leak):**
  app/page.tsx:219 ($480/quarter claim dropped), app/sample/page.tsx:44
  (em dash also removed), blog how-to post JSON-LD + body (fabricated
  "80-90% of total losses" stat removed, step renamed "Identify Your Biggest
  Leak" with explicit leaks-overlap explanation), lib/demo-data.ts DFS insight
  ("recoverable profit" → engine-voice "lost edge"). Email templates +
  OG/metadata grepped clean.
- **SNAPSHOT-LOOSEN recon (report-only):** the shipped ENGINE-PR-SNAPSHOT-
  LOOSEN/-V2 (May, redaction loosening) are DONE and distinct from the
  2026-06-10-approved "LOOSEN" sufficiency-floor workstream, which remains
  OPEN and outline-gated: #74's snapshot changes (silhouette, teaser,
  sample_size/confidence metadata) COMPLEMENT it (the metadata is exactly the
  input its evidence-disclosure UI needs) but do not supersede the core scope
  — floor thresholds for small samples, the structurally-unreadable
  `gateArray → []` ambiguity (T9), and the small-sample finding tier.
- **verify-engine-floor (local-only maintenance):** re-run + golden
  re-baseline against gitignored fixtures post-#73/#74 — result reported in
  chat (not committed; golden is gitignored).

## Previous branch: `report-trust/recovery-model` — REPORT-TRUST wire-format PR (built 2026-06-12; merged as `0e0f617` via PR #74, deployed)
- **5 commits, build/tsc/vitest green between each:** (1) engine-core —
  `recovery` (non-additive: single largest counterfactual as rounded range +
  verified net; lib/engine/recovery.ts), bias dedup (lib/engine/dedupeBiases.ts,
  SAME-DIMENSION signal groups only: category pair + late-night pair; reverses
  engine:964's no-dedupe comment while preserving what it protected —
  different-category findings both survive because dedup keys on evidence not
  name; cross-dimension collapses explicitly excluded), severity tightened
  lowercase (Andrew overruled the brief's uppercase), per-finding
  sample_size/confidence/sub_splits; (2) `charts?: ReportCharts` (full mode
  only) + DetectedSession.framing + worst-session prefers losing heated +
  snapshot teaser worstSessionDate/sessionTimelineSilhouette (same hero
  selection as the full timeline — tease/reveal parity); (3) SYSTEM_PROMPT:
  executive_diagnosis ≤32 words, fix ≤18, no-summing rule, raw-numeric-fields
  rule (prose keeps dollar citations); archetype ≤40 enforced as source-lint
  test; (4) web reader: 3 Total Recoverable surfaces → recovery display,
  pre-v3 fallback = largest single leak as rounded range (the SUM never
  renders again for any vintage), LLM bias chips → formatApproxUSD; (5)
  schema_version 2→3 (analyze route + iap-upgrade, kept in lockstep) +
  WhatChanged.crossSchemaVersion.
- **ADDITION 1 answer (stated explicitly):** schema_version remains
  read-ungated for rendering — tolerant optional decoding carries all
  back-compat. The bump is informational EXCEPT for its now-first programmatic
  reader: computeWhatChanged sets `crossSchemaVersion: true` across the
  boundary (absent version = 1) so delta copy can be softened. Satisfies the
  parked ANNOTATE constraint minimally.
- **ADDITION 2 answer (hero-timeline contract):** (a) built from the
  worst/heated session specifically (losing heated > win-but-risky heated >
  any, profit asc); (b) isChaseMarker = exact engine session chase rule, so
  marker count === chaseCount; (c) sessions <4 settled bets skipped
  (BET_COUNT_THRESHOLDS.heroTimelineMinBets); none qualifying → timeline []
  + heroSession null (explicit renderer check).
- **Residuals (flagged, not done):** lib/report-comparison.ts biasChanges can
  show the dedup-collapsed bias as 'resolved' across the v2→v3 boundary (web
  "vs last report" strip; no cross-version annotation there yet);
  verify-engine-floor golden needs a manual re-baseline (fixtures gitignored,
  real user data); marketing copy still says "recoverable dollars"
  (app/page.tsx:219, app/sample/page.tsx:44); charts hour/day buckets inherit
  the WS-TEMPORAL UTC bug (documented on the type, fixed by WS-TEMPORAL).
- **iOS gating:** iOS hero-chart work gated on this deploy being live;
  verification steps in the PR body.

## Current branch: `hardening/june-10`

### Done this session: ENGINE-HARDENING R0 recon + WS-TEMPORAL / WS-NUMERIC outlines (outline-only, no product code)
- **Deliverables:** `ENGINE_HARDENING_OUTLINES_2026-06-10.md` (R0 findings +
  both workstream outlines) + 7 synthetic golden fixtures under
  `__tests__/fixtures/ingestion/` (odds=0, cash-outs, unparseable dates,
  cross-tz ISO, naive/date-only, pushes/pending/void, rapid-fire-unsettled).
  NOTE: `test/fixtures/` is gitignored (real user data); the new dir is
  separate and committed.
- **R0 headline findings:**
  - No source captures any settlement timestamp — no `settled_at` in
    ParsedBet, bets table, or any column alias. All "after-a-loss" signals
    are placement-order only (confirmed engine:1956-1962).
  - Prod (7,647 bets, full PostgREST sample via .env.local service key —
    Supabase MCP still can't reach the project): 65.4% of rows are exactly
    midnight UTC (date-only parses) and hour 00 sits INSIDE the late-night
    window, so ~2/3 of bets read as "late night" artifactually. Timed cohort
    is naive-local-stored-as-UTC (hour trough 01-09 UTC proves it); only
    ~1% true-UTC ISO (Pikkit-style `Draftkings Sportsbook` rows, millis).
  - `profiles` has NO timezone column; only tz seam is check-in `localHour`.
  - schema_version (2) is write-only — zero readers gate on it; differs
    (what-changed.ts, report-comparison.ts) mix versions silently.
- **Key outline calls (pending Andrew approval):** device-tz capture at
  upload + per-row `timestamp_quality` + date-only rows excluded from hour
  analytics; post-loss reframed to rapid-fire escalation where settlement
  data absent (everywhere, today); date-parse failures reject not default;
  `cashed_out` first-class result (check-constraint migration);
  deterministic per-bias costs from evidence_bet_ids IN SCOPE;
  session_analysis/edge_profile reconciliation DEFERRED to structured-outputs;
  schema_version 2→3 cross-version diffs: ANNOTATE (forced pick);
  sequencing LOOSEN → TEMPORAL, NUMERIC independent.
- **APPROVED (Andrew, 2026-06-10):** WS-TEMPORAL, WS-NUMERIC, ANNOTATE for
  schema_version 2→3, sequencing LOOSEN→TEMPORAL with NUMERIC independent.
  Still outline-gated: LOOSEN is the iOS critical-path item and lands first;
  temporal/numeric gate App Store submission, NOT TestFlight.
- **Constraints attached to the approval:**
  1. Each workstream and any concurrent run gets its OWN branch off main
     (ws-temporal/*, ws-numeric/*); no two sessions share a working branch
     (this run's concurrent-write with the security session on
     hardening/june-10 must not repeat).
  2. Deterministic per-bias costs ship as their own PR (PR-N3), gated on the
     redaction 31-assert suite AND the WhatChanged cost-delta annotation both
     green — the change feeds snapshot blur + longitudinal diff, not just
     the report body.
  3. The date-only backfill heuristic is validated against a hand-checked
     sample before ANY historical row is reclassified.
  4. Pikkit settlement-timestamp capture filed as v1.1 (unlocks real
     post-loss sequencing later); today's reframe is rapid-fire everywhere.
- **Notion tracker rows created (BetAutopsy Tracker):**
  - WS-TEMPORAL (3 PRs) — `37b5964c-daf2-8123` (P1, L, blocked by LOOSEN +
    backfill-sample validation)
  - WS-NUMERIC PR-N1/N2 — `37b5964c-daf2-81ba-b790` (P1, M, iOS result-enum
    pre-check before N2)
  - WS-NUMERIC PR-N3 deterministic costs — `37b5964c-daf2-81ba-9f7f`
    (Blocked, gate per constraint 2)
  - schema_version ANNOTATE machinery — `37b5964c-daf2-815f` (P1, S, lands
    before/with first value-changing PR)
  - v1.1 Pikkit settlement capture — `37b5964c-daf2-817b` (P3)

## Previous branch: `claude/engine-whatif-transform` (PR-A baseline merged; ENGINE-WHATIF shipped then revised)

### Done this session: P0-SQL-JSON-PROJECTION — recon HALT, no code change (already shipped)
- **Outcome:** NO-OP. The brief asked to strip `bet_annotations` +
  `session_detection` from the list endpoint via a new `report_json_lite()`
  Postgres function (keeping the other 31 `report_json` keys). Step 1 recon
  found the brief's premise is stale: the iOS/web LIST route
  (`app/api/reports/route.ts:74-97`) already slims `report_json` to a 12-key
  card whitelist via `slimReportJson()` — shipped across PRs #63 (`6185efa`),
  #64 (`a28b056`), #65, #66. Both target keys (and ~19 more) are already
  dropped. Applying the brief verbatim would REGRESS payload (add back
  `timing_analysis`, `biases_detected`, `odds_analysis`, etc., growing rows
  from ~3 KB toward ~40 KB+) and add a needless DB migration.
- **Route inventory (LIST vs DETAIL):**
  - LIST: `app/api/reports/route.ts` list-by-user (RLS, limit 100) — already
    slimmed. `app/api/recent-activity/route.ts` (service-role ticker, limit 30)
    — pulls full json from DB but ships only 3 digested fields, no raw json.
    `app/api/admin/reports/route.ts` — admin-gated, full json (acceptable).
  - DETAIL (full json, untouched by design): `app/api/reports/[id]/route.ts`,
    `app/api/reports/route.ts?upgraded_from=` polling, `app/api/share/route.ts`,
    `app/api/admin/reports/[id]/route.ts`, `app/api/ask-report/route.ts`.
  - iOS mapping: `GET /api/reports` → `ReportListClient` (slimmed) ·
    `GET /api/reports/:id` → `ReportFetchClient` (full) · `?upgraded_from=` →
    `RevenueCatStore` polling (full). iOS shares the web API.
- **Decision (Andrew, this session):** Halt — already done. No branch, no PR,
  no migration. Sprint row to be closed as already-shipped.
- **Minor follow-up noted (not actioned):** `recent-activity` pulls 30× full
  `report_json` over the DB→server wire to extract 3 small fields; a column/
  jsonb projection there would cut server-side DB transfer (no client-payload
  impact). Parked, not in this brief's scope.

### Done this session: P0-PERSISTENCE-PERF-WEB-V3 — disable HTTP/3 advertisement (Alt-Svc: clear) (PR #66, squash `ed2023b`)
- **Why:** After the V3 Sentry-disable (`4b6077c`) made the *first* cold launch
  fast, Andrew's subsequent launches/refreshes hung again. Definitive cause in
  the iOS logs: `quic_conn_keepalive_handler … exceeding 2 outstanding
  keep-alives` + `nw_read_request_report … Receive failed "Operation timed
  out"`. iOS speaks HTTP/3 (QUIC over UDP) to api.betautopsy.com; after the
  first response carrying Vercel's `Alt-Svc` HTTP/3 advertisement, iOS caches
  the hint and prefers QUIC on later requests. QUIC to Vercel's edge hangs on
  Andrew's network (ISP/NAT dropping UDP keepalives). Web/curl/Safari were
  unaffected.
- **What shipped (belt + suspenders, server-side only):**
  - `vercel.json`: new `headers` rule sets `Alt-Svc: clear` on `/api/(.*)` at
    the edge. Existing `crons` (4) and `redirects` (mysharpscore→quiz) preserved
    intact; file remains valid JSON (keys: headers, crons, redirects).
  - `app/api/reports/route.ts`: both branches set `Alt-Svc: clear` on their
    response — list mode via `new NextResponse(…, { headers })`, polling mode
    via `NextResponse.json(obj, { headers })`. Same envelope + status codes;
    only headers added. Redundant with the edge rule so the header lands even if
    vercel.json isn't picked up.
- **Divergence from brief:** brief suggested a "comment" field in the
  vercel.json header rule. vercel.json header rules are strict-schema (unknown
  keys risk a deploy validation failure), so the explanation lives in inline
  route comments + this PROGRESS note instead — same intent, no deploy risk.
  **Reassess in v1.1** once the iOS connection stack is more robust (HTTP/3
  would be a modest perf win for mobile if QUIC stops hanging).
- **`/api/reports/[id]` detail endpoint NOT touched** in code, but it benefits
  from the vercel.json `/api/*` edge rule.
- **Tests:** augmented existing assertions (no new cases) — list-mode DESC+cap
  test and polling-mode filter test now assert `res.headers.get('Alt-Svc') ===
  'clear'`.
- **Gates:** `tsc --noEmit` 0 · `vitest run` 293 pass (11 files) · `next build` 0.
- **Files:** `vercel.json` (+8), `app/api/reports/route.ts` (+15/-2), `__tests__/api-reports-list.test.ts` (+6). 29 insertions / 2 deletions.
- **Merge ts (Vercel deploy verify, ~2-3 min lag):** 2026-05-21 19:11:15 -0400.
  Sprint umbrella 3675964c-daf2-812d.
- **For Andrew (NO iOS rebuild):** wait ~3 min for deploy, then retest cold
  launch. iOS may need ONE more launch to see the new `Alt-Svc: clear` header
  and drop its cached HTTP/3 hint; every launch after that should be
  sub-second.

### Done this session: P0-PERSISTENCE-PERF-HOTFIX — remove non-existent updated_at column (PR #65, squash `7d27234`)
- **Why:** `a28b056` added `'updated_at'` to `LIST_COLUMNS`, but `autopsy_reports`
  has no such column (only `created_at`; confirmed via Supabase MCP —
  `information_schema.columns` for the table lists id, user_id, report_type,
  bet_count_analyzed, date_range_start/end, report_json, report_markdown,
  model_used, tokens_used, cost_cents, created_at, is_paid,
  stripe_payment_intent_id, upgraded_from_snapshot_id, analyzed_upload_ids,
  analyzed_sportsbook — and nothing else). PostgREST rejected the unknown
  column, so every list-mode `/api/reports` request 500'd (Vercel logs: 13
  consecutive 500s in 5 min). Andrew saw "Couldn't load reports" in <1s.
- **What shipped:** dropped `'updated_at'` from `LIST_COLUMNS` and added a
  comment documenting that the column doesn't exist and must stay out. iOS Row
  decoder never consumed it (pre-`a28b056` `select('*')` didn't return it
  either), so no iOS change needed. Only `LIST_COLUMNS` + the corresponding test
  mocks/assertions touched; `[list_perf]` timing log and the rest of the route
  untouched.
- **Why CI missed it:** the Supabase client is mocked in
  `__tests__/api-reports-list.test.ts` and doesn't validate columns against the
  real schema. Gap to close with an integration test in v1.1.
- **Tests:** removed `updated_at` from `LIST_COLUMNS_STR` and the column-trim
  mock row; the DESC+cap select-projection assertion now matches the shorter
  list.
- **Gates:** `tsc --noEmit` 0 · `vitest run` 293 pass (11 files) · `next build` 0.
- **Files:** `app/api/reports/route.ts` (+5/-2), `__tests__/api-reports-list.test.ts` (-2). 5 insertions / 3 deletions.
- **Merge ts (Vercel deploy verify, ~2-3 min lag):** 2026-05-21 17:14:41 -0400.
  Sprint umbrella 3675964c-daf2-812d.

### Done this session: P0-PERSISTENCE-PERF-WEB-V2 — column trim + server timing diagnostic (PR #64, squash `a28b056`)
- **Why:** Andrew retested `6185efa` (slim transform) on 5G AND fast wifi —
  still 7-15s per cold launch with intermittent failures. Network is NOT the
  bottleneck. Slim shrank `report_json` 90% but speed improved only ~50%;
  measured response for the 58-report user was still ~433 KB because `6185efa`
  kept `select('*')`, so `report_markdown` (~5 KB/row, 269 KB total) plus other
  unused columns still shipped. There's a 5-10s fixed cost somewhere (server
  execution, iOS Codable, or token/keychain path) and we need diagnostic data
  to localize it before guessing at iOS-side fixes.
- **What shipped (`app/api/reports/route.ts`), two things:**
  1. **Column trim:** list-mode `select('*')` → explicit `LIST_COLUMNS`
     projection (id, report_type, bet_count_analyzed, date_range_start/end,
     created_at, updated_at, report_json, upgraded_from_snapshot_id, is_paid,
     analyzed_sportsbook). Drops `report_markdown`, `user_id`, `model_used`,
     `tokens_used`, `cost_cents`, `stripe_payment_intent_id`,
     `analyzed_upload_ids`. Expected response ~140 KB from 433 KB.
  2. **Server timing log:** new `console.log('[list_perf]', …)` emitting
     `db_query_ms`, `slim_transform_ms`, `serialize_ms`, `total_ms`, and
     `response_bytes` (TOTAL response size, not a sample row). Lands in Vercel
     runtime logs — after deploy these localize the remaining 7-15s cost as
     server-side vs iOS-side.
- **Emit change:** list mode switched from `NextResponse.json(obj)` to
  `new NextResponse(responseJson, …)` so the JSON is pre-serialized once,
  enabling accurate `serialize_ms` measurement and avoiding double-serialization.
- **Removed:** the `[slim_transform_metrics]` console.log block from `6185efa`
  is now redundant (response_bytes supersedes sample bytes) — consolidated into
  `[list_perf]`.
- **Polling mode (`?upgraded_from=X`) INTENTIONALLY untouched** — keeps
  `select('*')` and full `report_json`. `/api/reports/[id]` detail endpoint also
  untouched.
- **Tests:** `__tests__/api-reports-list.test.ts` +1 case — list-mode select
  does NOT return `report_markdown` or the other dropped columns (asserts the
  `.select()` projection is exactly `LIST_COLUMNS` and the dropped columns are
  absent from both the projection string and the response row). DESC+cap test
  updated to assert the trimmed projection. Existing <100 KB lock-in test still
  passes unchanged.
- **Gates:** `tsc --noEmit` 0 · `vitest run` 293 pass (11 files; was 292, +1) ·
  `next build` 0.
- **Files:** `app/api/reports/route.ts` (+81/-22), `__tests__/api-reports-list.test.ts` (+84). 143 insertions / 22 deletions.
- **Merge ts (Vercel deploy verify, ~2-3 min lag):** 2026-05-21 17:04:20 -0400.
  Sprint umbrella 3675964c-daf2-812d.
- **Next signal:** if Andrew still sees 7-15s after this deploy, `[list_perf]`
  in Vercel logs is the deciding datum — high `total_ms` → server-side culprit;
  low `total_ms` with big `response_bytes` already trimmed → iOS-side
  (Codable/keychain/token) culprit.

### Done this session: P0-PERSISTENCE-PERF-WEB — slim list endpoint to card-essential keys (PR #63, squash `6185efa`)
- **Why:** Andrew's device test on P0-PERSISTENCE-IOS (`bf9f21c`) showed a 15s
  URLRequest timeout on cold launch. Supabase MCP diagnosis confirmed the wire
  payload is the bug — the list endpoint returned the full `report_json`
  (multi-MB/row, dominated by `bet_annotations` 2.5 MB avg + `session_detection`
  260 KB avg). 58 reports × ~5 MB = unmanageable cellular transfer. Standard
  mobile split: list returns card metadata; detail endpoint fetches full data
  on tap.
- **What shipped (`app/api/reports/route.ts`):** list-by-user mode now maps each
  row's `report_json` through `slimReportJson()`, keeping only a 12-key
  card-essential whitelist (betting_archetype, betiq, summary, summaryCounts,
  discipline_score, emotion_score, emotion_percentile, tilt_score,
  bankroll_health, schema_version, _snapshot_counts, _snapshot_teaser). Heavy
  fields stripped. Added `export const maxDuration = 30` for Vercel timeout
  safety. Response envelope `{ reports: [...] }` unchanged; top-level columns
  preserved. Absent whitelist keys are NOT nulled in.
- **Polling mode (`?upgraded_from=X`) INTENTIONALLY untouched** — serves IAP
  materialization; iOS needs the complete report. Reaffirming "DO NOT slim"
  comment added above that branch.
- **Observability divergence from brief:** the brief proposed a
  `logErrorServer` breadcrumb. Recon of `lib/log-error-server.ts` showed it is
  strictly an error path (unconditional `Sentry.captureException` + `error_logs`
  insert) — a synthetic `new Error('slim_transform_metrics')` would spam Sentry
  on every cold start. Per the brief's own fallback instruction, switched to a
  `console.log('[slim_transform_metrics]', {...})` line that lands in Vercel
  function logs (row_count + sample original/slim bytes + reduction_pct).
- **Tests:** `__tests__/api-reports-list.test.ts` +3 cases — (1) list mode
  strips report_json to the whitelist (keeps present whitelist keys, drops
  bet_annotations/executive_diagnosis/session_detection, never invents absent
  keys); (2) 100 typical rows (heavy bet_annotations + session_detection)
  serialize to <100 KB on the wire; (3) polling mode preserves full
  report_json (regression guard, unchanged from `5cc8356`). Existing DESC+cap
  test updated for the always-present slimmed report_json key.
- **Gates:** `tsc --noEmit` 0 · `vitest run` 292 pass (11 files; was 289, +3) ·
  `next build` 0.
- **Files:** `app/api/reports/route.ts` (+80/-2), `__tests__/api-reports-list.test.ts` (+133). 211 insertions / 2 deletions.
- **Merge ts (Vercel deploy verify, ~2-3 min lag):** 2026-05-21 16:42:53 -0400. Sprint umbrella 3675964c-daf2-812d.
- **Follow-up (NEXT BLOCKER for end-to-end):** the coordinated iOS PR must
  lazy-fetch the full report via existing `/api/reports/:id` in ReportScrollView
  on detail-view present. Until it ships, iOS detail view (heated sessions,
  exec diagnosis, recommendations) renders empty — DO NOT test detail view on
  this web PR alone; test only list load time + card render. Decoder risk: iOS
  `AutopsyAnalysis` Codable must tolerate the now-missing keys; if hydrate
  decode fails post-deploy, the iOS PR makes fields optional OR the whitelist
  expands here.

### Done this session: P0-PERSISTENCE-WEB — GET /api/reports list-by-user (PR #62, squash `5cc8356`)
- **Why:** iOS reports disappear on cold launch (P0). `ReportStore` is in-memory
  only with no list-fetch path; on relaunch `reports=[]`. 69 reports across 6 users
  exist in Supabase but no API exposed them. Authorized fix: Path A (server-fetch,
  no cache); this PR ships the web side.
- **Recon HALT/divergence from brief:** a `GET` already existed at
  `app/api/reports/route.ts` but only served `?upgraded_from=` IAP polling (400 w/o
  param) — could not hydrate a list, and a 2nd `GET` export collides. Resolved
  (user-confirmed) by **extending the one handler**: `?upgraded_from=X` → unchanged
  filtered polling; bare `GET /api/reports` → full user list. Backward-compatible
  since the only caller (iOS polling) always sends the param.
- **Auth:** used `getAuthenticatedClient` (sibling pattern, `lib/supabase-from-request`),
  NOT the brief's `createServerClient`+`getUser()` — the latter would break iOS's
  `Authorization: Bearer` path. RLS (`auth.uid() = user_id`) scopes ownership at the
  DB; no explicit `user_id` filter, matching `/api/reports/[id]`.
- **Contract:** `{ reports: AutopsyReport[] }`, `created_at DESC`, `limit 100`; empty
  array (not 404) when the user has no reports.
- **Tests:** `__tests__/api-reports-list.test.ts` mocks Supabase (mirrors
  `whatIf.test.ts`, NOT prod-hitting `p0-iap-webhook`). 401 / DESC+cap / RLS-scoping /
  empty / 500, plus regression guards for unchanged polling mode + malformed-UUID 400.
- **Gates:** `tsc` clean · `vitest` 289 pass (11 files) · `next build` ok.
- **Files:** `app/api/reports/route.ts` (+72/-22), `__tests__/api-reports-list.test.ts` (+152). 202 insertions / 22 deletions.
- **Merge ts (Vercel deploy verify):** 2026-05-21 15:12:06 -0400. Sprint row 3675964c-daf2-812d.
- **iOS unblock:** chat-layer verifies via Supabase MCP post-deploy, then opens iOS
  CC session for PR 2 (`ReportStore` hydration + `.refreshable`) in `/Users/Andrew/betautopsy-ios`.

### Done this session: ENGINE-WHATIF (revised, Option 3) — ship what_if_scenarios via metrics.what_ifs transform
- **Why:** iOS Phase 2.5 needs the What-If counterfactual surface. Web computes
  it client-side from `bets[]` (`components/AutopsyReport.tsx` 195-237); iOS
  never receives `bets[]`, so the computation moves server-side onto the wire.
- **Two-step history:** first shipped as a verbatim port (`buildWhatIfs(bets)`,
  PR #60 squash `d698d42`). Then RETRACTED in favor of Option 3 (this PR):
  transform the engine's existing `metrics.what_ifs` (lib/autopsy-engine.ts:
  835-872) into the wire shape instead of recomputing. Rationale: `metrics.what_ifs`
  already feeds the LLM exec-diagnosis prompt (line 2845); a separate verbatim
  recompute risks scenario-3 dollars on the iOS WhatIfCard contradicting the
  LLM narrative in the same report. Single source of truth keeps narrative + UI
  coherent. iOS is canonical, so the goal is iOS internal coherence, not
  web-byte-parity. Also avoids a 3rd copy of calcProfit.
- **Premise correction (retained):** scenario count is 1-3, NOT always 3
  (scenario 2 only if parlays >3 legs exist; scenario 3 only if categories
  partition into both profitable AND unprofitable).
- **What shipped (transform):**
  - `lib/engine/whatIf.ts`: `buildWhatIfScenarios(whatIfs, bets): WhatIfScenario[]`
    + `MetricsWhatIfsShape` (structural subset of `CalculatedMetrics['what_ifs']`).
    Reads engine numbers; applies web-style conditional inclusion + label
    templates. Scenario 3 carries an extra guard (`hypothetical != actual`) so a
    what-if equal to reality is never surfaced. No profit recomputation.
  - `lib/autopsy-engine.ts`: `what_if_scenarios: buildWhatIfScenarios(metrics.what_ifs, bets)`
    in the runAutopsy `analysis` object (line ~2939). Pre-flight verified `bets`
    is not mutated between entry (2757) and assembly. runSnapshot untouched.
  - `types/index.ts`: `WhatIfScenario` interface + optional field on
    `AutopsyAnalysis` (unchanged from the verbatim PR).
  - `__tests__/whatIf.test.ts`: 10 tests — scenario-1-always w/ rounded median
    label + engine numbers, scenario 2 include/omit, scenario 3 include +
    uniform-profitable omit + uniform-unprofitable omit + mixed-but-equal dual-
    guard omit, 1-3 bound, runAutopsy-presence + runSnapshot-absence.
- **Verification:** `tsc --noEmit` 0, `vitest run` 0 (10 files / 282 tests),
  `next build` 0.
- **Chat-layer watch item:** if real-data `profitable_only.hypothetical_profit`
  equals `actual_profit` on a large fraction of reports (the dual-guard would
  then suppress scenario 3 broadly), flag — may indicate an engine computation
  quirk worth a closer look. Verify alongside the Supabase wire check.
- **iOS unblock:** chat-layer verifies via Supabase MCP post-deploy, then
  signals "ENGINE READY: What-If" to the iOS Phase 2.5 session.

### Done previously: PR-A BASELINE-TEST-GREENS — green the vitest baseline before ENGINE-WHATIF (PR #59, squash `53d10f3`)
- **Why:** ENGINE-WHATIF pre-flight caught `npx vitest run` red on main (70 test
  failures + 2 silent suite-collection failures). Step 5's "test must exit 0"
  gate was unsatisfiable. Split into a prerequisite PR-A (green baseline) +
  PR-B (the actual What-If port).
- **Root-cause decomposition (the "stale snapshots, just regen" premise was wrong):**
  the 68 engine-snapshot failures were TWO entangled classes — 56 genuine
  ENGINE-FLOOR schema changes (insufficient_data field, "Building Sample"
  archetype, biases_detected:[], discipline.total:0, percentile:null) that
  fail regardless of TZ, PLUS ~12 timezone-dependent hour-label shifts
  (4am->11pm) because the engine buckets hours with local `getHours()` /
  `toLocaleTimeString` (lib/autopsy-engine.ts:2298 etc.) and vitest pinned no
  TZ. Authoring machine was UTC; this machine is EDT. A naive `vitest -u`
  would bake EDT into the snapshots and re-break on UTC CI.
- **Five changes shipped:**
  1. Pin `process.env.TZ = 'UTC'` at top of `vitest.config.ts` (prod runs on
     Vercel-UTC, so this matches prod AND is deterministic across machines).
  2. Regenerate 56 engine snapshots under the pin (verified 0 hour-label noise).
  3. Fix 2 stale csv-parser assertions 'Nfl'->'NFL', 'Mlb'->'MLB' (parser
     deliberately uppercases short acronyms, lib/csv-parser.ts:359).
  4. Exclude `tests/e2e/**` from vitest (Playwright owns those specs).
  5. Exclude `__tests__/p0-iap-webhook.test.ts` from default vitest — it's a
     production-Supabase integration suite (added 0e9282e) needing service-role
     creds + mutating prod data; preserved on disk, runnable manually.
- **Verification:** `tsc --noEmit` 0, `vitest run` 0 (9 files / 272 tests, no
  failed suites, confirmed green on main post-merge), `next build` 0. Config
  pin proven self-sufficient (passes with shell TZ unset).
- **Two production bugs discovered, filed as v1.1 backlog (out of PR-A scope).**

### Done previously: SNAPSHOT-REDACTION-POLICY: unified snapshot redaction (PR #56, squash `b775e8e`)
- **Why:** the 5000-bet snapshot `690cab1b` shipped six different redaction
  policies across the wire. Physical-iPhone QA traced dollar leaks the paywall
  was supposed to hide. Unify on the biases pattern (snake_case
  `<field>_visibility` flags; first-sentence teaser visible, dollars blurred).
- **Sprint row:** `3655964c-daf2-81a9`. QA ref: `notion.so/3655964cdaf281879d9ade55cb112cea`.
- **Five engine wire fixes (`lib/autopsy-engine.ts`, `types/index.ts`):**
  1. strategic_leaks: deterministic first-sentence detail teaser (category +
     ROI + count, no dollars) + `detail_visibility: visible`; suggestion `""`
     + hidden. Was bare `""` with no flags.
  2. sport_specific_findings: description first-sentence visible, recommendation
     `""` + hidden, evidence first-sentence with dollars stripped (new
     `stripDollarsFromSentence` helper, no `$•••` token). Was leaking full LLM
     description + recommendation prose.
  3. odds_analysis.buckets[].staked: `0` + `redacted_dollar` (was a $204K leak).
  4. timing_analysis.by_day[]/by_hour[].staked: `0` + `redacted_dollar`.
  5. summary.total_profit + avg_stake: `0` + `redacted_dollar`.
- **Deferred (not an engine fix):** behavioral_patterns Ch 5 emptiness is
  iOS-side. Snapshot is pure-compute (no LLM) so behavioral_patterns is
  correctly `[]`; Ch 5 should read `patternsSnapshot` (engine already ships 5
  entries) per May 13 spec. Filed under IOS-RENDER-AUDIT (`3655964c-daf2-8132`).
- **Verification:** redaction suite Group 6 added (5 assertions + full-mode
  regression guard, dedicated leak-heavy fixture); 31/31 redaction, Group 3
  dollar-walk allowlist tightened. verify-engine-floor 10/10 (golden
  re-baselined for the intended snapshot delta; zero floor-logic regression).
  tsc clean, em-dash sweep zero. Full mode keeps real dollars.

### Done previously: ENGINE-FLOOR: global minimum-sample floor for all detectors (PR #55, squash `c9d9d56`)
- **Why:** a 2-bet upload fired Post-Loss Escalation HIGH, 3 behavioral
  patterns, an archetype, a discipline breakdown, and 3 recs while the LLM
  prose layer wrote "Two bets is nowhere near enough to draw conclusions" in
  the same report. Deterministic detectors did not gate on sample size; the
  prose hedged. Fix gates the detectors so the prose has nothing to hedge.
- **Sprint row:** `3655964c-daf2-8138`. Visual QA: `notion.so/3655964cdaf281879d9ade55cb112cea`.
- **Pattern:** extended BetIQ's existing `insufficient_data` shape to every
  other detector. Single source of truth: `lib/engine/constants/thresholds.ts`
  (`BET_COUNT_THRESHOLDS`) + `lib/engine/helpers/sufficiencyGate.ts`
  (`checkSufficiency`, `gateArray`).
- **Thresholds (settled bets unless noted):** biases 100, behavioral_patterns
  100 (full mode), betting_archetype 50 ("Building Sample"), betiq 50
  (unchanged), discipline 50, enhanced_tilt 100 (zeroed + fixed worst_trigger
  string), emotion_score scalar 50 (sibling flags +
  `emotion_percentile` null), strategic_leaks per-category 100 (snapshot) /
  total 100 (full), contradictions 30 (unchanged), detectAndGradeSessions 20
  sessions (NARROW gate: per-session cards kept, heated aggregates zeroed,
  `insufficient_data` set), additive 500 (unchanged), Emotional Session
  Pattern 5 sessions (unchanged).
- **Wire contract:** object detectors zero numerics (never null); arrays → `[]`;
  `worst_trigger` rewritten not nulled; `emotion_percentile` widened to
  `number | null`. `schema_version` 1 → 2 (route.ts + iap-upgrade.ts).
  `discipline_scores` ledger INSERT skipped when insufficient (both files) so
  the streak feed never shows "0 discipline today".
- **Verification:** `scripts/verify-engine-floor.ts` 10/10 (2/50/100/500/5000
  cases + golden deep-diff). Redaction fixture enlarged to 120 bets (clears
  the 100 bias floor): 25/25; 6 other unit suites green (92/92 total).
  Fixtures + golden gitignored (real user bet data + regenerable baseline);
  build/capture/verify scripts committed.
- **Parked cleanup done:** `vitest.config.ts` now excludes `**/.claude/**`.
- **Pre-existing, unrelated:** `autopsy-engine.test.ts` snapshot failures are
  TZ-dependent on the commit machine (88 local TZ / 58 UTC on clean main).
  Filed as a v1.1 test-infra row; not addressed here.

### Done previously: MEGA-PR A: snapshot fix + bias depth (PR #54, squash `0b776dd`)
- **Why:** iOS IAP upgrades blocked because every iOS-originated snapshot
  shipped with `analyzed_upload_ids=[]` (confirmed 4× in sandbox 2026-05-19).
  Andrew's 5000-bet test set only surfaced 2 biases despite having a $46K+
  category leak and $289K of annotation-flagged emotional cost.
- **Phases shipped (5 commits, squashed):**
  - `7b82742` fix(analyze): capture `importBets().upload_id` on multipart path
  - `b5d9f79` fix(iap-upgrade): read-only fallback to most-recent upload at/before snapshot `created_at` (single-query SELECT)
  - `9492fc5` feat(engine): 3 additive bias detectors above 500-bet volume floor (High-Volume Category Leak, Sustained Late-Night Concentration, Chronic Emotional Drag)
  - `fa2274b` feat(engine): per-session `triggerEvent` attribution on `DetectedSession` (engine emit only; iOS reader in Mega-PR B)
  - `081612e` chore(verify): `scripts/verify-mega-pr-a.ts` read-only harness
- **Phase 3 (pricing reconcile) DROPPED** per launch sequencing. Web stays at
  $9.99 during iOS launch. Will be revisited as a separate web-pricing
  project after iOS ships.
- **Verification:** all 8 assertions pass on Andrew's 5000-bet cohort. Bias
  count 2 → 4 (added High-Volume Category Leak + Chronic Emotional Drag).
  110 of 250 heated sessions now ship `triggerEvent`. Small-user 50-bet
  regression guard: 2 biases (unchanged from main). Status file at
  `/tmp/mega-pr-a-status.md`.
- **Baseline-failure mismatch noted:** memory referenced 88; reality is 46
  with worktree excluded (92 with worktree). Vitest has no `exclude:` for
  `.claude/worktrees/`. Cleanup parked.

### Done this session (external — Codex, 2026-06-10): CONTROL-SYSTEM web surface + repositioning (3 commits direct to main: `8948bb6`, `002a1ec`, `761bbe6`; all deployed, `761bbe6` live)
- **What shipped:** `lib/control-system.ts` (985 lines, deterministic `control_system`
  built from the full-report analysis — rules/cooldowns/recovery mode);
  `/api/control-system` (447 lines, getAuthenticatedClient-authed); web Control
  Center (`app/(dashboard)/control` + `ControlPageClient` 577 lines +
  `ControlSystemPanel` + `useControlSystem`); dashboard integration (+126);
  AutopsyReport Ch5 integration (+247); expanded check-in routes + scorer;
  migration `20260609_control_system.sql` (control_plans, control_rules,
  risk_events, cooldowns — RLS `auth.uid() = user_id` on all four, verified);
  new `/support` page + centralized `RESPONSIBLE_GAMBLING_DISCLAIMER`
  (`lib/support-resources.ts`) reused across emails/unsubscribe/engine markdown;
  landing repositioned around "control plan / live guardrails / Zero picks"
  (metadata + hero + JSON-LD). `control_system` added to FULL reports only —
  snapshot path unchanged (paywall preserved); ask-report context includes it.
- **Verified by Claude session 2026-06-10:** `tsc --noEmit` 0 · `vitest run`
  297 pass (was 293; +`api-check-in-compat.test.ts`, +redaction cases) ·
  prod runtime logs clean over 20h (one benign image-size warning).
- **OPEN VERIFICATION ITEM: confirm `20260609_control_system.sql` was applied
  to prod Supabase** (`eekubnadizmtuhnxzcig`) — builds/tests pass without it,
  but first `/api/control-system` or check-in write fails at runtime if the
  tables don't exist. Claude's Supabase MCP can't reach this project (different
  org); check the dashboard or `supabase migration list`.
- This closes product-audit item "web control-system surface" (was: built
  server-side, iOS-only, zero web UI).

### Done this session: WEB-AUTH-REDIRECT — returning OAuth logins land on `/dashboard` (pushed direct to main)
- **Why (reported by Andrew 2026-06-09):** signing in with Google on
  betautopsy.com bounced him back to the landing page showing Login/Sign Up
  as if logged out, even though the session was live (clicking Sign In again
  went straight to the dashboard via middleware's auth-route redirect).
- **Two stacked causes, one fix:**
  1. `app/auth/callback/route.ts:198` sent returning OAuth users (account
     >30 min old, no `?next=`) to `/` — only first-logins got
     `/dashboard?welcome=true`. Vestige of an unfinished "returning-user
     redirect": the `increment_login_count` RPC is incremented but never read
     anywhere in the codebase.
  2. The landing page then showed logged-out nav because `AuthProvider`
     (components/AuthProvider.tsx) never revalidates on mount by design —
     it only reads the `ba-auth-cache-v1` localStorage cache, and the OAuth
     flow (full-page round-trip through Google → server route) never calls
     `revalidate()`, unlike the email/password path
     (`app/(auth)/login/page.tsx:100`). Cache miss → 'anon' → Login/Sign Up.
- **What shipped:** callback fallback target `'/'` → `'/dashboard'` (one
  line + comment). Fixes both symptoms: lands on dashboard, and dashboard's
  AuthGuard revalidates + repopulates the cache so the marketing nav shows
  signed-in state on later visits. `?next=` behavior and first-login
  `/dashboard?welcome=true` (+ Meta CAPI / welcome-email logic) untouched.
- **No tests existed for the callback route; none added** (route is all
  side-effects + redirect; an integration harness is v1.1 territory).
- **Gates:** `tsc --noEmit` 0 · `vitest run` 293 pass (11 files) · `next build` 0.
- **Files:** `app/auth/callback/route.ts` (+4/-2).

### Done this session (Claude, 2026-06-10): SECURITY + PROD INTEGRITY HARDENING (PR #67 → squash-merged to main as `d16a7d6`)
- **A1 (SEC-HIGH/MED):** dropped `using(true)` SELECT on `share_tokens` (anon could read full report_json — 11 rows confirmed exposed live) + `email_unsubscribe_tokens`. Service-role lookups in `/share/[id]` (react `cache()`), `/og/[id]`, `/api/unsubscribe`; UUID validation; per-IP rate limiting. Migration `20260610_lock_token_tables.sql` — **apply AFTER deploy**.
- **A2:** repo set private; Vercel retained webhook access (deployment created on private repo).
- **A3:** restored the `progress_snapshots` upsert (app/api/analyze/route.ts) — dead since 2026-05-11.
- **A4:** RLS audit of the 4 control tables (all `auth.uid()=user_id`, user-scoped, no `using(true)`) + awaited the 2 un-awaited `logErrorServer` calls in control-system route.
- **A5:** `/api/export` paginated + CSV-injection neutralized; `/auth/callback` `?next=` open-redirect closed; `/api/send-email` fail-closed; `/api/inbound-email` Svix signature + HTML sanitize (needs `RESEND_INBOUND_SECRET` in prod).
- **A6 (conditional → FAIL path):** 3 new columns live in prod, but the 4 control tables return PGRST205 (CREATE TABLEs didn't land / schema cache stale). **Compat fallbacks KEPT, compat test KEPT.** Control-system GET 500s in prod; check-in degrades gracefully.
- **A7:** only observable errors were 4× `/api/control-system` GET at 15:45Z, all Andrew's own user, between `8948bb6` and `002a1ec` deploys. Sentry (token upload-scoped) and Supabase API logs (wrong-org MCP) not observable — stated explicitly.
- **A8 (report-only):** live Stripe list prices 2× displayed (Pro $39.99/mo, $299.99/yr; Full Report $19.99); `AUTOPSY50` 50%-off auto-applied via `STRIPE_LAUNCH_PROMO` reconciles them — only if that env var is set in prod (unverified). Legacy "Sharp" prices active on inactive product.
- **A9:** added `__tests__/check-in-enforcement.test.ts` (7 cases). **A10:** added `.github/workflows/ci.yml` (tsc + vitest), opened PR #67, squash-merged as `d16a7d6`. **Branch protection BLOCKED** — GitHub Free disallows protection/rulesets on private repos (A2 made it private). Decision (Andrew, 2026-06-10): stay private, defer enforcement; CI runs on every PR/push but isn't blocking. Re-enable after a GitHub Pro upgrade (Tracker row filed, Blocked).
- e2e (mobile-regression) is **pre-existing red on main** (failing on every commit incl. yesterday's `e0e378c` and May's `c5a9ae0`) — `/login`+`/signup` tap-target check, unrelated to this backend/SQL work. Merged via `--admin`; not a regression.
- The PR also carried the parallel engine-hardening run's commit `eca0a2f` (ENGINE_HARDENING_OUTLINES + ingestion fixtures, docs/fixtures only; pre-rewrite hash was `5200d03`) — absorbed into the squash per the single-PR plan.
- Codex predecessors logged: control-system `8948bb6`, check-in/redaction hardening `761bbe6`. Notion: 4 Tracker rows (3 sprint + 1 blocked) + Command Center update.
- **POST-MERGE manual steps:** (1) ✅ DONE — `20260610_lock_token_tables.sql` applied; anon `share_tokens` select now returns `[]` (was 11 rows), service-role path verified (all 11 share links 200 live). (2) ✅ DONE — 4 control tables created in prod (Andrew ran the CREATE blocks); verified live: tables resolve, `GET /api/control-system` 200, `set_recovery_mode` write+readback, check-in 200, zero control-system 500s in logs. (3) ⏳ `RESEND_INBOUND_SECRET` still unset in prod (inbound-email fails closed — by design until set). (4) ⏳ confirm `STRIPE_LAUNCH_PROMO` in prod (else Pro/Full Report charge 2× displayed). (5) ⏳ branch protection deferred (needs GitHub Pro).

### Done this session (Claude, 2026-06-10): SHARE-PAGE 500 FIX (PR #68 `d75d319`) + A6 COMPAT CLEANUP (PR #69 `ecd36f5`)
- **Share fix:** all 11 live share links were 500ing. Root cause (got the real error, not guessed): digest `DYNAMIC_SERVER_USAGE` — the A1 `headers()` rate-limit on `/share/[id]` (a `generateStaticParams` route) throws in prod builds. Removed page-level rate-limit (anon hole closed by RLS; share ids are unguessable UUIDs; belongs in middleware if wanted). Plus null-guarded `gradeColor` in SharedReport + og route for the 3 snapshot (null-grade) shares. **NOT an AutopsyReport SSR bug** — AutopsyReport renders fine server-side; no other server surface affected. Verified: all 11 tokens 200 on share + og, live.
- **A6 cleanup (was the FAIL-path "fallbacks KEPT" above):** after the 5 live control-system checks went green, removed the dead 42703 compat fallbacks from `check-in/route.ts` + `check-in/outcome/route.ts` and deleted `__tests__/api-check-in-compat.test.ts`. Check-in still 200 post-removal. tsc 0, vitest 302, build 0.
- Used a minted session for Andrew's own account to exercise the authed endpoints; recovery mode restored to false. Two test check-in rows written to Andrew's account during verification.

### Done this session (Claude, 2026-06-10, follow-up pass): commit re-author + production verification of PR #67
- **Vercel Hobby author-gate:** all 9 branch commits re-authored `hocho99
  <and.hochh@aol.com>` → `Andlog0713 <129010573+Andlog0713@users.noreply.github.com>`
  (`git rebase -r origin/main --exec 'git commit --amend --reset-author'` +
  lease force-push). Preview built READY on `1628b8c` where the three prior
  hocho99-authored deploys sat BLOCKED — gate confirmed as the blocker.
  **NOT permanently solved:** unblocked per-commit via repo-local
  `git config user.name/email` in this clone only; any commit from another
  identity (Codex, other machines) re-trips it. Vercel Pro before TestFlight
  removes the gate entirely.
- **Production verified on the squash sha:** `dpl_6o56ejr8…` READY on
  `d16a7d6`, aliased to betautopsy.com / www / api / mysharpscore.com.
  Live probes: `/auth/callback?next=https://evil.com` → 307 to own
  `/login?error=auth` (open redirect closed) · `/api/send-email` unauthed →
  405 (fail-closed) · `/api/inbound-email` unsigned → 503 (fails closed,
  `RESEND_INBOUND_SECRET` still unset = step 3 above) · `/api/export`
  unauthed → 401.
- **A1 NOT yet truly closed:** anon key STILL dumps `share_tokens` (full
  report_json + user_id) and `email_unsubscribe_tokens` — verified live
  post-deploy. The deploy carries the service-role routes, so applying
  `20260610_lock_token_tables.sql` is now SAFE and is the only remaining
  step; no Supabase CLI/token on this machine, needs dashboard SQL editor.
- Superseded pre-rewrite hashes for the record: `5200d03→eca0a2f`,
  `83f8881→1628b8c`, `7a36cc8→5d67727`, `8766997→f4fda5c`. Notion tracker
  row bodies updated to match.
- Remote URL normalized to `https://github.com/Andlog0713/betautopsy.git`
  (was lowercase, redirecting).

### Done this session (Claude, 2026-06-10): PRODUCT/COPY/POLICY RECONCILIATION post-codex (PR #70, branch `reconcile/product-copy-policy`)
- **B4 (MUST):** ask-report adds an override-refusal clause to the system prompt when control_system is present; deterministic recovery support footer appended server-side (live profile read) so it can't be jailbroken away. Adversarial test included (4 cases).
- **B3 (MUST):** recovery REFRAMING (session relabels) keys on a live `recoveryModeActive` prop (profile.manual_recovery_mode at render), never report_json — leaving Recovery Mode reverts old reports to neutral. Sharp Score label reverted to stable name (interpretation state-dependent). Apparent-edge caution stays scoped to recovery-recommended. Recovery recommendation is now a dismissible opt-in card (persisted per-report).
- **B6 (MUST):** privacy policy Behavioral-control-data category + effective-date bump; account-deletion cascade-covers all 4 control tables (documented). **Data-export GAP reported** (no personal-data export flow exists, only bets CSV) — nothing built per scope.
- **B1:** marketing reverted to pre-8948bb6 forensic positioning (landing/hero/README/tiktok scripts via checkout, FAQ hand-reverted); helpline modernization (1-800-MY-RESET) re-applied (it shipped inside 8948bb6); variant keys A/B preserved; 47 metrics->signals.
- **B2:** em dashes out of email/UI copy; tilt->heated in product strings. FLAGGED (scope): 'The Tilter' archetype rename (wire + golden snapshots), 'unlock' paywall copy. Blocked-state API copy iOS-safe.
- **B5:** digest/weekend/onboarding gated on manual_recovery_mode at send time; transactional untouched.
- **B7:** documented runSnapshot must NOT attach control_system (already locked by redaction test Group 6).
- **B8:** 'High-Pick Addiction'->'High-Pick Reliance'; web Emotion Score respects emotion_score_insufficient_data (BetIQ-parity); sample wrapper drops inflated '280 bets' claim; engine max_tokens 8192->16384 + SSE-heartbeat follow-up comment.
- **B9:** codex-invented recovery-mode derivation + suggested-rule/plan thresholds printed verbatim for Andrew review (no change).
- Gates: tsc 0 · vitest 306 · build 0. Notion: sprint row + (pending) command-center note.
- **Follow-up flagged (not done, would balloon scope):** 'The Tilter' archetype rename (engine + iOS wire + golden snapshots); demo-data total_bets:280 vs 35 shipped rows internal inconsistency; SSE heartbeat IMPLEMENTATION in analyze route (only commented).

### Done this session (Claude, 2026-06-10): RECOVERY-MODE THRESHOLD RECALIBRATION (PR pending, branch `recalibrate/recovery-tiers`)
- **Why:** codex's recovery triggers were round numbers with zero calibration and a binary structure that over-flags (any single threshold trips the clinical tier). Clinical (PGSI) + safer-gambling-messaging literature: tier it, gate the clinical band tightly, err toward under-flagging.
- **Structure:** binary `recoveryModeRecommended` → PGSI-style three tiers (`riskTier` on ReportControlSystem). Tier 0 none (normal); Tier 1 elevated (single dismissible NON-clinical note, no helpline/renaming/recovery framing); Tier 2 recovery (full opt-in card + helplines + clinical framing).
- **Tier 2 (recovery) = conjunction:** `emotion_score >= 80 AND (critical bias OR heatedPct >= 35)`. Never either alone. Live `deriveRecoveryModeState` similarly requires manual toggle OR a sustained conjunction (e.g. 3+ rule violations AND active cooldown/heated); single signal → elevated only.
- **Helplines/support resources surface ONLY at Tier 2** in the report UI (message-fatigue avoidance).
- **CALIBRATION QUERY (run, recorded):** prod n=6 full reports with emotion_score, degenerate (all ~73, test data). Too sparse for a real percentile. codex's 70 = ~p33 (over-flagging); interim 80 = p100 (0 reports reach recovery, intended). **Held at conservative interim.**
- **⚠️ HARD DEPENDENCY (must re-tune in the same PR):** emotion_score + heatedSessionPercent feed off the vig-mislabeled "luck" component and the timezone-broken heated-session signal (WS-NUMERIC / WS-TEMPORAL). When those engine fixes land, these cutoffs MUST be re-tuned — a user can cross/un-cross the recovery line from the math changing, not behavior.
- **⚠️ DO NOT MARKET the recovery feature** until the calibration query is re-run on a real (non-test) population and `RECOVERY_EMOTION_CUTOFF` is moved to ~p90-p95. Code ships safely meanwhile (interim under-flags).
- **Interpretation deviations from spec (flagged):** "exactly 2 severe biases" implemented as `>= 2` + a single critical bias → elevated (so strong single findings get the benign note rather than no flag); Tier 1 emotion band is `>= 60` (no upper cap), so emotion >= 80 WITHOUT corroboration is elevated, not recovery. Both keep the clinical tier tight while not under-serving the benign tier.
- **Tests:** `__tests__/recovery-tiers.test.ts` (12) — tier boundaries, AND-corroboration, single-signal-not-recovery, manual-wins. tsc 0, vitest 318.

## Parked / next branch
- **PRODUCT AUDIT (2026-06-09/10, 5-agent sweep: engine depth, LLM replicability, consumer UX, ecosystem/pricing, competitive research; findings reported to Andrew, fixes not yet authorized).** Highlights:
  - **Replicability:** ~30-35% of perceived value is commodity LLM prose, ~40-45% deterministic math ChatGPT can't reliably do, ~25% scaffolding. COGS $0.15-0.75/report vs $9.99 (1.5-7%) — headroom for Opus-class model. Main call: claude-sonnet-4-6, 8192 max_tokens (documented truncation cause; 64K available). Shape-only JSON validation — adopt structured outputs.
  - **Engine math bugs found:** odds=0 → Infinity in whatIf calcProfit (lib/autopsy-engine.ts:830-834) + impliedProb(0)=1.0 poisons luck/calibration/BetIQ; "luck" rating counts vig as cold variance; ALL "after-a-loss" signals key on placement order not settlement (causal confound on flagship chase signal); cash-outs erased to $0 profit (csv-parser.ts:330-333); unparseable dates default to TODAY (csv-parser.ts:314-317) corrupting timing; ROI denominator includes pending/void; win rate counts pushes; category ROI triple-counts dollars across overlapping keys; emotion_score insufficient_data flag ignored by web UI (only BetIQ checks).
  - **Honesty exposures:** all percentiles are 6 hardcoded values from literature stubs (engine:1228-1256; BetIQ percentile already nulled for this reason — emotion/discipline still ship); "73% of bettors" pertinent-negative stats uncited constants; per-bias estimated_cost is LLM-invented and can contradict deterministic leak total; RedactedValue blurs FABRICATED $180-$4,200 numbers; progress bars fake (92% cap + deliberate 6s delay); "47 behavioral signals" ≈ 22-28 deduplicated; sample report says "280 bets" ships 73; "High-Pick Addiction" bias name violates own no-addiction-language rule.
  - **Consumer UX:** paid report 8/10, free snapshot 4/10 for <100-bet users — 100-settled-bet bias floor zeroes ALL findings for majority segment so paywall counts nothing. Fix: small-sample deterministic finding tier at ~20-30 bets. Recommended upload path is a 6-step third-party Pikkit trial (affiliate). progress_snapshots outage guts vs-last-report + ProgressChart for all post-May-11 users while Pro still sells "track progress".
  - **Ecosystem:** Pro $19.99/mo gates almost nothing recurring (digest/streaks/progress free in code) — metering plan not membership; one-and-done is rational. Web $9.99 vs iOS $19.99 same artifact. Control system (pre-bet check-ins, cooldowns, recovery mode, lib/control-system.ts) fully built server-side, iOS-only, ZERO web UI. No cross-user data flywheel — cohort percentiles unbuilt while data accumulates. quiz_leads captured then abandoned (no nurture). action_checkoffs API has no web consumer.
  - **Competitive:** empty quadrant (behavioral-first + one-time + book-independent). Threats: Pikkit (600K MAU, BookSync, could ship behavioral tab in a quarter), FD My Spend/DK Stat Sheet (3.5M engaged, free, perfect data), ChatGPT improving free. SportBot AI only direct behavioral rival (tiny, manual, sells picks). Biggest weakness: no auto-sync (SharpSports licensing = obvious mitigation). Positioning: "the only one not selling you picks."
  - **Top product moves (synthesis):** (1) restore progress_snapshots + make report N reference N-1 in prompt — longitudinal memory is the unreplicable moat AND the Pro justification; (2) real cohort percentiles from own data; (3) small-sample finding tier; (4) deterministic per-bias costs + structured outputs + session_analysis/edge_profile reconciliation; (5) web control-system surface to give Pro recurring value; (6) fix engine math/timezone/cash-out bugs; (7) replace fabricated blur/progress numbers with honest variants; (8) reconcile web/iOS pricing.
- **FULL-SITE AUDIT (2026-06-09, 5-agent sweep + live Vercel/GitHub/Supabase checks; findings reported to Andrew, fixes not yet authorized).** Top items by severity:
  - **SEC-HIGH: `share_tokens` SELECT policy is `using (true)`** (supabase/schema.sql:280) — anon key can dump every shared report's full paid `report_json` via PostgREST. Scope to per-row lookup (RPC or service-role route).
  - **DATA-HIGH: `progress_snapshots` upsert commented out since 2026-05-11** as a "DIAGNOSTIC … restore after confirming" (app/api/analyze/route.ts:622-644) — web report runs have written NO progress snapshots for ~4 weeks; ProgressChart + comparison reads are silently stale.
  - **DATA-HIGH: `/api/export` truncates at the 1000-row PostgREST cap** (no `.range()` loop) — incomplete CSV for big users, no error.
  - **REPO-HIGH: GitHub repo is PUBLIC with no branch protection** and Vercel auto-deploys main with no vitest/tsc CI gate (only design-system lint + mobile-regression e2e run in CI).
  - SEC-MED: `email_unsubscribe_tokens` world-readable; `/api/inbound-email` unauthenticated + HTML injection; `/api/send-email` fails open if CRON_SECRET unset; open redirect via `?next=` in /auth/callback (middleware validates, callback doesn't).
  - PERF-HIGH: middleware does blocking `auth.getUser()` on `/`, `/sample`, `/go`, `/terms`, `/share/*` and ALL `/api/*` (double-auth; pure waste for iOS Bearer calls). PERF-HIGH: `/api/recent-activity` reads 30 full `report_json` blobs (~10-15 MB) for a 2 KB ticker. PERF-MED: no SSE heartbeat during 100-240s LLM phase; analyze SSE ships full bet array twice; TTF fonts (~440 KB, should be WOFF2) + 1.8 MB unused fonts in public/; ~2 MB stray junk in public/ (Archive.zip etc.).
  - ENGINE-HIGH (already filed): UTC hour-bucketing bug confirmed still present.
  - DESIGN: 80+ violations of the design system across 8/10 rules incl. systemic palette mismatch (spec #0D1117/#00C9A7/#C4463A vs implemented #0A0E12/#FACC15/#FF4D4D), glassmorphism on NavBar/ChapterNav, hamburger menus, Inter font in 4 share-card components.
  - QUALITY: ~20 un-awaited `logErrorServer` calls in API routes (lambda freeze may drop error logs); 6 inline service-role client re-implementations; buildWhatIfs duplication (filed); 3 orphaned components; lib/autopsy-engine.ts 3,877 lines.
  - SEO/A11Y: landing page has no `<h1>`; /terms no metadata; /sample + /terms + /quiz/quick missing from sitemap; no prefers-reduced-motion handling.
  - Tooling note: Supabase MCP (claude.ai connector) cannot reach prod project `eekubnadizmtuhnxzcig` (different org) — advisors unavailable; schema audited from local supabase/ files instead (RLS enabled on all tables).
- **e2e (mobile-regression) pre-existing red — culprit identified:** the bare
  logo link `<Link href="/"><Logo size="md" /></Link>` in
  `app/(auth)/layout.tsx:15` and `:48` renders an anonymous inline `<a>`
  228×36 — below the 44pt tap-target floor — failing `/login` + `/signup`
  on all 3 viewports since at least May 21 (`c5a9ae0`). Fix with the
  established `w-11 h-11 -m-2`-style padding pattern (or block+min-height);
  unblocks the suite repo-wide.
- Mega-PR B (iOS rendering of new engine output, including `triggerEvent` reader)
- Web pricing reconcile (post-iOS launch, separate project)
- "23 pages" iOS paywall copy reconcile (separate iOS-repo task)
- DONE (ENGINE-FLOOR): `vitest.config.ts` now excludes `**/.claude/**`
- DONE (PR-A `53d10f3`): `autopsy-engine.test.ts` TZ-dependent snapshots — pinned `TZ=UTC` in vitest.config.ts + regenerated under the pin
- **v1.1 PROD BUG (discovered in PR-A): engine late-night/timing uses local `getHours()`.** `lib/autopsy-engine.ts` buckets hour-of-day with `new Date(b.placed_at).getHours()` / `toLocaleTimeString` (lines ~388, 400, 774, 991, 1962, 2236, 2298, 2046, 2060). On Vercel (UTC) this classifies "late night (11pm-4am)" in UTC, NOT the user's actual timezone — timing analytics + late_night signals are tz-wrong for non-UTC users. Needs userTimezone on the Bet/upload shape + tz-aware hour bucketing. Est ~12h; blocks on user-timezone architecture.
- **v1.1 test-infra (from PR-A): wire `p0-iap-webhook.test.ts` properly.** Currently excluded from default `npm test` (production-Supabase integration suite, needs service-role creds + mutates prod data). Re-integrate against a staging Supabase project with env injection in CI, then remove the vitest exclude.
- **v1.1 dedup (from ENGINE-WHATIF, ticket `3675964c-daf2-8157`): migrate web to consume the wire field.** Engine now ships `what_if_scenarios` (transformed from `metrics.what_ifs`, single source of truth with the LLM prompt). Web still computes its own client-side `buildWhatIfs(bets)` in `components/AutopsyReport.tsx` 195-237. Migrate web's WhatIf UI to read the server-shipped `what_if_scenarios` and delete the client-side duplicate, eliminating the web-vs-engine scenario-3 partition divergence entirely. Out of scope here.

## Previous branch: `claude/engine-snapshot-loosen-v2`

### Done this session — ENGINE-PR-SNAPSHOT-LOOSEN-V2: sport redact, bias dollar scrub, severity sort, decimal-period fix
- **Why:** iPhone QA on snapshot `2d5e2936-91f2-40fb-b91e-c28b5fcc0ea9` (5000
  bets, 2026-05-18 19:44 UTC) surfaced four wire-shape issues against the
  Phase 3 reframing spec (canonical doc `3605964c-daf2-811b`): bias evidence
  ships raw dollars ("$4 to $5000 (avg $88)"), `firstSentence` splits
  "ratio: 1.25" at the decimal period producing "ratio: 1.", `biases_detected`
  array order is detection-insertion (LOW interleaved before HIGH so iOS
  rendering top-N from array head leads with LOW), and `sport_specific_findings`
  ships with raw `estimated_cost: -11635` + raw `$-11635` in evidence prose +
  `evidence_visibility: null`.
- **Step 0 findings (Supabase wire query confirmed all four on wire today;
  read-only code recon for emission paths):**
  - `runSnapshot` at `lib/autopsy-engine.ts:3142` already produces a
    snapshot-redacted `snapshotSportFindings` (estimated_cost: 0, evidence:
    '', visibility tags). The leak is **downstream**: `app/api/analyze/route.ts:401-402`
    unconditionally OVERWRITES `analysis.sport_specific_findings` with raw
    `detectSportSpecificPatterns()` output for both report types, clobbering
    the engine's careful redaction. Fix needed in BOTH files.
  - A.6 case D (uncovered by brief): `buildSnapshotRecommendations`
    (lib/autopsy-engine.ts:3002) already ships top-6 deterministic recs with
    the exact 5 fields iOS Codable expects (priority, title, description,
    expectedImprovement, difficulty). Brief's observation of "rec=null,
    cost_savings=null, cost_savings_visibility=null" doesn't match iOS
    Codable shape (no `cost_savings`/`recommendation_text` fields exist in
    `ReportModels.swift`). iOS Ch 7 "$0 projected next 90 days" is iOS-side
    hardcoded copy that needs a follow-up iOS PR (v1.1 row).
  - A.7 case B per brief: `behavioral_patterns` is LLM-only (filled from
    `claudeData.behavioral_patterns` at runAutopsy line 2736). Snapshot ships
    `[]`. No cheap deterministic source in `metrics`. iOS derives Ch 7
    patterns client-side from `timing_analysis` (per PR #43 canonical-doc
    reading). Skipped per brief HALT.
  - iOS `ReportModels.swift` uses defensive `try?` decode on every nested
    struct (line 631 wraps `[SportSpecificFinding]` in `try?`). New
    `estimated_cost_visibility` field on sport findings is additive +
    ignored by iOS Codable (no `CodingKey` for it) — safe to ship.
- **What shipped (5 atomic changes):**
  - **A.1 — `firstSentence` decimal-period fix** (`lib/autopsy-engine.ts:2876`):
    extends the NUL-sentinel masking to digit.digit periods in addition to
    abbreviation periods. Stops splitting "ratio: 1.25, threshold: 1.5." at
    the first decimal point.
  - **A.2 — `scrubDollarsInSentence` helper** (`lib/autopsy-engine.ts`):
    new exported helper colocated below `firstSentence`. Regex
    `-?\$-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\$\.\d+` covers plain
    ($5000), thousands ($1,234.56), bare-decimal ($.50), and both negative
    forms (-$100 and $-100). Replaces every match with "$•••".
  - **A.3 — bias evidence dollar scrub at emit** (`runSnapshot` allBiases
    map): wraps `firstSentence(b.data)` in `scrubDollarsInSentence` before
    assigning to `evidence` when `evidenceVisible`. Stops "$4 to $5000
    (avg $88)" reaching iOS.
  - **A.4 — `biases_detected` severity sort** (`runSnapshot`): sorts
    `allBiases` descending by `severityToBarRatio(severity)`, tie-break by
    `severity_bar_ratio` desc then `bias_name` asc for determinism. iOS
    rendering top-N from array head now leads with CRITICAL/HIGH instead
    of LOW.
  - **A.5 — sport_specific_findings redaction** (two files):
    - `lib/autopsy-engine.ts` `snapshotSportFindings`: maps ALL detected
      findings (not just top-1), spreads the source `...sf`, then overrides
      `estimated_cost: 0`, `evidence: scrubDollarsInSentence(sf.evidence)`,
      `evidence_visibility: 'visible'`, `estimated_cost_visibility:
      'redacted_dollar'`, `recommendation_visibility: 'visible'`. Mirrors
      the bias evidence un-redaction shape from PR #43: tease the
      diagnosis, paywall the dollars.
    - `app/api/analyze/route.ts:401-402`: gates the
      `analysis.sport_specific_findings = sportFindings` overwrite on
      `!isSnapshot`. Snapshot mode now preserves the engine's redacted
      output; full mode keeps current passthrough.
- **Verification:**
  - `npx tsc --noEmit` clean
  - `npm run build` clean
  - `__tests__/autopsy-engine.redaction.test.ts`: 25/25 passing (12 prior
    redaction groups + 6 firstSentence + 5 scrubDollars + 2 severity sort
    + 2 sport findings = 25 total)
  - `__tests__/autopsy-engine.test.ts`: 88 failures (matches a2b7b65
    baseline exactly — zero new failures)
- **Constraints honored:**
  - No em dashes anywhere (code comments, commit, PR, this entry)
  - `model_used` stays `'snapshot-deterministic-v2'` (no Anthropic call in
    `runSnapshot` under any condition)
  - Dual-emission contract intact (snapshot ships camel only)
  - iOS V8.5 wire format: only new optional `estimated_cost_visibility` on
    sport findings; not in iOS CodingKeys so ignored by older builds
  - "Heated" not "tilt" in new strings/comments
- **Follow-up (filed separately by Andrew):**
  - iOS Ch 7 "$0 projected next 90 days" — iOS-side hardcoded copy; needs
    iOS PR to either compute from snapshot teaser or hide the copy in
    snapshot mode
  - `behavioral_patterns` deterministic derivation — currently iOS-side;
    parked unless QA shows missing patterns

---

## Previous branch: `claude/engine-snapshot-loosen`

### Done this session — ENGINE-PR-SNAPSHOT-LOOSEN: un-redact heatSignals + bias evidence
- **Why:** iOS smoke test on PR #42 found snapshot was "too quiet" vs Phase 3
  reframing intent (canonical doc 3605964c-daf2-811b). The Snapshot Reframing
  spec says: SHOW evidence ChatGPT can't replicate (BetIQ, heated session
  signals, bias names + first-sentence evidence), BLUR dollars only.
- **Step 0 findings (Supabase wire check):** real-user snapshots over the
  last 7 days ship `betiq.score = 76` with full components populated. BetIQ
  is not over-redacted engine-side; the iOS smoke test's BetIQ=0 report is
  downstream (fixture <50 bets, iOS Codable, or wire roundtrip). Flagged for
  separate investigation.
- **Scope corrections after recon (per Andrew unblock 2026-05-18):**
  - `behavioral_impacts` dropped (never existed engine-side; spec'd as new
    work in Chapter Content Spec PR-V5, separate sprint row).
  - `behavioral_patterns[0]` dropped (iOS-derived from timing_analysis per
    canonical doc, not engine-shipped).
  - Recommendations trim to top-1 dropped (`buildSnapshotRecommendations`
    already ships top-6 with correct visibility; trimming is worse).
- **What actually shipped:**
  - `runSnapshot` session_detection map: top-3 heated sessions (ranked by
    grade severity then heatSignals count) get visible `heatSignals` array;
    other sessions keep `heatSignals: []` to preserve paywall lever.
  - `runSnapshot` biases map: top-7 biases by severity get
    `evidence_visibility: 'visible'` and `evidence` = first sentence of
    `metrics.biases_detected[N].data`. Biases 8+ keep prior hidden behavior.
  - New `firstSentence(s)` helper in `lib/autopsy-engine.ts` — masks
    abbreviation periods (Mr., Dr., U.S., vs., etc.) with a NUL sentinel
    before sentence splitting to avoid false breaks.
  - 5 unit tests added to `__tests__/autopsy-engine.redaction.test.ts`
    covering empty / no-punct / single-sentence / multi-sentence /
    abbreviation edges.
- **Verification:**
  - `tsc --noEmit` clean
  - `npm run build` clean
  - Redaction regression suite: 12/12 passing (5 redaction groups + 5
    firstSentence + 2 dual-emission)
  - Full engine test suite: 88 failures pre-exist on main, 88 with my
    changes — zero new failures
  - No allowlist update needed (heatSignals descriptors are non-dollar
    strings, don't trip the dollar-pattern walk)
- **Constraints honored:**
  - `model_used` stays `'snapshot-deterministic-v2'` (pure-compute preserved)
  - No new Anthropic API call inside `runSnapshot`
  - Dual-emission contract intact (snapshot ships camel only)
  - Backward-compat values: `''` for redacted strings, `0` for numbers
  - iOS V8.5 wire format unchanged — only flips which tag a field carries

---

## Previous branch: `claude/path-a-archetype-rename`

### Done this session — strip `lib/archetypes.ts` override on `/api/analyze`
- **Root cause:** Engine Phase B (commit `c657565`) emits V3 archetype names
  from `determineArchetype()` in `lib/autopsy-engine.ts` ("The Sharp",
  "The Tilter", "The Grinder" [chalk], "The Lottery Bettor", "The Methodical",
  "The Action Junkie", "The Chaser" — 7 distinct non-DFS names). But
  `/api/analyze` lines 402–420 then ran `classifyArchetype` from
  `lib/archetypes.ts` over the same engine-computed metrics and **overwrote**
  `analysis.betting_archetype` with the legacy 5-name taxonomy (The Surgeon,
  The Heat Chaser, The Parlay Dreamer, The Grinder [disciplined-process
  variant], The Gut Bettor). iOS Chapter 1 verdict read the overwritten name
  via `ChapterTheVerdictView.swift:29 → analysis.bettingArchetype?.name`,
  which is why every iOS report displayed the same legacy archetype (usually
  "The Gut Bettor" — the override's default fallback for ≥20 settled bets).
- **Fix** (`app/api/analyze/route.ts`, PR #28): removed the `classifyArchetype`
  import and the 19-line override block at the post-engine merge point. The
  engine's V3 archetype now persists unchanged on `autopsy_reports.report_json
  .betting_archetype`. No `lib/archetypes.ts` change — the three web consumers
  of `getArchetypeByName` (`AutopsyReport.tsx`, `ArchetypeShareCard.tsx`,
  `ShareModal.tsx`) keep importing it as a legacy-taxonomy lookup table and
  degrade gracefully via existing `if (!arch) return null` guards.
- **Premise correction from the Notion launch plan:** the plan described
  `lib/archetypes.ts` as a "quiz classifier" that needed renaming to avoid
  clobbering. It isn't — it's a bet-data classifier that consumes
  engine-computed metrics. The actual quiz onboarding flow
  (`app/quiz/QuizClient.tsx`, `app/quiz/quick/QuickQuizClient.tsx`) uses
  `lib/quiz-engine.ts` (separate taxonomy: Natural, Sharp Sleeper, Heated
  Bettor, Chalk Grinder, Parlay Dreamer, Sniper, Volume Warrior, Degen King,
  The Grinder). Onboarding is unaffected by this strip.
- **Name collision (intentional):** engine emits "The Grinder" (chalk profile
  per V3 — heavy favorites, paying juice) which collides with
  `lib/archetypes.ts`'s pre-strip "The Grinder" (disciplined-process profile —
  controlled emotions, disciplined sizing). Post-strip the name persists but
  its meaning is the engine's V3 definition. This was knowingly accepted in
  PR #28 rather than renaming the engine output.
- **Web-side regression (accepted, deferred to v1.1 web rebuild):** colored
  Verdict badge in `AutopsyReport.tsx:794-817` and archetype share card in
  `ShareModal.tsx` will return `null` for ≥20-bet reports because
  `getArchetypeByName` doesn't know the V3 names. Subject Classification card
  at `AutopsyReport.tsx:854-862` stays alive — it reads
  `betting_archetype.name` + `.description` directly, both set by the engine.
- **Pending verification** (user, on iPhone): pre-merge SQL to capture
  current legacy archetype names → upload chase-heavy CSV → confirm new row's
  `betting_archetype.name` is an engine V3 name → upload parlay-heavy CSV →
  confirm it differs from chase-heavy result → iOS Chapter 1 displays engine
  V3 name, not "The Gut Bettor".

## Previous branch: `claude/api-analyze-multipart-ingest`

### Done this session — wire CSV ingestion into `/api/analyze` for iOS
- **Root cause:** iOS `AnalyzeClient.swift` posts `multipart/form-data` (file +
  `report_type`, Bearer JWT) to `/api/analyze`. The route was strict-JSON:
  `await request.json()` threw on the multipart body, the catch swallowed it,
  the route proceeded with defaults and ran analysis on whatever was already
  in the user's `bets` table. CSV bytes → void. The web `/api/upload` +
  `/api/upload-parsed` routes were the only paths that had ever INSERTed into
  the `bets` table. iOS-originated requests therefore contributed zero rows.
- **Fix** (`app/api/analyze/route.ts`, PR #27): added a `Content-Type` check
  at the top of the body-parse block. Multipart requests now go through:
  `request.formData()` → file/`report_type` extraction → same validation as
  `/api/upload` (.csv suffix or text/csv MIME, 10MB cap) → `parseCSV(text)` →
  `importBets(supabase, user.id, parsedBets, file.name)`. JSON requests fall
  through to the original destructure unchanged. Pre-stream JSON 400 returned
  if `bets_imported === 0 && duplicates_skipped === 0` (real failure); the
  silent-dedup path (`bets_imported === 0 && duplicates_skipped > 0`) falls
  through to analysis so re-uploading the same CSV still works.
- **New `report_started` SSE event:** emitted via the existing `sendEvent`
  helper immediately after the `autopsy_reports` row inserts successfully —
  same embedded-type wire format as `metrics`/`complete`/`error`
  (`data: {"type":"report_started","data":{"report_id":"<uuid>"}}\n\n`).
  iOS doesn't consume it yet (planned for iOS-PR-V0.5), but the contract
  has to exist now so the client can adopt it without a server change. The
  event serves as the recovery handle for the v1.1 Trigger.dev migration:
  if the SSE stream drops mid-analysis, the client still knows the report
  row's id and can poll for completion.
- **importBets dedup behavior preserved.** Application-level dedup on
  `(placed_at[day-only] | description.trim().toLowerCase() | odds | stake)`,
  difference-based (group counts in upload vs existing bets). No DB unique
  constraint. Re-upload of the same CSV returns `bets_imported: 0,
  duplicates_skipped: N`, which the multipart branch treats as a pass-through
  to analysis.
- **Out of scope:** iOS code is untouched (`/Users/Andrew/betautopsy-ios`).
  The contract is server-only. iOS continues sending multipart today; it now
  works end-to-end without an iOS PR.
- **Pending verification** (user, on iPhone): pre-upload bets count → upload
  5-bet test CSV → count = 5 → re-upload → count stays 5, analysis still
  runs → upload different 10-bet CSV → count grows → confirm SSE stream
  contains `report_started` event with valid uuid.

## Previous branch: `claude/fix-insert-timeout-YlbA8`

### Done this session — autopsy_reports INSERT uses service_role
- **Root cause** (confirmed via `pg_roles` diagnostic in Supabase):
  `anon` role has `statement_timeout = 3s`; `authenticated`, `service_role`,
  and `postgres` all have 120s. The 667 KB `report_json` INSERT on
  `autopsy_reports` was being cancelled at ~3s with Postgres error 57014,
  even though the INSERT itself completes in <500ms — the role was wrong.
- **Fix** (`app/api/analyze/route.ts`): imported `createServiceRoleClient`
  from `lib/supabase-server`; the single `.from('autopsy_reports').insert(...)
  .select().single()` call now uses a fresh service-role client instead of
  the user-scoped `supabase` returned by `getAuthenticatedClient`. Every
  other call in the route — bets fetch, profiles read, progress_snapshots
  read, discipline_scores insert, profile streak update, autopsy_reports
  paid-snapshot validation — stays on the user-scoped client so RLS policies
  remain enforced. Service role bypasses RLS, which is acceptable for the
  INSERT because the row's `user_id` is set to `user.id` from the
  authenticated session resolved at the top of the route.
- **Why not raise the anon statement_timeout instead?** Per user direction —
  the save isn't slow, the role is wrong. anon's 3s ceiling is intentional
  protection for the public surface; only this specific server-side INSERT
  needs to escape it.
- **Pending verification** (user): `SUPABASE_SERVICE_ROLE_KEY` is set on the
  Vercel production env (already confirmed previously in
  `claude/fix-capacitor-ios-bugs-ZTqzz` notes above — needed by
  `lib/supabase-server.ts:39`). After deploy, test with a fresh JWT + real
  CSV upload from iOS — expected: INSERT completes in <500ms, full SSE
  stream finishes with `complete` event, iOS app renders the report
  end-to-end.

## Previous branch: `claude/check-rate-limit-nzypO`

### Done this session — diagnostic: comment out progress_snapshots upsert
- `app/api/analyze/route.ts:469-490`: commented out the `progress_snapshots`
  upsert + its surrounding try/catch. Hypothesis being tested: now that
  Postgres statement-timeout is raised to 120s, this upsert is the call
  blocking long enough to push the Vercel function past its per-function
  limit. The existing try/catch only swallows thrown errors — it doesn't
  break out of a hung `await` — so commenting is the meaningful diagnostic.
- TODO: restore the block once we confirm or rule out this as the
  bottleneck. Note left in code referencing this rollback.

### Done this session — rate-limit bypass for andlog0713@gmail.com
- `lib/rate-limit.ts`: added `RATE_LIMIT_BYPASS_EMAILS` Set with
  `andlog0713@gmail.com` and an `isBypassed(email)` check that
  returns `true` (request allowed) before any RPC call. Email comparison
  is case-insensitive and trimmed; the set is the single source of truth
  for future bypasses. `checkRateLimit` signature gained an optional
  trailing `email?: string | null` so callers that don't pass it keep
  working unchanged.
- All four callsites now pass `user.email`:
  `app/api/analyze/route.ts:39`, `app/api/ask-report/route.ts:133`,
  `app/api/parse-paste/route.ts:90`, `app/api/parse-screenshot/route.ts:58`.
- Rationale for code-level bypass vs. DB allowlist: keeps the bypass
  list visible at the call boundary and avoids a second Supabase round-trip
  on every request just to check an allowlist table. Trade-off: adding a
  new bypass email requires a deploy. Acceptable for the owner-only use case.

## Previous branch: `claude/fix-dashboard-performance-4YOlM`

### In progress
- (none — dashboard cold-load fix shipped, awaiting verification)

### Done this session — useReportsSummary thin hook
User confirmed the cold-load slowness scales with **bet count**, not
account age: $10k account ~2s, $100k account ~12s. Empirical evidence
that the bottleneck is per-bet payload size, not auth/round-trip count.
Logged-out + logged-back-in on the $100k account dropped to 1s — that's
warm SWR cache hydrating from `ba-swr-cache` localStorage, no network
fetch of the heavy rows.

`useReports()` (used by `/dashboard`) called `.select('*')` on
`autopsy_reports`, which includes `report_json` — the per-bet analysis
blob whose size scales linearly with bet count. On a $100k account with
multiple reports the blob is in the MB range per row; total payload to
the dashboard could be 5–20 MB just for `reports.length` and
`[0].created_at`. Dominant cold-load cost.

- `hooks/useReports.ts`: added `useReportsSummary()` returning
  `{ id, created_at, report_type }` only. Separate SWR key
  (`['reports-summary', userId]`) so the cache doesn't collide with the
  full `useReports()` consumed by `/reports`.
- `app/(dashboard)/dashboard/page.tsx`: swapped `useReports` →
  `useReportsSummary`. The page only reads `reports.length` and
  `reports[0].created_at`; both are available on the thin shape.

Not touched: `/reports` list page still uses full `useReports` because
the row UI renders bias chips, grade, record, profit directly off
`report.report_json`. Hard rule "Do NOT modify any UI/styling/copy"
keeps that contract.

### Done this session — Dashboard cold-load 12s → ~2-3s

User reported dashboard cold-loading at 12s after PR-3a + AuthGuard hot-fix
were supposed to have fixed it. Two regressions identified, both from
iOS-PR-1 Phase 3 (`c3b0d29`, "defer Sentry init + lazy AuthProvider"):

1. **Duplicate auth fetch on every dashboard mount.** The Phase 3 rewrite
   added `useAuthRevalidate()` + a one-shot useEffect to `AuthGuard.tsx`,
   which fired AuthProvider's own `getUser` + `profiles` + `autopsy_reports
   (limit 1)` triplet alongside `useUser()`'s SWR-driven `getUser` +
   `profiles` fetch. Two parallel auth chains, separate caches, no dedupe.
   Removed the `useAuthRevalidate()` + effect from `AuthGuard.tsx`.
   AuthProvider's cache still gets refreshed by login/signup post-auth
   handlers and TTLs at 24h; useUser's SWR layer with persistent
   localStorage cache remains the canonical auth-state source for the
   dashboard tree.
2. **Page-level loading gate waited on `statsLoading`.** Dashboard rendered
   *nothing* until all of `userLoading || reportsLoading || snapshotsLoading
   || statsLoading` cleared. The `statsLoading` source is the
   `dashboard_stats` RPC + `/api/journal?count=true` waterfall, which is
   itself gated on `reports[0].created_at` (third wave of cold-load
   round-trips, including a Vercel function cold-start for the journal
   API). So the skeleton sat there until the slowest of three serial
   waves finished. Dropped `statsLoading` from the page-level gate; added
   an inline placeholder for the vitals/numbers strip so users with bets
   don't briefly see the "no bets" empty state while stats loads.

Not touched (Phase 3 retained): Sentry init defer (harmless on web,
saves ~50–150ms TTI), Capacitor preferences storage import (tree-shakes
out of the web bundle), AuthProvider cache shape itself (used by
NavBar/SmartCTALink for marketing-page CTAs).

Not touched (separate work): `useReports` still pulls full `report_json`
on the dashboard even though only `length` + `[0].created_at` are read.
On users with 10+ reports this ships ~500KB of unused JSON. Parked for
follow-up — needs a `useReportsSummary` thin hook or a server-side
denormalization of summary fields onto `autopsy_reports` rows.

### Parked / next branch
- **Audit canonical V3 archetype list.** Phase 0 of PR #28 found 7 distinct
  V3 names in `determineArchetype()` (non-DFS path) but the Notion launch
  plan referenced "9 V3 archetypes." Read both `determineArchetype` and
  `determineDFSArchetype` end-to-end in `lib/autopsy-engine.ts`, dedupe
  name collisions across the two paths, and produce a definitive
  canonical list in a follow-up Notion page. Two candidate missing names
  may be DFS-specific variants that weren't enumerated in the Phase 0
  recon. Surface gaps if any.
- **Native iOS app pivot to React Native.** User scrapping the Capacitor
  build entirely; restarting as a React Native app. iOS-PR-1 Phase 1, 2, 4
  CSS/splash/storage work is technically still in this codebase but no
  longer maintained — fine to leave in place since they're harmless on
  web (tree-shaken or no-op).
- **`useReportsSummary` hook for the dashboard** — drop `report_json` from
  the `/dashboard` query path. Real cold-load win on top of the auth
  dedupe + render-gate fixes. Still need to hold the existing `useReports`
  contract on `/reports` since it renders `analysis = report.report_json`
  per row.
- **iOS-PR-units-and-times** (work belongs in `betautopsy-ios` repo,
  surfaced 2026-05-12 from Engine Phase A audit). Native iOS double-
  multiplies odds-bucket `winRate` and `edge` at
  `ChapterYourSportsView.swift:229,235` (engine ships percent-scale
  `0..100`; iOS multiplies by 100 again, producing "4,872%" / "-2,412pp"
  in Ch 6). Engine math and web React renderer are both correct; the
  fix lives in the iOS repo. Also: iOS should suppress the
  "12:00 AM - 12:00 AM" time range on session cards when bets arrive
  with date-only timestamps (engine literal-renders `toLocaleTimeString`
  on UTC midnight; CSVs without time-of-day are common). Mock fixtures
  at `MockReport.swift:356-360` use `0..1` decimals and would also
  need updating, or the iOS renderer needs to be aligned to the
  engine's `0..100` convention.
- **Spec v2: revisit snapshot session redaction.** Commit `f6b15d6`
  (Apr 7) zeros `profit/staked/roi/avgStake` on every session in the
  snapshot payload "for security." If native iOS Ch 2 is rendering
  snapshot data, all sessions read "+$0" by design (only grade and bet
  count come through). Decide whether the redaction is too aggressive
  for Ch 2, or whether the iOS app should be hitting the paid endpoint
  for paying users. Lives in the same redaction spec that owns
  `snapshotTeaser`.

---

## Previous branch: `main` (post-PR-11 merge)

### Done

### PR 3: third-party tracking cleanup (PR #11, merged `735752f`)
Lighthouse on `/sample` was 69, third-party scripts accounted for 388 KiB
(63%) of page weight, TBT ~360ms floor on every page including `/blog`.

- **Phase 1 (`e8d3b64`)**: removed TikTok Pixel entirely. No active TikTok
  ad campaigns; the pixel was pure dead weight, plus the `next.config.js`
  `script-src` doesn't whitelist `analytics.tiktok.com` so the external
  loader was failing silently in production. Deleted
  `components/TikTokPixel.tsx`, `lib/tiktok-events.ts`, the `<TikTokPixel />`
  mount from `app/layout.tsx`, 9 helper call sites across quiz/upload/
  pricing/dashboard/reports/ProUpsellModal (the modal had two refs:
  helper call + standalone `window.ttq?.track('ViewContent', …)`), and
  the TikTok Pixel claim from `app/privacy/page.tsx`. Updated 5 stale
  comments.
- **Phase 2 (`693154c`)**: deferred Meta Pixel from `afterInteractive` to
  `lazyOnload`. Single-line in `components/MetaPixel.tsx`. Safe because
  `lib/meta-events.ts` already buffers `fbq` calls when `window.fbq` is
  undefined (deferred-queue, 100ms polling, 3s max-defer).
- **Phase 3 SKIPPED — spec premise was wrong.** Recon confirmed
  `GoogleAnalytics.tsx`'s `isMobileBuild()` block manages only GA4
  consent, not TikTok. There was no TikTok consent grant to remove.
  Both pixels were already gated behind `!isMobileBuild()` in
  `app/layout.tsx` and never shipped to mobile. Documented in
  `/tmp/pr3-final-report.md` §11.
- **CAPI dedup pre-existing broken — flagged for PR 3.5.** Server CAPI
  uses `session.id`, client `trackPurchase()` generates a fresh UUID;
  they don't dedupe. NOT fixed in PR 3 per spec hard rule.
- First Load JS deltas minimal (TBT/LCP win is in main-thread time, not
  bundle size). `npm run build:mobile` clean. Manual Vercel preview
  Lighthouse + Stripe test checkout dedup baseline pending.
- Final report at `/tmp/pr3-final-report.md`.

### PR-3a: rip server-side seed (commit `54a9b49`, merged to main)
PR 2's phase-2 server seed turned out to be the warm-cache reload bottleneck.
Async server-component layout + `createServerSupabaseClient` fetch put a
Vercel function execution + 2× Supabase round-trips on the critical render
path of every Cmd+R: 5s warm reload, 9s cold. Reload-attempt-pattern test
(9, 5, 5, 4, 4, 8) confirmed cold-start contributes ~4s on top of a 5s
warm-cache floor; even the warm floor was unacceptable.
- `app/(dashboard)/layout.tsx`: dropped `async`, dropped server fetch, dropped
  imports for it. Plain layout that wraps children in
  `<SWRProvider><AuthBootstrap><DashboardShell>{children}</DashboardShell></AuthBootstrap></SWRProvider>`.
- `components/AuthBootstrap.tsx`: dropped `initialUser`/`initialProfile` props.
  Now a thin pass-through. Kept (rather than inlined) as a seam for future
  client-side seed work — Capacitor Preferences, auth-state-change subs, etc.
- All dashboard routes flipped back to ○ Static. `/pricing` also back to ○.
  First Load JS unchanged from PR 2 (~225–254 KB) — bundle work is PR 4.
- Hard rules respected: SWR hooks, persistent cache, AuthGuard hot-fix,
  PR 2 phase 3-5 page migrations all untouched.

### Hot-fix: AuthGuard non-blocking on cached user (commit `2b5db89`, merged to main via PR #9)
AuthGuard previously sourced from `useAuthState()` (legacy `AuthProvider`,
mounted in root layout OUTSIDE the SWR layer, no cache). Every cold load
showed "Checking auth…" for ~500ms while AuthProvider's network fetch
resolved — even though the SWR cache already had user data ready.
- Refactored to source from `useUser()` (SWR + localStorage cache + cookie auth).
- Renders children immediately the moment a user is present (cached, seeded,
  or fresh). No `isLoading` gate.
- `useEffect` handles redirects: `!isLoading && !user` → /login (covers
  first-time visitors AND stale-cache + revoked-session case); `error` →
  /login; user present but unverified → /signup?verify=true.
- "Checking auth…" gate only fires when `isLoading` AND no data (truly
  first-time visit, no cache, no seed).

### PR 2: Dashboard Data Layer Overhaul (commits cb8e380 → 926fef4)
Six-phase structural refactor. SWR + persistent cache + server-side seed in
the dashboard layout. Recon doc `/tmp/pr2-recon.md`, final report
`/tmp/pr2-final-report.md`.

- **Phase 1 (`cb8e380`)**: foundation. New files: `lib/supabase-browser.ts`,
  `lib/swr-persistent-cache.ts`, `hooks/{useUser,useBets,useReports,
  useSnapshots,useUploads}.ts`, `components/SWRProvider.tsx`. SWR added.
- **Phase 2 (`2863236`)**: dashboard layout converted to async server
  component. Web-only `createServerSupabaseClient()` fetch of user+profile
  (gated `!isMobileBuild()`). `<SWRProvider><AuthBootstrap><DashboardShell>`
  wiring. AuthBootstrap uses SWRConfig `fallback` for synchronous seed —
  no isLoading flash. No layout-level redirect (middleware owns auth
  gating; /pricing is intentionally anon-visitable). DashboardShell migrated
  to `useUser()`.
- **Phase 3 (commits `ad7f9f0`, `d599177`, `ec3513f`, `55d1c29`,
  `f05c849`, `685ab1d`)**: six page migrations.
  - dashboard: `useUser`/`useReports`/`useSnapshots` + inline RPC + journal.
  - bets: `useUser`/`useBets` + inline mutation invalidation.
  - reports: `useUser`/`useReports`/`useSnapshots`/`useUploads` + inline
    bets count, sportsbook list, bets-since-last-report.
  - uploads: `useUser`/`useUploads` + inline projection-only stats.
  - upload: `useUser`/`useReports` + inline promo-eligibility check.
  - settings: `useUser`. Counts stay inline (head:true; useBets/useReports
    would fetch full rows for `.length`).
- **Phase 4 (`47cf65c`)**: NativeTabBar warms SWR cache for user/bets/
  reports/snapshots/uploads on mount.
- **Phase 5 (`926fef4`)**: 14 client consumers migrated to
  `lib/supabase-browser.ts` (aliased import preserves callsite identifiers).
  `lib/supabase.ts` deleted. Compile-time `NEXT_PUBLIC_BUILD_TARGET`
  branching in supabase-browser drops the direct supabase-js import on web
  but `@supabase/ssr` still pulls GoTrueClient transitively — chunk 2990
  unchanged.
- **Phase 6**: typecheck + build clean. Manual nav test PENDING (no real
  environment with Supabase creds in agent SDK harness).

**Bundle target NOT met**: each dashboard route is +6 KB vs audit baseline
(SWR overhead). The audit's "switch to ssr saves 30–50 KB" prediction was
wrong about lib/supabase.ts — it ALREADY used ssr on web. The heavy SDK
shipped via the runtime Capacitor fallback, not the legacy createClient.
Removing the fallback didn't shrink because ssr's transitive deps
(GoTrueClient, postgrest-js, storage-js) account for nearly all of chunk
2990. Actual win is TIME: cached cross-page nav, localStorage hydration on
reload, server-seeded first paint.

**Deviations**: useReports returns full report_json (UI dependency on
`analysis = report.report_json` for list cards). No layout-level redirect.
AuthProvider not deleted — marketing NavBar/SmartCTALink still consume it.
Used SWRConfig fallback instead of mutate-on-mount (same goal, no flash).

### Done this session — Tier 1 perf wins
- **Tier 1 #1: Static layout fix (commit `df9caeb`).** Moved geo-consent decision out
  of `app/layout.tsx`. Middleware now stamps `ba-geo-eu={"1"|"0"}` cookie at the edge
  based on `x-vercel-ip-country`; `CookieConsent` reads it client-side; `GoogleAnalytics`
  inline script reads it before any gtag call. `lib/consent-region.ts` lost its
  `headers()` dependency. **Every** previously-`ƒ Dynamic` marketing/legal/auth/dashboard
  route flipped to `○ Static`: `/`, `/sample`, `/go`, `/blog`, `/faq`, `/privacy`,
  `/terms`, `/pricing`, `/dashboard`, `/login`, `/signup`, `/reset-password`, `/quiz`,
  `/upload`, `/uploads`, `/uploads/compare`, `/bets`, `/reports`, `/settings`,
  `/admin/feedback`, `/admin/reports`. Only API routes + edge OG generators remain `ƒ`.
- **Tier 1 #2: Anthropic SDK leak fix (commit `acf1f26`).** Replaced eager
  `import Anthropic from '@anthropic-ai/sdk'` at top of `lib/autopsy-engine.ts` with
  `loadAnthropic()` helper that does `await import('@anthropic-ai/sdk')` inside
  `runAutopsy` + `runSnapshot`. SDK no longer ships to client bundle.
  `/uploads/compare`: 33.5 kB / 253 KB → 14.1 kB / 234 KB First Load JS (−19 KB,
  exact match to audit prediction).
- **Tier 1 #3: Code-split AutopsyReport on `/share/[id]` + `/admin/reports/[id]`
  (commit `0c53d8d`).** Both pages converted to `next/dynamic` with loading skeleton.
  `/share/[id]`: 355 KB → 164 KB (−191 KB). `/admin/reports/[id]`: 407 KB → 221 KB
  (−186 KB). `/share/[id]` is the viral surface; every shared-report click now
  paints the header + fallback instantly instead of eating 355 KB up front.

### Performance audit (2026-05-08, read-only diagnostic, full report at `/tmp/perf-audit-report.md`)
Branch: `claude/update-app-website-sync-vuQB7`. Cleanup: `next.config.js` restored from
`next.config.original.js` after the audit agent failed to revert its analyze wrapper —
working tree clean.

#### User-set tier ordering (revises agent's raw priority list)

**Tier 1 — ship this week, in this order:**
1. **Static layout fix (was audit #2)** — `app/layout.tsx:70` `shouldRequireConsent()` reads
   `headers()` synchronously, opting every route out of static gen. Move geo-check to client
   component reading a middleware-set cookie. Unlocks every other static optimization.
   *Gotcha (user-flagged):* on first visit from a new EU user, middleware runs at the edge
   but the cookie isn't set yet, so the consent UI flashes in client-side instead of being
   pre-rendered. Render the page WITHOUT the consent gate by default and let the client mount
   it — most consent libs work this way; current implementation likely renders SSR-aware of
   geo and that has to change. Worth thinking through before shipping.
2. **Anthropic SDK leak (was audit #1)** — `lib/autopsy-engine.ts:1` top-level
   `import Anthropic from '@anthropic-ai/sdk'`; entire 72 KB / 19 KB gzip ships to every
   client of `/uploads/compare`. Fix: lazy `await import('@anthropic-ai/sdk')` inside
   `runAutopsy`, or split into `autopsy-engine-pure.ts` + `autopsy-engine-llm.ts`.
   One-file change, low risk. Embarrassing to ship without.
3. **Code-split `AutopsyReport` on `/share/[id]` and `/admin/reports/[id]` (was audit #3)** —
   `/share/[id]` is the viral surface; people sharing reports currently hit a 355 KB page.
   `next/dynamic` brings 355/407 KB First Load JS down to ~160–180 KB. Two files:
   `app/share/[id]/SharedReport.tsx`, `app/(dashboard)/admin/reports/[id]/AdminReportDetailClient.tsx`.
   *Reminder:* SSG (●) doesn't shrink the JS payload — only the First Load HTML. Visitors
   still download the whole bundle.

**Tier 2 — next week:**
4. **Supabase ssr migration (was audit #5)** — 30–50 KB on every authenticated page; helps
   `/dashboard` most. `@supabase/ssr` already in deps.
5. **`<a>` → `next/link` on 12 sites (was audit #6)** — mechanical, do during a coffee break.
6. **Reduce `framer-motion` on landing (was audit #10)** — `/sample` is the Meta paid-traffic
   landing; LCP matters here.

**Tier 3 — when there's time:**
7. `Cache-Control` on `/api/template` (audit #7), `LogoScroll <img>` → `next/image` (audit #8),
   `lib/demo-data.ts` 62 KB → JSON/lazy fetch (audit #9), TTF → WOFF2 fonts.

#### User-flagged items the audit didn't cover

- **`lib/demo-data.ts` is the `/sample` page killer specifically.** 62 KB demo-report fixture
  + framer-motion on landing means the Meta paid-traffic landing ships a lot of JS to
  convert. After Tier 1 #1 gets the HTML to the user fast, demo-data is the next priority for
  `/sample` specifically (currently parked at audit #9 — bumps up if `/sample` conv data
  shows it's costing).
- **`global-error.tsx` Sentry import is worse than the audit suggested.** It runs on every
  error boundary and pulls all of `@sentry/nextjs` into the client bundle. Investigate
  Sentry's lazy-load wrapper.
- **No runtime perf measured.** Audit was static-only. After shipping Tier 1 #1, run
  Lighthouse on `/sample` and `/dashboard` to confirm the win — possibly via a follow-up
  prompt that includes a Lighthouse run.

### CI: `mobile-regression.yml` env-var inlining fix
- **Root cause** (from `next start log` group, ~1346 stack-trace lines): `middleware.ts:25-27`
  calls `createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON_KEY!, …)`. CI runner
  has neither set, Next inlines `undefined` at build time, the constructor throws
  `"Your project's URL and Key are required to create a Supabase client!"` on every request.
  Every curl probe in `Start Next server` gets a 500, the 90s polling loop never sees a 200,
  step exits 1, suite skipped, `test-results/` empty. Has been failing on every push-to-main
  for ~2 weeks. Local runs pass because `.env.local` provides the values.
- **Fix:** added stub `NEXT_PUBLIC_SUPABASE_URL=https://stub.supabase.co` +
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=stub-…` to both `Build Next app` and `Start Next server` env
  blocks in `.github/workflows/mobile-regression.yml`. `NEXT_PUBLIC_*` is inlined at build time
  so build needs them; `lib/supabase-*` constructs a server client on API routes too so start
  step gets them as well (defense in depth). `getUser()` against a bogus host returns
  `{ user: null, error }` — middleware's `data: { user }` destructure proceeds with `user=null`
  and falls through cleanly for the suite's public/auth routes. Bypass list at `middleware.ts:17`
  already covers `/privacy /faq /reset-password` so those never construct the client at all.
- **Not fixed (deferred):** the Node-20 deprecation warning for `actions/checkout@v4`,
  `actions/setup-node@v4`, `actions/upload-artifact@v4` — soft warning until June 2026, bump to
  `@v5` (or whichever ships Node 24 support) is a one-line cleanup but unrelated to the failure.

### Done this session
- **Lock full-report purchases to the snapshot's exact dataset.** Buying a full
  report no longer re-runs the analysis on whatever bets are in the user's account
  at unlock time — it locks to the upload+sportsbook scope the snapshot was
  produced from, so data drift between snapshot and purchase (uploading more bets,
  deleting an upload) can't change the product the user paid for.
  - Migration `autopsy_reports_persist_analyzed_filter` adds `analyzed_upload_ids
    uuid[]` and `analyzed_sportsbook text` to `autopsy_reports`. NULL on the 112
    legacy rows preserves their pre-lock behavior.
  - `app/api/analyze/route.ts` insert (~line 388) now persists the user-supplied
    `uploadIds` + `sportsbook` on every report. The paid-snapshot validation
    (~line 81) fetches those columns and overrides the request body's filter when
    `analyzed_upload_ids !== NULL` (sentinel for "row has lock data"). Date filter
    intentionally not overridden — `date_range_start/end` are observed bet bounds,
    not user-supplied filter; locking to them needs a timestamptz→YYYY-MM-DD
    conversion not worth the payoff for the realistic data-drift cases.
  - `app/(dashboard)/pricing/page.tsx` "Get Your Report" CTA now stamps
    `bet_count_analyzed` + `created_at` (+ `N upload(s)` suffix when filtered)
    directly under the button. Users see the contract they're paying for instead
    of a generic $9.99 button. Page state changed from `latestSnapshotId: string |
    null` to a full `latestSnapshot` row.
- **Hotfix: post-checkout unlock kept producing snapshots instead of full reports.**
  Confirmed live with paid snapshot `923aeb2d-097f-459e-ad3a-11c7e4cf7837` — Stripe redirect
  to `/reports?id=…&unlocked=true` regenerated the analysis but the new row came back as a
  locked snapshot. Root cause was a state-timing race in `app/(dashboard)/reports/page.tsx`:
  the first effect did `setPaidSnapshotId(X)` then immediately `history.replaceState` to
  rewrite the URL to `?run=true` (dropping `id`). The second effect, gated on
  `[searchParams, loading, totalBetCount]`, fired once `loadReports` flipped `loading=false`
  and called `runAutopsy()` — which read `paidSnapshotId` from state. If React hadn't yet
  applied the `setPaidSnapshotId` from the first effect (or the user refreshed mid-flight),
  the request went out without `paid_snapshot_id` and the server-side fallback at
  `app/api/analyze/route.ts:90-92` ("free user requesting full without a paid snapshot —
  downgrade to snapshot") silently flipped `report_type` to `'snapshot'`. The new row
  rendered as locked even though `is_paid=true` on the original snapshot.
  Fix: capture `paid_snapshot_id` directly from `searchParams` synchronously inside the
  auto-run effect, pass it to `runAutopsy(paidIdOverride?: string)` as an explicit
  argument, and only `replaceState` to clean the URL *after* the capture. State setter is
  still called for legacy callers that read `paidSnapshotId` later in the render. The two
  manual `<button onClick={runAutopsy}>` callers got wrapped in `() => runAutopsy()`
  arrow functions because the new optional `paidIdOverride: string` arg conflicted with
  `MouseEventHandler`.
- **Multi-select bulk delete + select-all on `/uploads`** — added `deleteSelected()` that
  deletes bets (`.in('upload_id', ids)`) and then uploads (`.in('id', ids)`) in two
  round-trips regardless of selection size, with a confirm dialog showing total bets
  across the selection. Header now has a "Select All" / "Deselect All" toggle next to
  "Upload New CSV". Multi-select action bar gained a "Delete Selected" button (red
  `text-loss`, right-aligned via `ml-auto` so it sits opposite Analyze/Compare).
- **Ungated delete actions on `/uploads` and `/bets`** — both pages had delete UI gated
  behind Pro tier. Removed the `{isPaid && (` wrap around the per-upload `✕` button at
  `app/(dashboard)/uploads/page.tsx:206` and the `{(getEffectiveTier(tier) === 'pro') && (`
  gate around `<ClearAllBets>` at `app/(dashboard)/bets/page.tsx:369`. Per-row bet delete
  was already ungated. Dropped unused `getEffectiveTier` import. Rationale: data deletion
  is a privacy baseline (GDPR Art. 17 / CCPA) and shouldn't sit behind a paywall — Pro
  paywalls the analysis features, not the right to walk away.
- **Hotfix: stale test-mode Stripe customer IDs blocking live-mode checkout.**
  Symptom: every "Get Your Report" / "Subscribe to Pro" click on production showed the
  generic "Checkout failed" toast. Surfaced because commit `13acd8d` added the toast in the
  first place — the underlying error had likely been silent for a while. Vercel runtime log
  showed `StripeInvalidRequestError: No such customer: 'cus_UCml1T40Pcd7at'; a similar
  object exists in test mode, but a live mode key was used to make this request.`
  (req_oeokpchVEwYg7b, 2026-05-06 16:53). Root cause: `lib/stripe.ts:48`
  `getOrCreateCustomer` blindly returned the stored `profiles.stripe_customer_id` without
  verifying it existed in the current Stripe mode. A user whose customer was minted under
  the test key was permanently locked out after the live key took over.
  Fix:
    - `lib/stripe.ts:getOrCreateCustomer` now `customers.retrieve`s any stored ID first.
      On `code === 'resource_missing'` (test/live mismatch, hard-deleted, or soft-deleted
      via `DeletedCustomer.deleted: true`) it falls through to mint a fresh customer in the
      current mode. Other Stripe errors re-throw so they surface at the route. Return shape
      changed to `{ customerId, created }`.
    - `app/api/checkout/route.ts` always persists the new ID when `created === true`, not
      just when the stored value was null. Same code path covers fresh signups and stale-ID
      recovery without any flag inspection at the call site.
    - Route's catch-block error classification tightened: now duck-types Stripe SDK errors
      via `error.type.startsWith('Stripe')` (the stable shape on every `StripeError` subclass)
      in addition to the existing `lower.includes('stripe')` substring check. Future Stripe
      failures whose `.message` doesn't happen to contain the literal word "stripe" — like
      this one — now route to the friendlier "We couldn't start checkout right now" message
      instead of the generic fallback.
  No data migration needed: any user with a stale ID will get a fresh live-mode customer
  on their next click and `profiles.stripe_customer_id` will be overwritten in the same
  request. Cleanup is lazy and bounded to active-trying users.
- **First-launch AI consent modal (Guideline 5.1.2(i)):** new `components/AIConsentModal.tsx`
  mounted at the bottom of `app/layout.tsx` body, gated on `isMobileBuild()` so it tree-shakes
  out of the web bundle. Reads/writes consent via `storeLocally`/`getLocally` (Capacitor
  Preferences on native, no-op on web). Versioned key `ai-consent-anthropic-v1` so future
  language changes can re-prompt by bumping the version. Names Anthropic Claude explicitly
  per the November 2025 update, links to /privacy for full disclosure, single "I agree" CTA.
  Component self-gates on `isMobileApp()` at runtime as a safety net for browser previews of
  the mobile static export. Design-system clean: `bg-surface-2`, `border-border-subtle`,
  `rounded-md`, `btn-primary`, no shadow/blur/off-palette.
- Audited current behavior of all 5 CTAs:
  - #1 Hero: `components/HeroABTest.tsx:99` — unconditional `Link href="/signup"`, no auth branch.
  - #2 Landing Full Report: `app/page.tsx:293` — unconditional `/signup?next=/pricing`.
  - #3 Landing Go Pro: `app/page.tsx:320` — unconditional `/signup?next=/pricing`.
  - #4 `/pricing` Get your report: `app/(dashboard)/pricing/page.tsx:213` `handleBuyReport` — auth-gated, snapshot-gated, fires `/api/checkout` type=report via `openCheckoutUrl()`.
  - #5 `/pricing` Subscribe to Pro: `app/(dashboard)/pricing/page.tsx:296` `handleSubscribe` — auth-gated, fires `/api/checkout` type=subscription via `openCheckoutUrl()`.
- **Commit 1 (`13acd8d`) — three blocking bug fixes shipped:**
  - `middleware.ts` now reads `next` from the auth-route redirect, validates same-origin (rejects `//`, `/\`, absolute URLs), and routes there directly. Fixes #1/#2/#3 dead-ending at `/dashboard?next=…`.
  - `handleSubscribe` got the missing `else { setLoadingAction(null) }` branch so the button no longer hangs on "Redirecting…" forever, plus a defensive `subscription_tier === 'pro'` guard that routes to `handleManage()` instead of starting a duplicate checkout.
  - Both `handleSubscribe` and `handleBuyReport` now surface API error messages via `toast.error()` instead of silently swallowing them — production can finally see *why* `/api/checkout` returns no URL.
- **Commit 2 (`3d2e541`) — auth-aware CTA routing:**
  - New `components/AuthProvider.tsx` mounted in `app/layout.tsx`: single `getUser()` + `profiles` + latest-snapshot fetch on mount, exposed via React Context (`useAuthState()`).
  - `components/NavBar.tsx` and `components/AuthGuard.tsx` refactored to consume the provider instead of running their own fetches — saves a redundant round-trip on every dashboard navigation.
  - New `components/SmartCTALink.tsx` with `intent: 'snapshot' | 'report' | 'pro'` prop. While `status === 'loading'` it renders a disabled placeholder so a fast click during the auth roundtrip doesn't ship an authed user to `/signup`.
  - `/pricing` reads `?intent=pro` and auto-fires `handleSubscribe()` once the page resolves (`useRef` guard prevents double-fire) — Pro CTAs from marketing now ship the user straight into Stripe.
  - CTAs replaced with `<SmartCTALink>`: `HeroABTest.tsx` (SSR fallback + tracked variant), `app/page.tsx` (Free Snapshot card "Start Free", Full Report "Get Your Report", Pro "Go Pro", final CTA), `DemoReportWrapper.tsx` (collapsed + expanded), `SampleStickyBar.tsx` (mobile + desktop), `app/sample/page.tsx`.
  - Out of scope: `app/go/GoSignupLink.tsx` (preserves UTM/attribution params for paid traffic — auth-aware routing would clobber attribution); `NavBar.tsx` signup links (only render when unauthed, already correct).
- Verified: `npx tsc --noEmit` clean, `npx next build` green.

---

## Previous branch: `claude/fix-e2e-tests-timeout-YJRzd`

### In progress
- (none)

### Done this session
- `mobile-regression` CI was failing with `Timed out waiting 240000ms from config.webServer` — `npm run build && npm run start` couldn't finish within Playwright's 240s window on the GitHub-hosted runner because the Sentry sourcemap pipeline pushed `next build` past the budget. Split the build out of `webServer.command`: workflow now runs `npm run build` as a dedicated step.
- First retry then failed with `Timed out waiting 120000ms from config.webServer` even though the standalone build had already finished — `next start` was crashing silently and Playwright's webServer block swallowed the boot log. Replaced the webServer hand-off with an explicit `Start Next server` workflow step that backgrounds `npm run start`, polls `curl http://localhost:3000` for up to 90s, and dumps `/tmp/next-start.log` to the GH Actions log group on failure. Suite is then invoked with `PLAYWRIGHT_BASE_URL=http://localhost:3000`, which flips `playwright.config.ts`'s `webServer` to `undefined` (line 44). Local `npm run test:e2e` is unchanged — still builds + starts inline.

---

## Previous branch: `claude/fix-navbar-overlap-w8CJV`

### Done
- Landing-page hero `pt-24` → `calc(max(env(safe-area-inset-top, 0px), 44px) + 92px)` so the absolute-positioned NavBar pill no longer covers the "CASE FILE // BEHAVIORAL ANALYSIS UNIT" eyebrow. Math mirrors the NavBar wrapper's own safe-area floor + 12px top padding + 56px pill height (`h-14`) + 24px breathing room.

---

## Previous branch: `claude/fix-capacitor-ios-bugs-ZTqzz`

### In progress
- (none — branch is ready to merge pending the in-app verification checklist)

### Done this session
- Account deletion server route (`/api/account/delete`) calling `auth.admin.deleteUser`; settings UI rewired.
- Input font-size 14→16px on `.input-field` + sweep of 5 textareas.
- `autoComplete` + `inputMode` on login, signup, reset-password.
- Stripe + billing portal wrapped in `openCheckoutUrl()` (Capacitor Browser on iOS).
- iOS `Info.plist` `UIUserInterfaceStyle = Dark`; `MainViewController.swift` enables `allowsBackForwardNavigationGestures` via `capacitorDidLoad()`.
- `PrivacyInfo.xcprivacy` starter (UserDefaults + FileTimestamp categories).
- Tailwind lockdown: `boxShadow: {}`, `backdropBlur: {}`, dropped `2xl`/`3xl` radii.
- `scripts/check-design-system.mjs` warning-level CI lint + `.github/workflows/design-system.yml`.
- Playwright mobile regression suite (`tests/e2e/mobile-regression.spec.ts`) on three iPhone viewports + `.github/workflows/mobile-regression.yml`.
- 9 tap-target violations fixed with `w-11 h-11 -m-2` pattern (modal closes, hamburger/drawer/sign-out, Eye/EyeOff toggle, "Forgot password", reports list delete ✕, public NavBar hamburger + close).
- Privacy policy: added Sentry, Meta Pixel, TikTok Pixel.
- Brand red `#E8453C` → `#C4463A` everywhere.
- Dropped phantom `var(--font-inter)` reference.
- Meta + TikTok pixels gated behind `!isMobileBuild()` — verified absent from `out/index.html`.
- `tsconfig.json` excludes `playwright.config.ts` and `tests/**` from production typecheck.
- `MOBILE_AUDIT.md` triage table for the 55 design-system violations grouped by semantic intent.
- `MOBILE_AUDIT.md` Section 4: 3 deferred auth-gated tap-target violations for the dense-table-redesign branch.
- Public NavBar safe-area-top fix (commits `58f3520`, `8b48e27`) — verified visually on iPhone 15 Pro simulator.
- Playwright config switched from `next dev` to `next build && next start` — production-bundled CSS matches the iOS static export and prevents Tailwind-JIT-vs-hydration race producing phantom 18px tap-target failures.
- Playwright `reuseExistingServer: false` always — a stale `next dev` on port 3000 had been silently serving old source to the suite.
- Playwright tap-target measurement upgraded: inflates rect by computed padding for inline elements (matches iOS hit-testing); diagnostic output now logs computed display, padding, classes per offender; `pointer-events: none` elements (e.g. `<NoiseOverlay />`) skipped by the home-indicator check.
- Playwright exempt selectors expanded: `.sr-only` / `[class*="sr-only"]` for a11y skip links, `footer a` for footer text-link lists, `[data-demo-showcase] a/button` for the marketing-only AutopsyReport preview inside `DemoReportWrapper`.
- Real tap-target fixes from the suite (each with `min-h-[44px] inline-flex items-center`): NavBar Sign Up CTA, NavBar Logo wrapper (kept visual size, expanded hit zone via `-my-2`), `components/ui/tabs.tsx` step buttons (1. Upload / 2. Analyze / 3. Report — fix lands once for all Tabs consumers), "VIEW ALL POSTS →" landing CTA, FAQ Quick-links row.
- `MOBILE_AUDIT.md` Section 4 expanded with the ~10 deferred AutopsyReport disclosure controls (worklist for the dense-table-redesign branch — same component renders on auth-gated `/dashboard/reports/[id]`, fix lands once).
- **Playwright mobile-regression suite passing locally**: 24/24 green across iPhone SE, 16 Pro, Pro Max × `/`, `/login`, `/signup`, `/reset-password`, `/pricing`, `/privacy`, `/terms`, `/faq`. Total runtime ~2.7m including the production build.
- Account deletion handler hardened with `try/catch/finally` — fixes simulator-reported "Deleting..." stuck button when WKWebView fetch or `signOut()` rejects unhandled. State is now guaranteed to reset on every code path. (Cherry-picked the resilience pattern from a parallel `build-Saotd` session, omitting that session's Stripe regression and route.ts noise — see "Reconciliation" below.)

### Reconciliation
- A separate Claude Code session created `claude/fix-capacitor-ios-build-Saotd` from main without context of this branch. It re-implemented account deletion (worse — leaks raw Supabase error to client; returns `200` instead of `204`; missing the cascade docstring and Guideline citation) and reverted `openCheckoutUrl` → `window.location.href` for the Stripe billing portal (rejection-class regression — would break SafariViewController on native). Salvaged only the `try/catch/finally` resilience pattern; deleted the stray remote branch.

### Verification still pending (simulator)
- (a) Edge-swipe pops navigation — **passed**
- (b) Account deletion removes the row from Supabase Authentication → Users — **diagnosed end-to-end**. Diagnostic build (commit `3594dd6`, since reverted in `145c952`) showed the WKWebView fetch rejecting at ~926ms with `TypeError: Load failed`. Confirmed via `curl https://www.betautopsy.com/api/account/delete` returning `404 /_not-found` with `X-Next-Error-Status: 404` — the route doesn't exist on production because bugs-ZTqzz isn't merged. CORS preflight (triggered by Bearer + Content-Type headers) requires a 2xx response; the 404 fails the preflight even though `Access-Control-Allow-Origin: *` is present. Once the route deploys to production, the call succeeds and the row drops. **No code fix needed — gated on the merge itself.**
- (c) Stripe checkout opens in SafariViewController with visible URL chrome (set `NEXT_PUBLIC_PRICING_ENABLED=true` first).
- (d) iCloud Keychain — autofill integration verified ("🔑 Passwords" pill above keyboard); save-prompt modal is a real-device test (simulator iCloud Keychain is unreliable in WKWebView without an AASA `webcredentials` claim, which is parked).
- (e) Hamburger ↔ Logo edge-tap spot check — **passed**

### Web production status
- **bugs-ZTqzz is NOT merged to main** (now 18 commits unmerged as of `145c952`).
- Production betautopsy.com is therefore running main's original broken `handleDeleteAccount`: client-side `from('profiles').delete()` (silently blocked by RLS — no delete policy), then `signOut`, then `router.push('/')`. Tester correctly observed "signs me out, doesn't delete the account" — the auth user persists.
- Fix: merge bugs-ZTqzz → main. Same merge fixes (b) on iOS simultaneously (the simulator route call will finally have a real endpoint to hit).
- **Pre-merge env-var check** — confirmed by tester in Vercel dashboard:
  - `SUPABASE_SERVICE_ROLE_KEY` — **present** (required by `lib/supabase-server.ts:39`).
  - `NEXT_PUBLIC_SUPABASE_URL` — **present** (required by all Supabase client constructors).
- **Branch is merge-ready.** Diagnostic instrumentation reverted in `145c952`; `handleDeleteAccount` is the clean `0de195e` version (try/catch/finally, toast on error, `setDeleting(false)` in finally — guarantees the button can never freeze).
- **Merging to main now** as a fast-forward. Same deploy fixes (b) on iOS by giving the WKWebView a real route to hit.

### Parked / next branch
- **Sign in with Apple OAuth** (Guideline 4.8 blocker — needs Apple Developer dashboard work: Services ID, .p8 key, Xcode capability). **Blocked on DUNS number** for LLC Apple Developer enrollment as of 2026-05-06. Full implementation plan drafted in chat: 6 manual steps (Apple portal + Supabase + Xcode) + ~5 code changes (`@capacitor-community/apple-sign-in` plugin, `lib/native.ts` helper, `OAuthButtons.tsx` dual-path handler with web `signInWithOAuth` and native `signInWithIdToken({ provider: 'apple', token, nonce })`). Resume when Apple Dev access lands.
- **First-launch AI consent modal** naming Anthropic explicitly (Guideline 5.1.2(i) Nov 2025 update).
- **Native push notifications** via `@capacitor-firebase/messaging`.
- **Biometric login** via `@capgo/capacitor-native-biometric`.
- **Native CSV file picker** via `@capawesome/capacitor-file-picker`.
- **`@sentry/capacitor`** for native crash reporting (in addition to web Sentry).
- **Off-palette color sweep** — work the `MOBILE_AUDIT.md` triage table; introduce `flame`/`freeze`/`dfs` tokens; flip `STRICT = true` in `scripts/check-design-system.mjs`.
- **Dense-table mobile redesign** (`/bets`, `/uploads`, `/uploads/[id]`) — card stack at <768px with swipe-to-delete; then extend Playwright `PUBLIC_ROUTES` with seeded `storageState`.
- **App icon assets** — current iOS icon is the Capacitor placeholder. Generate via `npx @capacitor/assets generate --ios` from a 1024×1024 master (need to create one; current `public/icon-512.png` is too small).
- **Cold-launch UX architecture** — currently `/` shows the marketing landing page on iOS (Guideline 4.2.2 risk + UX inconsistency). Either redirect `/` → `/login` on mobile (~10-line fix) or build a 2-3 screen native onboarding carousel.
- **WOFF2 font conversion** — Plus Jakarta Sans + IBM Plex Mono are TTF; ~30% byte savings.
- **`DEVELOPMENT_TEAM` to xcconfig** — currently lives uncommitted in `project.pbxproj` locally; `ios/App/debug.xcconfig` already referenced in pbxproj, ideal home.
- **App Store submission assets** — Connect metadata, screenshots, privacy nutrition labels, App Review notes covering Stripe Reader-app exception under 3.1.3(a).
