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

## Current branch: `main` (post SNAPSHOT-REDACTION-POLICY merge)

### Done this session: SNAPSHOT-REDACTION-POLICY: unified snapshot redaction (PR #56, squash `b775e8e`)
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

## Parked / next branch
- Mega-PR B (iOS rendering of new engine output, including `triggerEvent` reader)
- Web pricing reconcile (post-iOS launch, separate project)
- "23 pages" iOS paywall copy reconcile (separate iOS-repo task)
- DONE (ENGINE-FLOOR): `vitest.config.ts` now excludes `**/.claude/**`
- v1.1 test-infra: `autopsy-engine.test.ts` snapshots are TZ-dependent on the commit machine (88 local TZ / 58 UTC on clean main); pin TZ or switch to UTC formatting

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
