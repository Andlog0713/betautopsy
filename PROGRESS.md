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

## Pushback expected
- Refuse requests that violate the design system.
- Refuse architecture changes (RN rewrite, remote-URL switch, monorepo restructure) unless explicitly scoped in the user's prompt.
- When the user proposes adding a feature mid-branch that doesn't fit the branch scope, suggest parking it.

---

## Current branch: `claude/update-app-website-sync-vuQB7`

### In progress
- (none — Tier 1 perf items all shipped; awaiting user direction on Tier 2)

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
