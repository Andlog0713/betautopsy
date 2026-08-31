# BetAutopsy — web repo agent instructions

Read this first, every session. `PROGRESS.md` is the running log of what has
been done and what is in flight; read it second. This file is the rules,
that file is the state.

---

## What this repo is

- The web app (Next.js App Router) serving betautopsy.com, plus the API the
  iOS app calls.
- The shipping iOS app is **native SwiftUI**, in a separate repo
  (`betautopsy-ios`). Do not edit it from here. Do not assume its behavior.
- This repo still contains legacy Capacitor build scaffolding
  (`build:mobile` / `ios:build` scripts, `isMobileBuild()` / `isMobileApp()`
  checks, `NEXT_PUBLIC_BUILD_TARGET=mobile` branches). Whether that path is
  still built by anyone is unverified. Treat as legacy; do not delete
  without asking.

## Product

BetAutopsy analyzes a bettor's uploaded history and reports behavioral
patterns. It is **not** a sportsbook, tipster, or picks service. It never
predicts outcomes, never places bets, never holds funds.

- Single full report, **$19.99**, one-time (`STRIPE_REPORT_PRICE_ID`).
  Verified against Stripe. No discount mechanism exists — the AUTOPSY50
  coupon and `STRIPE_LAUNCH_PROMO` were deleted 2026-08-17. Do not
  reintroduce either without an explicit decision.
- Extra report for existing Pro subscribers, $4.99
  (`STRIPE_EXTRA_REPORT_PRICE_ID`). Verified.
- Pro tier exists on the backend only. Four accounts have
  `subscription_tier='pro'`; two have `stripe_customer_id: null` by design
  (comped family accounts). **Never** treat null `stripe_customer_id` on a
  Pro account as invalid state to "fix."
- Pro is not marketed on any public surface. Don't add it back.

---

## The five rules that keep getting violated

These were each learned the expensive way. Check every change against them.

### 1. No fabricated data. Ever.
Every number on a marketing page, in a report, or in copy must derive from a
real engine call or a real database value. Padding a fixture to make two
displays agree is fabrication. Bumping a hardcoded counter is fabrication.
Inventing a denominator ("/quarter", "280 bets") the data never computed is
fabrication.

### 2. No numeric field on the wire may originate from the model.
If the engine can compute it, the engine computes it and the assembly code
overrides whatever Claude/GPT returned, regardless of what the prompt asked
for. If the engine cannot compute it, the field is **omitted**, not
estimated. The model writes prose and makes selections (which findings are
worth surfacing). It never writes a number.

Already fixed four violations of this: `session_analysis`, `edge_profile`,
`strategic_leaks`, `biases_detected[].estimated_cost`. Don't add a fifth.

No model-authored number, threshold, predicate, or categorical action may
become an adoptable control rule. The engine owns the action type, scope,
trigger, thresholds, evidence, and sufficiency checks. The model may select
and explain supported actions, but it cannot define them.

When an action makes a historical financial claim, that claim must agree
with the matching deterministic counterfactual over the same frozen cohort.

### 3. Unknown is a valid value.
Never convert unknown into a default during normalization. Not unknown time
to midnight. Not cash-out to void. Not missing sportsbook to an inferred
book. Not absent category to impulse/researched. Not unknown timezone to an
assumed hour. An absent or null field is a correct answer.

### 4. A redaction sentinel is not a value.
Snapshot payloads carry `*_visibility` tags (`visible`, `redacted_dollar`,
`redacted_percent`, `redacted_text`, `hidden`). A zeroed dollar with a
`redacted_dollar` tag is **not** `$0` — rendering it literally is how the
"+$0 P&L next to a real negative ROI" bug happened. Any surface rendering a
number must consult its visibility tag. Where possible, omit the field
entirely rather than zeroing it, so no sentinel exists to leak.

### 5. Install-time warnings get resolved, not stepped over.
`EBADENGINE` and similar. Local and CI differ by design (different Node
versions, different OS). A warning that's survivable locally can be a hard
crash in CI or production. This rule exists because a jsdom EBADENGINE
warning was ignored locally and crashed CI.

---

## Workflow

- **One PR per stage.** Open it and stop. Andrew merges. Never auto-merge.
- **Outline before code** for anything touching: wire format, DB schema, the
  CSV parse path, or more than three files. Skip the outline for single-file
  copy and metadata fixes.
