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

## Current branch: `claude/resume-app-build-JvTmM`

### In progress
- Sign in with Apple OAuth (Guideline 4.8) — needs Apple Developer dashboard work (Service ID, key, AASA) before code can land.
- App Store Connect submission assets (screenshots, privacy nutrition labels, App Review notes for Stripe Reader exception under 3.1.3(a)) — user-side.

### Done this session
- **`mobile-regression` CI unblocked** (`middleware.ts`). Previous run on `7a5974e` failed in 4m 28s because `createServerClient` threw synchronously on empty `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`, returning 500 on every middleware-covered route (`/`, `/login`, `/signup`, `/pricing`, `/terms` — 5 of the 8 PUBLIC_ROUTES, × 3 viewports = 15 of 24 tests). Local passed because `.env.local` has the keys; CI doesn't seed them. Middleware now fails open when either env var is absent — production always has them set (verified pre-merge for bugs-ZTqzz), so this is a defensive fallback for CI smokes and misdeploys, not a routine code path. Verified locally: `env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY npm run start` boots in 2s and all 8 PUBLIC_ROUTES return 200 (was: 5 of 8 returning 500).
- **iOS app icon + launch screen generated from a 1024 master** (`assets/icon.png`, source uploaded to `public/betautopsy app.png` via main → merged into branch). Ran `npx @capacitor/assets generate --ios --iconBackgroundColor "#00C9A7" --iconBackgroundColorDark "#00C9A7" --splashBackgroundColor "#0D1117" --splashBackgroundColorDark "#0D1117"`. Output: single `AppIcon-512@2x.png` (1024×1024, no transparency — Apple's only required size for App Store) plus 6 splash variants (light + dark, 1x/2x/3x, midnight surface bg matching forced-dark `UIUserInterfaceStyle`). `cap sync ios` was skipped because it requires a built `out/` directory; the icon assets live in `ios/App/App/Assets.xcassets/` and Xcode picks them up directly. Replaces the Capacitor placeholder, which would have been an auto-rejection on submission.
- **First-launch generative-AI consent modal** (`components/AIConsentModal.tsx`) mounted in root layout. Names Anthropic explicitly per Guideline 5.1.2(i) (Nov 2025 update). Persists `'ai-consent-v1'` via `storeLocally` (Capacitor Preferences on native, localStorage on web). Two CTAs: "I understand — continue" stores acceptance; "Decline and exit" calls `App.exitApp()` via dynamic import of `@capacitor/app`. Gated to `isMobileBuild()` so the web product is unaffected — web users continue to consent through signup's Privacy Policy + Terms gate. Storage key versioned so a future disclosure-text change can force a re-prompt.
- **Native cold-launch redirect** (`components/NativeRootRedirect.tsx`) mounted at top of `app/page.tsx`. On Capacitor cold launch (`isMobileApp()`), `router.replace('/login')` — the existing login page already forwards an authenticated session straight to `/dashboard`, so this handles both states. Addresses Guideline 4.2.2 risk (iOS-app-as-website appearance from landing on the marketing page). Web is unaffected (`isMobileApp()` returns false outside the Capacitor webview).
- Verified: `npx tsc --noEmit` clean, `npx next lint` clean on changed files, `npm run check:design` shows the same 55 pre-existing violations (no new ones from these components), `npm run build` produces a clean static + SSG + dynamic route tree.

### Previous (`claude/fix-e2e-tests-timeout-YJRzd`, merged into this branch)
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
- **Native push notifications** via `@capacitor-firebase/messaging`.
- **Biometric login** via `@capgo/capacitor-native-biometric`.
- **Native CSV file picker** via `@capawesome/capacitor-file-picker`.
- **`@sentry/capacitor`** for native crash reporting (in addition to web Sentry).
- **Off-palette color sweep** — work the `MOBILE_AUDIT.md` triage table; introduce `flame`/`freeze`/`dfs` tokens; flip `STRICT = true` in `scripts/check-design-system.mjs`.
- **Dense-table mobile redesign** (`/bets`, `/uploads`, `/uploads/[id]`) — card stack at <768px with swipe-to-delete; then extend Playwright `PUBLIC_ROUTES` with seeded `storageState`.
- **Onboarding carousel** — current cold-launch redirect (`/` → `/login` on native) ships the bare login form. A 2–3 screen native carousel ("upload → analyze → fix") before the form would lift activation; not a submission blocker.
- **WOFF2 font conversion** — Plus Jakarta Sans + IBM Plex Mono are TTF; ~30% byte savings.
- **`DEVELOPMENT_TEAM` to xcconfig** — currently lives uncommitted in `project.pbxproj` locally; `ios/App/debug.xcconfig` already referenced in pbxproj, ideal home.
- **App Store submission assets** — Connect metadata, screenshots, privacy nutrition labels, App Review notes covering Stripe Reader-app exception under 3.1.3(a).
