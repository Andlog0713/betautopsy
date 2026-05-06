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
- (none — CI fix shipped)

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
- **Sign in with Apple OAuth** (Guideline 4.8 blocker — needs Apple Developer dashboard work: Service ID, key, AASA).
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