- **Build must be green after every commit**, not just at PR time.
- **Step 0 recon before any code.** Verify branch state with `git`/`gh`
  before assuming. Local `main` is frequently stale.
- **Wire changes are additive-optional.** iOS decodes this API tolerantly
  and is mid-App-Store-submission. Adding a required field or removing one
  breaks a shipping client you cannot touch. If a change cannot be additive,
  stop and flag it. Precedent: `lateNightKnown`, `isNew`, `settlement_type`
  were all added as optional siblings rather than widening existing types.

### Serial rebase rule for `lib/autopsy-engine.ts`
Two branches independently inserting code at the same point in this file
silently ate each other's functions and took production down (2026-08-18,
PRs #97/#99). Any branch touching this file is **rebased on the previous
engine-touching branch**, never independently branched from a common stale
ancestor. Everything outside that file can run in parallel.

### Verify fixes discriminate
When adding a regression test for a bug, revert the fix and confirm the test
actually fails. Several tests in this repo were vacuous until this was
enforced — `vitest.config.ts` pins `process.env.TZ = 'UTC'`, which made
timezone tests structurally unable to detect the bug they guarded.

---

## Copy rules

- **No em dashes.** Anywhere. Code, comments, copy, commit messages, PR
  bodies.
- "heated" for sessions, never "tilt" in product UI (tilt is fine in
  blog/SEO).
- "emotion score" for the composite metric.
- Age gate is **18+**, never 21+.
- Helpline: **1-800-MY-RESET**, text 800GAM, chat ncpgambling.org/chat.
  1-800-GAMBLER is stale wherever it appears.
- No urgency framing. No "MOST POPULAR" badges without real percentage data.
- No clinical or diagnostic language ("psychological patterns", "cognitive
  biases" as product framing). Behavioral and statistical framing instead.
- No percentile or cohort claims. There is no benchmark population. All
  percentile rendering was removed sitewide; don't reintroduce it.

## Design system

- Colors: yellow `#FACC15`, canvas `#0A0E12`, off-white `#EDEDF3`. Money
  red/green (`#FF4D4D` / `#00DC82`) reserved for dollar deltas only.
  (Retired: the V2 "Luminol" midnight/scalpel/bleed teal palette. Do not
  use.)
- Fonts: Plus Jakarta Sans (sans), IBM Plex Mono (mono). No Inter.
- No backdrop-blur, no box-shadow, no gradient text.
- Max 6px radius (`rounded-md`). No `rounded-2xl` / `rounded-3xl`.
- No off-palette colors: amber, orange, cyan, purple, pink, fuchsia,
  emerald, sky, rose, indigo, violet.
- No bento grids, glassmorphism, shadcn defaults, emoji in UI strings, or
  hamburger menus on any viewport.
- `npm run check:design` enforces the mechanically detectable rules in
  strict mode. It rejects off-palette utility colors, retired V2 colors and
  fonts, backdrop blur, radii over 6px, gradient background utilities, and
  shadows.

---

## Gates

Run all four before every commit:

```
npx tsc --noEmit
npx vitest run
npm run build
npm run check:design
```

E2E: `npx playwright test` (mobile-regression suite, 39 cases across three
iPhone viewports).

## Infrastructure

- **Vercel**: project `prj_r0wFxPCTLG4TTtfxq1eLlmd8Rl3X`, team
  `team_xCaAzK3aMfuYVN88D27yxpRT`. npm, all three GitHub workflows, and
  Vercel use Node `24.x`, enforced through `package.json` and `.npmrc`.
- **Supabase**: project `eekubnadizmtuhnxzcig`. Free tier — it auto-paused
  once and took login down for eight days (2026-08-05 to 08-13). Migrations
  live in `supabase/migrations/`.
- **Stripe**: account `acct_1TEMwS7KVOLEKyGy`.

## Things that are Andrew's, not yours

Flag these and keep moving; don't try to do them:
- Merging PRs
- Applying migrations to production without explicit go-ahead
- Supabase dashboard toggles and plan changes
- Vercel environment variables and settings
- Anything requiring the iOS repo
- Testing checkout with a real card

## Pushback expected

- Refuse changes that violate the design system.
- Refuse architecture changes (React Native rewrite, remote-URL switch,
  monorepo restructure) unless explicitly scoped in the prompt.
- If an instruction would make an honest claim dishonest, say so instead of
  following it. This has happened and the pushback was correct both times.
