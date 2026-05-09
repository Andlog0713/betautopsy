# IOS_POLISH.md

**Project:** BetAutopsy iOS app polish — from web-feeling to native-feeling
**Started:** 2026-05-08
**Target:** App Store submission ready
**Owner:** Andrew (solo)
**Last updated:** 2026-05-08 (initial scaffold)

---

## How to use this file

This is the single source of truth for the iOS polish project. Both Andrew and Claude Code reference and update this file across sessions.

Repo-wide progress lives in `PROGRESS.md`. iOS polish lives here.

**For Claude Code:** When you start a session on this project, your first action is to read this entire file. Then run `git status && git branch --show-current && git log --oneline -5` and update CURRENT STATE below. Identify which PR is in flight from CURRENT FOCUS. Do not proceed past whatever phase that PR is in. After every commit, append to the SESSION LOG and check the relevant boxes. Never skip the verification gate on any PR — that gate exists because Andrew's calibration miss in PR 2 of the perf work shipped a regression that wasn't caught until production.

**For Andrew:** CC owns CURRENT STATE — it writes the block on session start after running `git status`. You read it. Add to DECISION LOG when you make a call CC asked about. Add to CALIBRATION LOG when something didn't work the way it was supposed to.

---

## NORTH STAR

The single test of done: open the app cold on a physical iPhone, tap any tab, get usable content visible in under 100ms. Hit Cmd+R-equivalent (force quit + cold reopen), see cached data appear in under 800ms.

These are felt-time targets, not metrics. They are measured with a stopwatch, not a route table. A First Load JS drop that doesn't move the felt-time number does not count as progress.

**Specific targets per surface:**

| Surface | Current (2026-05-08) | Target | Measure how |
|---|---|---|---|
| Cold app open (force quit → dashboard data visible) | ~5s | <800ms | Stopwatch on physical iPhone |
| Tab tap → content visible | 1-2s | <100ms | Stopwatch |
| Pull-to-refresh response | n/a | <300ms armed → resolved | Stopwatch |
| Mutation feedback (e.g. "mark won") | 1-3s with spinner | instant + background sync | Visual |
| Sheet open (filter, share) | n/a | smooth, no jank | 60fps in Xcode Instruments |
| Number animation (PnL change) | none | spring + flash | Visual |

If any PR closes without moving these numbers, that PR is incomplete regardless of what shipped.

---

## CURRENT STATE

```
Branch: claude/ios-pr2-app-shell (renamed from system-set claude/ios-app-shell-setup-JREXo per Andrew's call; matches IOS_POLISH naming convention)
Latest commit on branch: pending (Phase 0 recon doc commit lands next; iOS-PR-1 verification doc commit 38fe8f0 carries forward)
Latest commit on main: ce65792 fix(ios): iOS-PR-1 fix-forward — restore landing scroll, kill pinch-zoom (iOS-PR-1 verification doc commit not yet merged)
Active CC session: iOS-PR-2 Phase 0 recon resolved — 4 decisions answered, doc commit landing; phase plan being surfaced for Andrew's review
Last verified on iPhone: 2026-05-08 (iOS-PR-1 + fix-forward both pass: landing scrolls, no pinch-zoom, all original gate items green)
DUNS requested: not yet
Apple Developer enrollment: not started
```

CC updates this on session start, after running `git status && git branch --show-current && git log --oneline -5`. Andrew reads it.

---

## CURRENT FOCUS

**This PR:** iOS-PR-2 — App shell architecture
**Phase:** Phase 2 + 2.5 + 2.6 + 2.7 shipped pending push. Phase 2 iPhone test came back 2 PASS (B layoutId, D display:none) + 2 PARTIAL FAIL (A safe-area cramped, C long-press text-selection). Phase 2.7 fixes both: +10px paddingBottom for breathing room above home indicator; per-button `NO_SELECT_STYLE` for the iOS long-press selection-menu suppression. typecheck + build:mobile clean. Awaiting Andrew's re-test of A and C only.
**Branch:** `claude/ios-pr2-app-shell`
**Blocking:** Andrew's iPhone re-test of A (safe-area breathing room) and C (long-press selection menu suppressed). B and D already passed in Phase 2 test, no re-verification needed.
**Next action:** Andrew rebuilds + reruns on iPhone (`npm run ios:build && npm run ios:open`), taps the Shell Preview pill, long-presses a tab label to confirm no copy menu, eyeballs the bottom padding against Pikkit. If A and C pass, Phase 2 verification gate closes and CC starts Phase 3 (Phase 3 recon prerequisite: debug + fix React #418/#423 landing-page hydration errors filed under iOS-PR-2 Risks).

Update this block when PR status changes.

---

## WORKFLOW PROTOCOL

These rules exist because they prevent specific failure modes from earlier in the project. Don't relax them.

**One PR at a time.** No parallel CC sessions on different PRs from this project. If a session is running PR 2, don't start PR 3 in another tab. Multiple parallel sessions on related work caused branch chaos in earlier perf work. One session, one PR, until merged.

**One branch per PR.** Branch names are `claude/ios-pr<N>-<short-slug>`. Examples below in the PR ROADMAP. Don't merge into other people's branches mid-flight; don't push to main directly except as the final ship.

**Recon before edits.** Every PR prompt starts with a Phase 0 read-only recon. CC reads relevant files, surfaces decisions Andrew needs to make, then stops and waits for "go." This caught the AuthGuard `useAuthState` vs `useUser` issue cleanly. Skip recon and you ship a regression.

**Felt-time verification before merge.** No PR merges to main until Andrew has tested on a physical iPhone and updated the NORTH STAR table with new numbers. The reload test that caught the 12s bug only worked because Andrew ran it before merging — verification gates are not optional.

**Commit per phase.** Each PR has internal phases. Commit at each phase boundary so bisecting is possible. Bad commits inside a PR cost minutes; bad merges to main cost a deploy + revert.

**No assumed cleanup.** If a CC session reports "pushed X" — verify with `git log --oneline origin/<branch> -3` before celebrating. Lost the better part of an hour earlier today on a fetch issue masquerading as a hallucination.

**Stash before switching.** When switching CC worktrees or branches, `git stash push -m "<context>"` first. Uncommitted iOS xcode changes and package-lock churn are the most common dirty-state culprits.

**Update this file at every commit.** CC appends to SESSION LOG. CC checks boxes in the relevant PR's checklist. CC updates CURRENT FOCUS when phase changes.

---

## PR ROADMAP

Six PRs, in dependency order. Estimated 8-10 working days total. Each PR is independently shippable but later PRs depend on earlier infrastructure.

```
iOS-PR-1 (foundation)  →  iOS-PR-2 (app shell)  →  iOS-PR-3 (caching)  →  iOS-PR-4 (haptics)
                                                ↘                          ↘
                                                   iOS-PR-5 (visual polish)  →  iOS-PR-6 (last mile)
```

Logical dependency, not parallelism — CC sessions still run serial per WORKFLOW PROTOCOL.

Status legend: `[ ]` not started · `[~]` in progress · `[!]` blocked · `[x]` done · `[v]` verified on iPhone

---

### iOS-PR-1 — Capacitor + cold-start foundation

**Status:** `[v]` Verified (2026-05-08, physical iPhone)
**Branch:** `claude/ios-pr1-cold-start` (merged) + `claude/ios-pr1-fix-scroll-zoom` (fix-forward, merged `ce65792`)
**Estimated:** 0.5 day · **Actual:** ~0.5 day (with one fix-forward)
**Depends on:** Nothing
**Goal:** Kill the 5s cold open before any architectural changes. **Achieved on landing surface (sub-1s); dashboard cold-load deferred to PR-2 + PR-3.**

**Phases (commit per phase — Phase 4 is the highest-risk piece and runs last so auth-storage verification isn't poisoned by earlier-phase regressions):**

**Phase 1 — `capacitor.config.ts` + viewport + global CSS** (lowest risk, easy revert) — **shipped `978e377`, fix-forward `ce65792`**
- [v] `capacitor.config.ts`: `ios.contentInset: 'never'`, ~~`scrollEnabled: false`~~, `allowsLinkPreview: false`, `preferredContentMode: 'mobile'`, `backgroundColor: '#0D1117'` (scrollEnabled reverted in fix-forward — broke landing-page scroll; iOS-PR-2 will reintroduce once per-screen scroll containers exist)
- [v] `capacitor.config.ts`: `plugins.SplashScreen.launchShowDuration: 0` (explicit; `launchAutoHide: false`, `backgroundColor: '#0D1117'`, `showSpinner: false` already in place)
- [v] Viewport: confirmed existing `<meta>` already includes `viewport-fit=cover` plus `maximum-scale=1.0, user-scalable=no` — no change needed (NB: iOS WKWebView ignores user-scalable=no since iOS 10; pinch-zoom prevention now handled by globals.css `touch-action: pan-x pan-y` + `<ZoomGate>` JS belt-and-suspenders)
- [v] Global CSS additions: `-webkit-tap-highlight-color: transparent` on html, `-webkit-touch-callout: none` + `overscroll-behavior-y: contain` on body, `font-size: max(16px, 1rem)` on raw input/textarea/select, `touch-action: manipulation` on button/a/[role=button], `touch-action: pan-x pan-y` on html/body (added in fix-forward to block pinch-zoom)

**Phase 2 — Splash screen hook + double-rAF** — **shipped `c3821ed`**
- [v] Replace `<SplashHider>`'s single `useEffect` with double `requestAnimationFrame` to hide splash after first commit (avoids capacitor#960 white flash). Component name + import sites unchanged.

**Phase 3 — Sentry defer + AuthProvider lazy fetch** (Stripe item moot — see below) — **shipped `c3b0d29`**
- [v] Defer `Sentry.init()` by 1s via `setTimeout` in `sentry.client.config.ts`. Keep `@sentry/nextjs`. Errors in first 1s not captured (acceptable tradeoff).
- [v] AuthProvider rewritten: synchronous first-render seed from `ba-auth-cache-v1` (24h TTL); new context exposes `{ state, revalidate, signOut }`. Marketing pages cold-start with zero auth network. AuthGuard triggers `revalidate()` on dashboard mount; login/signup fire it after successful auth; `useAuthSignOut()` clears cache + sets anon BEFORE the supabase.auth.signOut network call so post-redirect destinations see correct anon state. 401 on getUser/profile fetch → clear cache + drop to anon.
- [v] 5 call sites migrated: login, signup, NavBar signOut, DashboardShell signOut, settings (signOut + delete-account).
- [v] ~~Move Stripe.js out of root layout; only `loadStripe()` on checkout route~~ — **moot.** `@stripe/stripe-js` is not installed in this repo. Checkout already redirects to a Stripe-hosted page via `openCheckoutUrl()` (Capacitor Browser → SFSafariViewController). No client Stripe SDK is bundled. Confirmed in Phase 0 recon.

**Phase 4 — Preferences adapter + Supabase `auth.storage` wiring** (highest-risk: wrong adapter shape → users logged out on next launch — and PR-1 ends here) — **shipped `cad0f78`**
- [v] Build `preferencesStorage` adapter (`lib/preferences-storage.ts`) using `@capacitor/preferences@^8.0.1`. Each method dynamic-imports the plugin per project pattern; static import of the adapter module from `supabase-browser.ts` is cheap. Plugin code only loads on mobile (web branch DCE'd).
- [v] Wire adapter into `createBrowserSupabaseClient()`'s mobile branch as `auth.storage`. Web branch untouched.

**Phase 5 — REMOVED.** Per Andrew's call (2026-05-08): no production users, no TestFlight, only Andrew's own physical iPhone. Anyone testing post-PR-1 can log in fresh — Preferences storage populates on first login. No `migrateAuthFromLocalStorage()` needed.

**Fix-forward (post-merge iPhone test surfaced 2 regressions, fixed on `claude/ios-pr1-fix-scroll-zoom`, merged `ce65792`):**
- [v] Revert `ios.scrollEnabled: false` (was killing landing-page scroll because no inner scroll container exists pre-PR-2)
- [v] `touch-action: pan-x pan-y` on html + body in globals.css (block pinch-zoom CSS layer)
- [v] New `<ZoomGate>` component preventDefaults `gesturestart`/`gesturechange`/`gestureend` (block pinch-zoom JS layer; required because WKWebView ignores user-scalable=no)

**Verification gate (passed 2026-05-08 on physical iPhone):**
- [v] Cold open <1.5s on landing — actually sub-1s (interim target; NORTH STAR <800ms achieved cumulatively across PR-1 through PR-3)
- [v] No white flash on launch
- [v] No console errors on first launch
- [v] Fresh install → log in → force-quit → cold reopen: session persists (Phase 4 Preferences adapter works)
- [v] Uninstall + reinstall: lands on logged-out state (no token leak across installs)
- [v] Landing page scrolls (fix-forward Bug 1)
- [v] Pinch-zoom blocked everywhere including nav bar (fix-forward Bug 2)
- [v] NORTH STAR cold-open number updated below
- Dashboard first-load 6-7s noted as **expected, not a PR-1 regression** — addressed by PR-2 (app shell, removes per-tab cold-mount) + PR-3 (caching + parallel SWR queries).

**Decisions logged in DECISION LOG:** branch rename, Sentry approach, AuthProvider laziness pattern, Phase 5 removal, Stripe-item-moot
**Calibration notes:** WORKFLOW-PROTOCOL skip caught (override + 2 regressions); see CALIBRATION LOG entries dated 2026-05-08.

---

### iOS-PR-2 — App shell architecture

**Status:** `[ ]` Not started
**Branch:** `claude/ios-pr2-app-shell`
**Estimated:** 2 days
**Depends on:** iOS-PR-1 merged
**Goal:** Replace Next.js routing with single client-rendered tab shell. **5 tabs** (Home/Reports/Upload/Bets/Settings — matches existing NativeTabBar, stays inside iOS HIG cap of 5) mounted simultaneously, switched via `display: none/flex`. Marketing landing on web `/` untouched; iOS `/` switches to AppShell via build-target gate.

**Phases (commit per phase; mirrors PR-1's structure — Phase 5 is the architectural flip and runs after the shell is proven):**

**Phase 1 — Foundation (lowest risk, easy revert)** — *shipped pending push*
- [x] `npm install zustand@^4.5` (now `^4.5.7` in deps; framer-motion@^12.38.0 already present)
- [x] `lib/tab-store.ts` — zustand store: `active`, `stacks`, `scrollY`, `wasEverActive`, `setActive`, `push`, `pop`, `popAll`, `setScroll`. `TabId` union typed to the 5 tabs (`dashboard | reports | upload | bets | settings`). `Screen` shape: `{ id, component: ScreenComponent, params }`. Includes `getActiveTab()` non-React helper.
- [x] `hooks/useScrollMemory.ts` — ref-based hook (consumer attaches to existing scroll container, no layout refactor). Restores from `useTabStore.getState().scrollY[cacheKey]` on mount via rAF (defers to layout pass to avoid clamp-to-0). Throttles writes via rAF.
- [x] `lib/screen-prefetch.ts` — `prefetchScreen(component)` + `prefetchScreens()` for both pushable routes. Dedupes via in-module `Set`; swallows errors (real navigation surfaces them via Phase 4's PageStack boundary).
- [x] Typecheck clean. No rendered output yet — bisect point: store/hook API frozen.

**Phase 2 — Shell skeleton (moderate risk; renders but no real tab bodies)** — *shipped pending push*
- [x] `components/shell/TabBar.tsx` — bottom tab bar, 5 lucide icons (LayoutDashboard, FileText, Plus, List, Settings) reading TAB_IDS from the store, active stroke 2.25 + scalpel color / inactive stroke 1.75 + fg-dim, `m.span layoutId="tabbar-active-hairline"` for the cross-tab indicator slide, `paddingBottom: env(safe-area-inset-bottom)`, `triggerHaptic('light')` on every tap (same-tab tap is a no-op for setActive but keeps the haptic for responsiveness). `role="tablist"`/`role="tab"`/`aria-selected`/`aria-label` for accessibility.
- [x] `components/shell/AppShell.tsx` — `<LazyMotion features={domAnimation}>` wrapping a flex column that holds 5 `<section role="tabpanel">` siblings (one per tab) plus `<TabBar />` at the bottom. Hide/show via `flex` vs `hidden` Tailwind classes (Tailwind's display utilities are mutually exclusive so conditional class composition works cleanly). Each section gets `paddingTop: var(--safe-area-top)` for notch/Dynamic Island clearance. Phase 3 swaps each placeholder for the real tab body.
- [x] `app/shell-preview/page.tsx` + `app/shell-preview/ShellPreviewClient.tsx` — temporary preview route at `/shell-preview` so Andrew can spot-check the shell on physical iPhone before Phase 5's `app/page.tsx` gate flip. Server page exports `metadata.robots: noindex`; client wrapper does `dynamic(() => import('@/components/shell/AppShell'), { ssr: false })`. **Both files deleted in Phase 5.**
- [x] Typecheck clean. Bisect point: shell renders, tab tap switches active state, hairline indicator animates between tabs via layoutId. App still routes via Next as today; Phase 3 wires real tab bodies.

**Phase 2.5 — TabBar touch-down haptic (Andrew-requested fix-forward 2026-05-09)** — *shipped pending push*
- [x] `components/shell/TabBar.tsx`: switched haptic from `onClick` (touch-up) to `onTouchStart` (touch-down). iOS WKWebView fires `touchstart → touchend → click` so the haptic now lands on first finger contact, matching Robinhood/iOS native tab-bar feel where the buzz precedes the visual transition. setActive stays on `onClick` so a touch that drags off (touchcancel — no `click` fires) doesn't switch tabs. Used raw `onTouchStart` rather than framer-motion's `onTapStart` to avoid wrapping the button in `m.button` and any LazyMotion-features-included edge cases — same touch-down event, simpler. PR-4's full `<PressableButton>` work still ships separately; this is just the TabBar tap pulled forward so Phase 2's iPhone test doesn't get a misleading "no" from touch-up haptic timing.
- [x] Typecheck clean. Build:mobile pending verification before commit.

**Phase 2.6 — Visible nav affordance to /shell-preview (iPhone-test unblocker, 2026-05-09)** — *shipped pending push*
- [x] `components/dev/ShellPreviewLink.tsx`: client component, fixed top-right pill (below the NavBar floating pill, above page content), `next/link` to `/shell-preview`, low-contrast styling (`text-fg-dim/80`, `border-border-subtle`, `bg-base/80`, mono 10px, 0.15em tracking, uppercase). Self-gates on `window.Capacitor?.isNativePlatform?.()` per Andrew's literal Phase 2.6 spec — runtime check matches what's verifiable in Safari Web Inspector on the actual device (rather than `isMobileApp()` from `lib/platform.ts`). SSR-safe via `useState(false)` + post-mount `useEffect` flip. Web users see nothing (first paint returns null; post-hydrate the gate stays false because `window.Capacitor` is undefined in browsers).
- [x] Mounted in `app/page.tsx` once, just after `<NavBar />` + `<ScrollToHash />`. Single import + single render — both deleted in Phase 5 along with the route + the component file.
- [x] Reason this exists: 4 navigation strategies failed on iPhone (`location.href = '/shell-preview'`, with and without trailing slash, `window.location.assign`, `capacitor://localhost/shell-preview/`) — all bounced to landing or 404'd. Capacitor's WKWebView with `iosScheme: 'https'` + `hostname: 'localhost'` apparently has routing semantics that the Safari-Web-Inspector-console nav can't satisfy. A `next/link` from inside the bundled JS sidesteps this entirely — Next's client router knows the static export's URL space.
- [x] Typecheck clean. Build:mobile clean (verification before commit).

**Phase 2.7 — TabBar polish from Phase 2 iPhone test (2 partial fails surfaced)** — *shipped pending push*
- [x] Phase 2 iPhone test results (Andrew on physical iPhone via the new top-right pill from Phase 2.6):
  - **A safe-area: PARTIAL FAIL** → fixed in 2.7. Tab bar cleared the home indicator but labels visually touched the white line. Pikkit reference has clear breathing room between labels and the indicator. Added 10px on top of `env(safe-area-inset-bottom)` (mid-range of Andrew's 8-12px guidance). The OS-reserved safe-area zone is for the indicator's tap-region, not for visual breathing — additional padding is the right move.
  - **B layoutId hairline animation: PASS** → no change.
  - **C touch-down haptic: PARTIAL FAIL** → fixed in 2.7. Haptic correctly fires on touch-down; the bug was unrelated — long-pressing a tab label triggered iOS's text-selection "copy" menu. globals.css PR-1 sets `-webkit-touch-callout: none` on body, but inheritance doesn't propagate to button text content on iOS WKWebView. Added `NO_SELECT_STYLE` const (`WebkitUserSelect: 'none'`, `userSelect: 'none'`, `WebkitTouchCallout: 'none'`) applied as inline style directly on each tab button per Andrew's spec.
  - **D display:none scroll preservation: PASS** → instant tab switches confirmed (architectural; full validation lands once Phase 3 mounts real scrollable tab bodies).
- [x] `components/shell/TabBar.tsx`: `paddingBottom: calc(env(safe-area-inset-bottom) + 10px)` on the nav wrapper; new `NO_SELECT_STYLE` const applied inline on each button. One file, ~15 lines diff.
- [x] Typecheck clean. Build:mobile clean (verification before commit).

**Phase 3-6 — see Key Changes below (still pending Andrew's per-phase "go").**

**Key changes (file paths use repo convention — no `src/` dir):**
- [x] Install `framer-motion@^12.38.0` (already in deps; **imports use `from 'framer-motion'` not `motion/react`** — see CALIBRATION LOG 2026-05-09 for why) and `zustand@^4.5` *(Phase 1)*
- [ ] Extract current `app/page.tsx` body into `components/MarketingLanding.tsx` (refactor only, zero content change)
- [ ] `app/page.tsx` becomes a build-target gate: `if (isMobileBuild()) return <AppShell />; return <MarketingLanding />;`. AppShell loaded via `dynamic(..., { ssr: false })`. Top-level conditional uses `process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile'` (server component, build-time tree-shake; web preserves `metadata` + `revalidate` + SEO). Resolves the parked "Cold-launch UX architecture" item (PROGRESS.md) for native — Guideline 4.2.2 risk goes away. Phase 5 verification: run `@next/bundle-analyzer` on both builds; web build must contain `MarketingLanding` and not `AppShell`, mobile build must contain `AppShell` and not `MarketingLanding`. Tree-shake leak in either direction = fix before declaring Phase 5 done.
- [x] `lib/tab-store.ts` — zustand store: `active`, `stacks`, `scrollY`, `setActive`, `push`, `pop`, `setScroll` *(Phase 1)*
- [x] `components/shell/AppShell.tsx` — `<LazyMotion features={domAnimation}>`, all 5 tabs as siblings with display gating (Tailwind `flex`/`hidden` conditional) *(Phase 2)*
- [ ] `components/shell/PageStack.tsx` — per-tab nav stack with iOS push/pop animation, motion variants, `ease: [0.32, 0.72, 0, 1]`, duration 0.30-0.35s. Wired up to existing pushable detail routes only: `/uploads/[id]` and `/admin/reports/[id]`. **No BetDetail/ReportDetail extraction in PR-2** — bets/reports list pages keep their inline detail UI; that refactor belongs to a later mobile-first IA redesign PR (provisionally iOS-PR-8).
- [x] `hooks/useScrollMemory.ts` — preserves scroll position per cacheKey *(Phase 1)*
- [x] `components/shell/TabBar.tsx` — bottom tab bar, `paddingBottom: env(safe-area-inset-bottom)`, lucide stroke 2.25 + scalpel color on active (lucide is outline-only, so no literal filled-glyph swap; visual treatment matches the existing NativeTabBar that PR-1 already shipped), `layoutId="tabbar-active-hairline"` indicator. Replaces `components/native/NativeTabBar.tsx` (Phase 5 deletes the old file once shell is wired). *(Phase 2)*
- [x] `lib/screen-prefetch.ts` — `prefetchScreens()` call 1.5s after shell mount, plus `onTouchStart` prefetch on rows for `/uploads/[id]` and `/admin/reports/[id]` *(Phase 1: prefetch module landed; the AppShell `setTimeout` + row `onTouchStart` wiring lands in Phase 2/4)*
- [ ] Migrate existing tab page bodies to `components/tabs/{Dashboard,Bets,Reports,Upload,Settings}Tab.tsx`. The `app/(dashboard)/<tab>/page.tsx` files become 1-line re-exports so the web router still works for direct URL hits.
- [ ] Replace every `next/link` and `useRouter` inside the AppShell with `useTabStore` calls (web `<Link>` outside the shell is untouched)
- [ ] Add `wasEverActive` lazy-init pattern on Bets and Reports tabs (lighter first-launch)
- [ ] Reintroduce `ios.scrollEnabled: false` in `capacitor.config.ts` once per-screen scroll containers exist inside AppShell (per the PR-1 fix-forward note — landing page no longer renders on native because of build-target gate, so the original blocker is gone)

**Verification gate (must pass before merge):**
- [ ] Tab tap → content visible <50ms (Safari Web Inspector Timeline)
- [ ] Switch from scrolled Bets → Settings → back: scroll position preserved
- [ ] Tab switch fires zero network requests (Network tab proof)
- [ ] Push BetDetail: ≥58fps slide-in (Xcode Instruments → Core Animation FPS)
- [ ] All tabs warm: <150MB resident memory on iPhone 12 (Xcode Instruments → Allocations)
- [ ] NORTH STAR tab-switch number updated below
- [ ] **Per-screen safe-area audit on physical iPhone** (Andrew-added 2026-05-09; calibration: PR-1 fix-forward proved viewport assumptions need device verification, not desk reasoning):
  - [ ] Every full-screen view checked: dashboard, bets, reports, upload, uploads, settings, pricing, admin/feedback, admin/reports, login, signup, reset-password, marketing landing, sample, blog index + post, faq, privacy, terms, share/[id]
  - [ ] Every pushed detail screen checked: uploads/[id], admin/reports/[id], plus any new BetDetail/ReportDetail surfaces this PR introduces
  - [ ] Every modal checked: AIConsentModal, NavBar mobile drawer, DashboardShell mobile slide-in nav, settings delete-account confirm
  - [ ] Every sheet checked: any vaul/native sheet surface introduced this PR (none planned in PR-2 — sheets land in PR-6, but if any ship early, audit them)
  - [ ] No content cut off by notch/Dynamic Island (top safe-area)
  - [ ] No buttons or interactive elements overlapping the home indicator (bottom safe-area)
  - [ ] Back/close buttons reachable and not under system UI (status bar, Dynamic Island, home indicator)
  - [ ] Forms tested with software keyboard open: primary CTA and submit button not covered (login, signup, reset-password, settings forms, upload field, any inline form in tabs)
  - [ ] Screenshots captured for any issue found, fixes applied before merge (no "documented and deferred" exceptions for safe-area regressions)

**Risks (track here as they materialize):**
- AppShell mount cost on first launch — if cold open regresses past iOS-PR-1's number, the lazy-init pattern is wrong
- Scroll memory across rotation / split view (low priority, document if broken)
- Deep links to specific tabs from notifications / Stripe return — requires `useTabStore.setActive()` on URL match
- **Phase 3 recon item (filed 2026-05-09 by Andrew during Phase 2 iPhone test):** Landing page (`app/page.tsx`) fires React #418 + #423 hydration errors in the Capacitor webview console. **Pre-existing** — not introduced by PR-2 work; surfaced during Phase 2 iPhone-test attempt. Most likely cause: SSR/static-prerender renders one auth state (anon — no localStorage at build time) while client hydrates with whatever's in `ba-auth-cache-v1` localStorage, and a downstream component (SmartCTALink, NavBar avatar, the streak Flame badge) renders different content for the two states. Phase 3 is when `useShellNav()` and the tab body migrations put eyes on the routing/auth flow — debug + fix during Phase 3 recon, before any tab body migration commits. Don't bundle the fix into a Phase 3 commit — surface as a separate fix-forward commit so the Phase 3 diff stays focused on the migration. Reference: React error codes #418 (hydration mismatch) + #423 (recovered hydration error via client re-render).

**Decisions logged in DECISION LOG:** branch rename, 5-tab cap, web/native build-target gating for app/page.tsx, PageStack scope (2 existing detail routes only), repo-convention file org, framer-motion-v12 reuse
**Calibration notes:** none yet

---

### iOS-PR-3 — SWR caching + optimistic mutations + bundle splitting

**Status:** `[ ]` Not started
**Branch:** `claude/ios-pr3-caching-mutations`
**Estimated:** 1.5 days
**Depends on:** iOS-PR-2 merged
**Goal:** Instant cached renders, instant-feeling mutations, initial JS <200KB gzipped.

**Key changes:**
- [ ] `localStorageProvider` for SWR — Map seeded synchronously from localStorage on cache construction
- [ ] Wire into `<SWRConfig>`: `focusThrottleInterval: 60_000`, `dedupingInterval: 5_000`, `keepPreviousData: true`, custom `shouldRetryOnError`
- [ ] Throttled flush: every 2s when dirty, plus `pagehide` and `visibilitychange` flushes
- [ ] `QuotaExceededError` handling: trim oldest half
- [ ] Filter ephemeral keys (`$req$`, `$ephemeral$`) from persistence
- [ ] Audit all `useSWR` call sites: replace `isValidating` checks with `isLoading`, add `keepPreviousData` to filterable queries, switch immutable data to `useSWRImmutable`
- [ ] Add `preload()` calls at module load for `/me`, `/bets/recent`
- [ ] Build `optimisticMutate` helper using SWR 2.x `mutate()` with `optimisticData` + `rollbackOnError: true` + `populateCache: true` + `revalidate: false`
- [ ] Convert all mutation sites (mark won/lost, delete upload, save filters, edit bet, etc.) to use it
- [ ] Pair successful mutations with `Haptics.notification(Success)` and Sonner success toast
- [ ] Pair failures with `Error` haptic and retry-action toast
- [ ] Install `@next/bundle-analyzer`, run `ANALYZE=true npm run build`
- [ ] Trim: `next/dynamic` recharts, `motion/react` with `LazyMotion + m`, `experimental.optimizePackageImports` for lucide-react and date-fns, defer Stripe, lazy Sentry

**Verification gate (must pass before merge):**
- [ ] Click any mutation → row updates instantly with no loading state, network shows request in background
- [ ] Force a 500 → row reverts within 200ms with error toast
- [ ] Tab switch on previously-loaded view: zero network requests, data renders synchronously on first frame
- [ ] Bundle analyzer: initial JS <200KB gzipped
- [ ] Cold reload (Cmd+R or app force-quit-and-reopen): cached data visible <800ms
- [ ] NORTH STAR cold-open and mutation-feedback numbers updated below

**Risks:**
- localStorage quota: iOS WKWebView clears at ~2.5MB. If `report_json` is in cache, this will trip. Strip heavy fields before persistence.
- Stale cache + revoked session: AuthGuard's `useUser()` should redirect on revalidation returning null user. Verify on a forced session expiry.

**Decisions logged in DECISION LOG:** none yet
**Calibration notes:** none yet

---

### iOS-PR-4 — Haptics + pressable buttons + tab bar polish

**Status:** `[ ]` Not started
**Branch:** `claude/ios-pr4-haptics`
**Estimated:** 1 day
**Depends on:** iOS-PR-2 merged (needs TabBar component)
**Goal:** Every touch feels tactile.

**Key changes:**
- [ ] Install `@capacitor/haptics@^7`
- [ ] `src/hooks/useHaptic.ts` — 30ms throttle floor, `Capacitor.isNativePlatform()` gate, methods `light/medium/heavy/selection/selectionStart/selectionEnd/success/warning/error`
- [ ] `src/lib/haptic.ts` singleton variant for non-React contexts
- [ ] `<PressableButton>` component: `whileTap={{ scale: 0.97, opacity: 0.9 }}`, spring transition (stiffness 700, damping 30, mass 0.4), fires haptic on `onTapStart` (not click)
- [ ] Variants: `primary | secondary | ghost | destructive`. Sizes: `sm (h-9) | md (h-11, the 44pt HIG min) | lg (h-14)`
- [ ] Replace every `<button>` in app shell with `<PressableButton>`
- [ ] TabBar: `selectionChanged()` on every tap, `whileTap={{ scale: 0.88 }}` on icon, outline → filled icon swap, teal hairline `layoutId` indicator, CSS red dot badge with `99+` overflow
- [ ] Same-tab tap fires `tab:reselect` CustomEvent for scroll-to-top
- [ ] Action sheet for bet card share/report/cancel using `@capacitor/action-sheet@^7`

**Haptic firing matrix:**

| Event | API | Why |
|---|---|---|
| Tab tap | `selectionChanged()` | Lighter than Light impact; matches iOS tab bars |
| Primary CTA press-IN | `impact(Light)` on `onTapStart` | Robinhood pattern |
| Toggle / segmented control | `selectionChanged()` | UISwitch parity |
| Successful mutation | `notification(Success)` | |
| Validation / failed mutation | `notification(Error)` | |
| Pull-to-refresh threshold | `impact(Medium)` once | iOS Mail snap |
| Sheet snap-point change | `selectionChanged()` | |
| Long-press / context menu | `impact(Medium)` | |
| Form input focus / keystroke | none | iOS HIG ban |

**Verification gate:**
- [ ] Every primary button press fires Light haptic at touch-down (not on release)
- [ ] Tab tap fires `selectionChanged` within 16ms
- [ ] Disabled buttons don't haptic
- [ ] Settings → Sounds & Haptics → System Haptics OFF → all calls become silent
- [ ] iPhone 15 Pro home indicator does not overlap content
- [ ] Same-tab tap triggers `tab:reselect`

**Decisions logged in DECISION LOG:** none yet
**Calibration notes:** none yet

---

### iOS-PR-5 — Visual polish: skeletons, animated numbers, toasts, empty states, typography

**Status:** `[ ]` Not started
**Branch:** `claude/ios-pr5-visual-polish`
**Estimated:** 1.5 days
**Depends on:** iOS-PR-3 merged
**Goal:** Match Robinhood/Coinbase visual quality at the forensic aesthetic.

**Key changes:**
- [ ] Tailwind type scale: `pnl-hero` (44px/700/-0.02em), `pnl-lg` (32px/700/-0.015em), `stat` (22px/600/-0.01em), `data` (14px/500), `caption` (11px/500/+0.04em), `micro` (10px/500/+0.12em)
- [ ] Global `.fx-number` utility: `tabular-nums slashed-zero`. Apply to every PnL, percent, count, odds, stake, payout
- [ ] Skeleton suite in `src/components/skeletons/`: `Skeleton.tsx` (`bg-white/[0.06] rounded-[2px] animate-pulse`), `BetRowSkeleton`, `BetListSkeleton`, `StatCardSkeleton`, `ChartSkeleton`
- [ ] Match real-component box dimensions exactly (CLS <0.05)
- [ ] `useMinimumLoadingTime(loading, 400)` hook to prevent flicker
- [ ] Replace spinners on cached views with skeletons; replace skeletons on user-initiated mutations with optimistic updates
- [ ] `<AnimatedNumber>` using motion's `useSpring` + `useTransform`, threshold-skip for <1% changes, flash-on-change (teal up, red down, 600ms settle to neutral)
- [ ] Use `<AnimatedNumber>` on dashboard hero PnL, 4-card KPI strip, post-mutation refreshes
- [ ] `<Sparkline>` component (recharts `<LineChart>` wrapped in `React.memo`, `isAnimationActive={false}`, no axes)
- [ ] `<EmptyState>` component: optional lucide icon at 28px stroke 1.5 in 4px-radius bordered box, optional teal mono uppercase tag (`tracking-[0.2em]`), JetBrains Mono title, Inter description, primary + optional secondary CTA
- [ ] Write 6-8 specific empty-state copy variants with noir verbs ("logged", "filed", "on record", "evidence", "autopsy")
- [ ] Sonner config: `position="top-center"`, `offset="calc(env(safe-area-inset-top) + 12px)"`, `unstyled: true` + classNames matching forensic aesthetic
- [ ] `notify.success/error/promise` wrappers that fire matching haptics
- [ ] Refit recharts PnL chart: `React.memo` with custom equality, `isAnimationActive={false}`, `useCallback` formatters, down-sample >200 points, `touch-action: pan-y` wrapper, `cursor` prop (dashed teal vertical line) for tap feedback, custom forensic `<Tooltip>`

**Verification gate:**
- [ ] Screenshot dashboard, desaturate it: hierarchy still legible (color discipline test)
- [ ] CLS <0.05 on Lighthouse mobile
- [ ] Numbers don't jitter horizontally during animation (60fps screen recording)
- [ ] Skeleton heights match real heights (toggle a flag, no layout shift)
- [ ] Toast clears notch on physical iPhone
- [ ] Chart tooltip fires on first tap on iOS Safari (recharts #444 workaround verified)
- [ ] Bundle delta <8KB gzipped (only Sonner; no countup, no skeleton lib)
- [ ] NORTH STAR row updated below — skeletons, animated numbers, and recharts refit affect felt time and must be measured

**Decisions logged in DECISION LOG:** none yet
**Calibration notes:** none yet

---

### iOS-PR-6 — Pull-to-refresh + bottom sheets + page-level polish + onboarding

**Status:** `[ ]` Not started
**Branch:** `claude/ios-pr6-last-mile`
**Estimated:** 1 day
**Depends on:** iOS-PR-4, iOS-PR-5 merged
**Goal:** Last mile of native feel.

**Key changes:**
- [ ] Install `vaul@^1.1.2`
- [ ] `<FilterSheet>` and `<BetDetailSheet>` (or push BetDetail through PageStack — choose per-screen)
- [ ] Snap points `[0.4, 0.92]`, `shouldScaleBackground`, drag handle, `pb-[env(safe-area-inset-bottom)]`, mono-uppercase title
- [ ] Wrap root layout body in `data-vaul-drawer-wrapper` with `background: black`
- [ ] Fire `haptic.light()` on open, `haptic.selection()` on snap-point change
- [ ] `usePullToRefresh` hook on motion's `drag="y"`, threshold 72px, max pull 120px
- [ ] Medium haptic at threshold cross, Light haptic on resolve, spring back stiffness 400 damping 30
- [ ] Wire pull-to-refresh to Bets, Reports, Uploads tabs (each calls relevant SWR `mutate()`)
- [ ] 4-card KPI strip on Dashboard top: Net P/L / ROI / Win Rate / CLV, each with `<AnimatedNumber>` + trend arrow + `<Sparkline>` + 1-word label
- [ ] Status segment chips on Bets feed: Pending / Settled / All
- [ ] Sport-icon scroll strip below status chips
- [ ] "More filters" → `<FilterSheet>`
- [ ] Refit bet cards: top row sportsbook + market + status pill; middle row event + selection in larger weight; bottom row stake/odds/payout right-aligned tabular-nums; subtle 3-4px left-border by status
- [ ] `tab:reselect` listener on Bets/Reports/Uploads scroll containers → scroll-to-top + Light haptic
- [ ] 5-screen onboarding flow: Welcome → Goal Selection → Account → Connect Data Source (CSV upload primary) → First Insight
- [ ] Slim progress bar at top, "Skip for now" from screen 4
- [ ] Defer notification permission until first alert created

**Verification gate:**
- [ ] Pull-to-refresh on Bets feed: spinner crosses threshold with Medium haptic, fires SWR revalidate, springs back smoothly
- [ ] FilterSheet drag handle works, snaps cleanly between snap points with haptic ticks, background recedes 5% with rounded corners
- [ ] KPI strip animates in numbers on dashboard mount
- [ ] Status chips switch instantly with no spinner
- [ ] Tap scrolled tab → scroll-to-top with light haptic
- [ ] Full onboarding complete in <90 seconds end-to-end on physical iPhone
- [ ] All NORTH STAR targets met

**Decisions logged in DECISION LOG:** none yet
**Calibration notes:** none yet

---

## DECISION LOG

Log every decision Andrew makes that CC asked about. Format: `YYYY-MM-DD · PR# · Decision · Rationale (if non-obvious)`. Future CC sessions consult this before re-asking.

```
2026-05-08 · n/a · Push for Linear-tier feel (Path B), not "ship as-is" · DUNS wait gives 1-2 weeks; want native-feeling app for App Store launch
2026-05-08 · n/a · Reference apps: Pikkit, Robinhood, BettingPros, Coinbase · Confirmed by Andrew
2026-05-08 · n/a · Open to new dependencies (Konsta, framer-motion alternatives, native plugins) · Andrew explicitly said "open to anything"
2026-05-08 · n/a · Speed and polish equal priority · Andrew explicitly said "both equally"
2026-05-08 · iOS-PR-1 · Branch renamed claude/capacitor-cold-start-foundation-uAmco → claude/ios-pr1-cold-start · Match IOS_POLISH.md naming convention; system-set worktree branch was a one-off artifact
2026-05-08 · iOS-PR-1 · Sentry: defer init by 1s via small client component, keep @sentry/nextjs · Full swap to @sentry/browser would lose web's server/edge auto-instrumentation; deferral captures the cold-start win at lower blast radius
2026-05-08 · iOS-PR-1 · AuthProvider: read cached state synchronously from localStorage on first render; defer network fetch (getUser/profile/snapshot) to AuthGuard mount only · Marketing pages don't need auth state at first paint; cached read prevents SmartCTALink flicker; standard fast-app pattern
2026-05-08 · iOS-PR-1 · Phase 5 removed (no migrateAuthFromLocalStorage) · No production users, no TestFlight, only Andrew on physical iPhone — anyone testing post-PR-1 can log in fresh
2026-05-08 · iOS-PR-1 · Stripe.js Phase 3 item marked moot · @stripe/stripe-js not installed; checkout already redirects via openCheckoutUrl() to Stripe-hosted page. No client Stripe SDK in bundle.
2026-05-08 · iOS-PR-1 · Use @capacitor/preferences@^8.0.1 (already installed) instead of spec's @^7 · Matches the rest of @capacitor/*@^8 deps
2026-05-08 · iOS-PR-1 · Keep existing viewport <meta> tag instead of migrating to Next 14 viewport export · Already includes viewport-fit=cover plus maximum-scale=1.0/user-scalable=no which the bare viewport export wouldn't preserve
2026-05-09 · iOS-PR-2 · Branch renamed claude/ios-app-shell-setup-JREXo → claude/ios-pr2-app-shell · Match IOS_POLISH naming convention; same artifact pattern as PR-1's system-set worktree branch
2026-05-09 · iOS-PR-2 · Tab count: 5 (Home/Reports/Upload/Bets/Settings) · iOS HIG caps tab bars at 5; Apple rejects more. Matches existing NativeTabBar. Upload History stays a desktop-only nav item — accessible via Uploads page on mobile (linked from Bets / Dashboard)
2026-05-09 · iOS-PR-2 · `app/page.tsx` build-target gating · On web `/` keeps marketing landing (SEO + paid-traffic untouched); on iOS `/` renders AppShell. Extract current page body into `components/MarketingLanding.tsx`, then `app/page.tsx` becomes `if (isMobileBuild()) return <AppShell />; return <MarketingLanding />;`. Resolves PROGRESS.md "Cold-launch UX architecture" parked item for native — Guideline 4.2.2 risk goes away because iOS users no longer land on the marketing page
2026-05-09 · iOS-PR-2 · Detail screens: PageStack infra + 2 existing routes only · `/uploads/[id]` and `/admin/reports/[id]` are the only real pushable detail routes today. Bets and Reports list pages keep their current inline detail UI for PR-2. BetDetail/ReportDetail extraction (with swipeable archetype cards etc.) belongs to a later mobile-first IA redesign PR (provisionally iOS-PR-8). Keeps PR-2 inside its 2-day estimate; avoids touching bets/page.tsx (832 lines) and reports/page.tsx (1025 lines) during the same PR that introduces zustand + motion + AppShell
2026-05-09 · iOS-PR-2 · File org: repo convention, no `src/` dir · `components/shell/{AppShell,TabBar,PageStack}.tsx`, `components/tabs/{Dashboard,Bets,Reports,Upload,Settings}Tab.tsx`, `lib/tab-store.ts` (zustand), `hooks/useScrollMemory.ts`, `lib/screen-prefetch.ts`, `components/MarketingLanding.tsx`. Existing `@/components/*`, `@/hooks/*`, `@/lib/*` tsconfig paths already resolve — no tsconfig change needed
2026-05-09 · iOS-PR-2 · Use existing `framer-motion@^12.38.0` instead of separate `motion@^12` install · Same package family (renamed in v12). Saves a dep install + dedup risk. **Amended 2026-05-09 Phase 2:** imports use `from 'framer-motion'` not `'motion/react'` — framer-motion v12.38's exports map doesn't include the `motion/*` subpaths (those ship in the separately-published `motion` npm package). See CALIBRATION LOG 2026-05-09 Phase 2.
```

When CC asks a multi-select / single-select question, paste the question and answer here verbatim.

---

## CALIBRATION LOG

When something didn't work the way it was supposed to. Future PRs reference this to avoid repeating mistakes.

```
2026-05-08 · Earlier perf work · "PR 2 server seed" was supposed to make dashboard reload instant via server-side hydration. Actually made it slower because async server component triggered Vercel function cold start (4s) on every request. Fix: ripped server seed, dashboard back to ○ Static, reload dropped from 5-12s to <1s. Lesson: optimizations that "should" work need felt-time verification, not just route-table check.

2026-05-08 · Earlier perf work · Tier 1 perf commits assumed lost because `git branch --contains df9caeb` errored. Real cause: local repo had not fetched the branch yet. `git fetch origin` resolved. Lesson: always `git fetch --all` before assuming work is missing.

2026-05-08 · Earlier perf work · CC reported "pushed 0c53d8d" but local `git log` didn't show it. Real cause: pushed to remote feature branch, local main hadn't pulled. Lesson: trust CC reports of pushes, verify with `git log origin/<branch>` not `git log main`.

2026-05-08 · Earlier perf work · Celebrated PR 2 data layer based on diff metrics (route table flips, KB drops). Reality: dashboard reload still 12s. Lesson: every PR's verification gate must include felt-time stopwatch on physical iPhone, not just `next build` output.

2026-05-08 · iOS-PR-1 · Andrew explicitly overrode the WORKFLOW PROTOCOL "no merge to main without iPhone verification" rule and instructed CC to ship iOS-PR-1 to main (514171b → main as fast-forward) before testing on a physical iPhone. CC pushed back twice (per-protocol), Andrew confirmed twice. Risk surface logged at merge time: (a) Phase 4 Preferences adapter shape — if get/set/removeItem return type or null-handling is wrong, every existing logged-in user gets silently signed out on next launch with no detection short of a real device launch; (b) Phase 3 ba-auth-cache-v1 round-trip — if a field is dropped or mistyped, SmartCTALink misroutes for authed users on cold start of marketing pages. Both undetectable in typecheck/build. Watch the next CC session's "Last verified on iPhone" date in CURRENT STATE: if iOS-PR-2 starts before that's filled, this skip likely caused a regression no one's caught yet.

2026-05-09 · iOS-PR-2 Phase 2 · Phase 0 DECISION LOG entry "Use existing framer-motion@^12.38.0 (import from `motion/react` per Motion v12) — supported in v12.38" was wrong about the import path. Verified at Phase 2 start: `framer-motion`'s `package.json` exports map only ships `framer-motion`, `framer-motion/m`, `framer-motion/dom`, etc. — there is no `motion/react` re-export. The `motion` npm package and the `framer-motion` npm package are separate publications that both wrap the same source; you have to install `motion` separately to use `motion/react`. Going with `from 'framer-motion'` for all PR-2 imports — consistent with the 5 existing motion imports in the repo (AnimatedSection, AnimatedCounter, ui/number-ticker, ui/tabs, ui/text-generate-effect) and avoids a duplicate-package dedup risk where two motion contexts could fail to share `layoutId` lookups. The DECISION LOG entry has been amended in the Phase 2 commit. Lesson: when a spec says "use X package, supported in installed Y", verify the exports map before committing the decision — `package.json` of the actual installed version is the source of truth, not the spec author's intent.

2026-05-08 · iOS-PR-1 · Verification-gate skip caught us as predicted. Andrew tested on iPhone post-merge and surfaced 3 issues: (1) Landing page (app/page.tsx) doesn't scroll. Phase 1's `ios.scrollEnabled: false` killed WKWebView's outer scroll; the marketing landing has no inner scroll container, so users got stuck at top of viewport. Fix-forward: revert scrollEnabled, restore default true. iOS-PR-2's app shell will reintroduce per-screen scroll containers so we can re-disable. (2) Pinch-zoom still works app-wide despite viewport `user-scalable=no` — Apple has ignored that token in WKWebView since iOS 10 for accessibility reasons. Fix-forward: `touch-action: pan-x pan-y` on html and body in globals.css + `<ZoomGate>` JS belt-and-suspenders that calls preventDefault on iOS-proprietary `gesturestart`/`gesturechange`/`gestureend` events. Native iOS Settings → Accessibility → Zoom still works (operates above webview layer). (3) First-login dashboard load was 6-7s (NOT a blocker, expected). Pre-PR-3 caching the dashboard's SWR queries fire serially against cold cache, plus AuthGuard's revalidate(). PR-2 (app shell) and PR-3 (caching + parallel queries) address — see NORTH STAR row.

Lessons: (a) The "every PR's verification gate must include felt-time stopwatch on physical iPhone" rule from earlier work proved itself again — both regressions were trivially visible on device but silent in build/typecheck. Cost was a fix-forward branch, ~30 min. (b) `scrollEnabled: false` is a per-screen decision, not an app-wide one. Don't disable until per-screen containers exist. (c) `user-scalable=no` is ineffective in iOS WKWebView; future "disable a viewport behavior" work needs CSS + JS layers, not just the meta tag.
```

Append entries as they happen. Don't delete old ones — they're the lessons.

---

## OUTSIDE DEPENDENCIES

State of things that block App Store submission, not the polish work itself.

- [ ] Apple Developer Program enrollment (paid, $99/year — required for TestFlight + App Store)
- [ ] DUNS number for LLC-based enrollment (parked per project memory; estimate 1-2 weeks)
- [ ] App Store Connect record created
- [ ] App icon, splash screen finalized at all required sizes
- [ ] App Store screenshots (6.7" iPhone required)
- [ ] App Store metadata: name, subtitle, description, keywords
- [ ] Privacy nutrition labels declaration
- [ ] Age rating questionnaire (likely 17+ given gambling-adjacent)
- [ ] Sign in with Apple — N/A unless OAuth added (currently email/password only — see project memory)
- [ ] Stripe vs IAP decision (Path B "reader app" vs Path A IAP integration)
- [ ] Push notifications (project memory flags as needed for App Review Guideline 4.2)
- [ ] Face ID / biometric login (project memory flags as needed for Guideline 4.2)
- [ ] App Review submission notes prepared explaining "behavioral analysis, not gambling/sportsbook"

---

## OPEN QUESTIONS

Questions waiting on Andrew's input. CC reads this before asking — if an answer is here, don't re-ask.

```
(none yet)
```

When CC has an open question, append it here with timestamp and PR context. When Andrew answers, move it to DECISION LOG.

---

## SESSION LOG

Append-only record of every CC session. Format:

```
YYYY-MM-DD HH:MM · PR# · Branch · Summary · Commits
```

Examples:

```
2026-05-08 14:30 · iOS-PR-1 · claude/ios-pr1-cold-start · Phase 0 recon complete, 3 decisions surfaced for Andrew · (none)
2026-05-08 16:45 · iOS-PR-1 · claude/ios-pr1-cold-start · Capacitor config + splash screen fix shipped · abc1234, def5678
```

Format hint: include CC session URL (claude.ai/code/session_*) when available so you can re-open the session if needed.

Actual log:

```
2026-05-08 (initial scaffold) · n/a · main · IOS_POLISH.md created · n/a
2026-05-08 · iOS-PR-1 · claude/ios-pr1-cold-start · Phase 0 recon complete: 6 decisions surfaced and resolved (branch rename, Sentry approach, AuthProvider laziness, Phase 5 removal, Stripe-moot, preferences@^8). Branch renamed from claude/capacitor-cold-start-foundation-uAmco. IOS_POLISH.md updated with new scope. · 57a0d9d
2026-05-08 · iOS-PR-1 · claude/ios-pr1-cold-start · Phase 1 shipped: capacitor.config.ts ios block (contentInset/scrollEnabled/allowsLinkPreview/preferredContentMode/backgroundColor) + explicit SplashScreen.launchShowDuration: 0 + globals.css touch rules (tap-highlight, touch-callout, overscroll-behavior, 16px input floor, touch-action manipulation). · 978e377, fb89686
2026-05-08 · iOS-PR-1 · claude/ios-pr1-cold-start · Phase 2 shipped: SplashHider switched from single useEffect to double-rAF chain so SplashScreen.hide() only fires after first paint (capacitor#960 white-flash fix). Component name + import sites unchanged. · c3821ed
2026-05-08 · iOS-PR-1 · claude/ios-pr1-cold-start · Phase 3 shipped: Sentry init deferred 1s via setTimeout in sentry.client.config.ts; AuthProvider rewritten with synchronous ba-auth-cache-v1 seed (24h TTL) + new {state,revalidate,signOut} context API; AuthGuard fires revalidate on dashboard mount; 5 call sites migrated to useAuthSignOut/useAuthRevalidate (login/signup/NavBar/DashboardShell/settings). Marketing pages now cold-start with zero auth network. · c3b0d29
2026-05-08 · iOS-PR-1 · claude/ios-pr1-cold-start · Phase 4 shipped (PR-1 feature-complete): preferencesStorage adapter (lib/preferences-storage.ts) wired into Supabase mobile-branch as auth.storage. Survives WKWebView localStorage eviction; web branch untouched. Awaiting verification gate on physical iPhone. · cad0f78
2026-05-08 · iOS-PR-1 · main · iOS-PR-1 fast-forward merged to main (1d6a7ac → 88d25ff). Sandbox proxy returned 403 on direct push from CC; Andrew completed FF + push from his laptop. Verification gate NOT run pre-merge — iPhone test still owed. · 88d25ff
2026-05-08 · iOS-PR-1 fix-forward · claude/ios-pr1-fix-scroll-zoom · iPhone test post-merge surfaced 2 bugs + 1 expected slow-load. Fix-forward branch off main: revert capacitor.config.ts `ios.scrollEnabled` (was breaking landing-page scroll); add `touch-action: pan-x pan-y` to html/body in globals.css + new `<ZoomGate>` component that preventDefaults on iOS gesturestart events to kill pinch-zoom (user-scalable=no is ignored by WKWebView since iOS 10). 6-7s first-login dashboard noted in NORTH STAR — addressed by PR-2/PR-3. · ce65792 (merged via PR #13 + MCP rebase, since direct main push is sandbox-blocked)
2026-05-08 · iOS-PR-1 verification · claude/ios-pr1-verified-docs · Andrew confirmed iPhone test passes after fix-forward landed. Both regressions fixed (landing scrolls, pinch-zoom blocked). All original gate items green. Doc-only branch off main (ce65792): iOS-PR-1 status flipped to [v] Verified, all phase + verification-gate boxes upgraded to [v], NORTH STAR row filled in (sub-1s landing cold-open, 6-7s first-login dashboard noted as PR-2/PR-3 territory), CURRENT FOCUS pivots to iOS-PR-2 (app shell). · 38fe8f0
2026-05-09 · iOS-PR-2 · claude/ios-app-shell-setup-JREXo · Phase 0 recon complete (no commits yet — pure read + doc updates). Read app/page.tsx (LandingPage with NavBar/SmartCTALink/sections), app/(dashboard)/layout.tsx (thin SWRProvider+AuthBootstrap+DashboardShell wrapper, post-PR-3a static), DashboardShell.tsx (web sidebar + mobile slide-in + native NativeTabBar, AuthGuard wrap), components/NavBar.tsx (marketing public NavBar with auth state), components/native/NativeTabBar.tsx (5 tabs: Home/Reports/Upload/Bets/Settings — NOT 6 as spec assumed), capacitor.config.ts. Mapped routing: 11 dashboard routes (dashboard, upload, bets, uploads, uploads/[id], uploads/compare, reports, settings, pricing, admin/feedback, admin/reports, admin/reports/[id]) + auth (login/signup/reset-password) + 11 public marketing routes. Found 5 vs 6 tab discrepancy (mobile=5, desktop=6 with Upload History added), motion already installed as framer-motion@^12.38.0, zustand NOT installed, no src/ dir (repo uses components/hooks/lib). 4 decisions surfaced via AskUserQuestion. Added per-screen safe-area audit checklist (~10 sub-items) to PR-2 verification gate per Andrew's session-open instruction. CURRENT STATE + CURRENT FOCUS updated. · (none yet)
2026-05-09 · iOS-PR-2 · claude/ios-pr2-app-shell · Phase 0 recon decisions logged + PR-2 spec rewritten. Andrew answered 4 questions: 5 tabs (not 6), build-target gate at app/page.tsx (web=marketing, native=AppShell, MarketingLanding extracted), PageStack infra + 2 existing detail routes only (no BetDetail/ReportDetail extraction in PR-2 — deferred to provisional iOS-PR-8 IA redesign), repo-convention file paths (no src/). Branch renamed claude/ios-app-shell-setup-JREXo → claude/ios-pr2-app-shell. Updated PR-2 Key Changes section (file paths, scope, build-target gate, NativeTabBar replacement, capacitor.config scrollEnabled re-enable). Added 7 entries to DECISION LOG (rename, tab count, gating, scope, file org, framer-motion-v12 reuse, MarketingLanding extraction). · f6746a9
2026-05-09 · iOS-PR-2 · claude/ios-pr2-app-shell · Phase 1 (Foundation) shipped. `npm install zustand@^4.5` (resolved to ^4.5.7). New files: `lib/tab-store.ts` (zustand store with TabId union + Screen type + ScreenComponent enum + active/stacks/scrollY/wasEverActive state + setActive/push/pop/popAll/setScroll actions + getActiveTab() helper for non-React contexts), `hooks/useScrollMemory.ts` (ref-based hook so consumers attach to existing scroll containers without layout refactor; rAF-deferred restore avoids clamp-to-0 on still-mounting content; rAF-throttled writes), `lib/screen-prefetch.ts` (prefetchScreen + prefetchScreens for both pushable detail routes; in-module Set dedupes; swallows errors so a failed prefetch doesn't poison cache for real navigation). Typecheck clean. No rendered output — bisect point is store/hook API frozen. Awaiting Andrew's spot-check before Phase 2. · ffad2c0
2026-05-09 · iOS-PR-2 · claude/ios-pr2-app-shell · Phase 2 (Shell skeleton) shipped. New files: `components/shell/TabBar.tsx` (5 lucide tabs reading TAB_IDS, m.span layoutId hairline indicator with spring transition, env(safe-area-inset-bottom) padding, triggerHaptic('light') on every tap, role=tablist/tab+aria-selected/label), `components/shell/AppShell.tsx` (LazyMotion+domAnimation wrapper, h-screen flex column, 5 absolute-positioned sibling sections with conditional flex/hidden Tailwind classes for display gating, var(--safe-area-top) padding-top per panel for notch clearance, placeholder copy per tab), `app/shell-preview/page.tsx` + `app/shell-preview/ShellPreviewClient.tsx` (temporary preview route at /shell-preview with metadata.robots noindex; uses dynamic({ssr:false}) so static export doesn't pre-render zustand state). Both shell-preview files deleted in Phase 5. Found and corrected motion/react import path during Phase 2 — framer-motion v12.38 exports map doesn't ship motion/* subpaths; logged in CALIBRATION LOG. All shell imports use `from 'framer-motion'`, matching the 5 existing motion call sites in the repo. Typecheck clean. `npm run build:mobile` clean (exit 0); `/shell-preview` route at 1.35 kB / 158 kB First Load JS, no other route sizes changed. Bisect point: shell renders, tab tap switches active state, hairline animates between tabs. · a069e6e
2026-05-09 · iOS-PR-2 Phase 2.5 · claude/ios-pr2-app-shell · TabBar haptic moved from onClick (touch-up) to onTouchStart (touch-down) per Andrew's call before Phase 2 iPhone test. One-file change in `components/shell/TabBar.tsx`. Used raw `onTouchStart` rather than framer-motion's `onTapStart` (no `m.button` wrap; same touch-down event; simpler — same Robinhood-pattern outcome). setActive stays on `onClick` so a drag-off touchcancel doesn't switch tabs. Typecheck clean; build:mobile clean. PR-4's full <PressableButton> work still ships separately. · 4ec489b
2026-05-09 · iOS-PR-2 Phase 2.6 · claude/ios-pr2-app-shell · Visible nav affordance to /shell-preview. Andrew tried 4 console-nav strategies on iPhone (`location.href = '/shell-preview'` ±trailing slash, `window.location.assign`, `capacitor://localhost/shell-preview/`); all bounced to landing or 404'd. Capacitor's WKWebView routing semantics with `iosScheme: https` + `hostname: localhost` apparently don't resolve the static export's URL space from a Web Inspector console. Switching strategy: new `components/dev/ShellPreviewLink.tsx` (client component, fixed top-right pill below NavBar, low-contrast mono styling, gated on `window.Capacitor?.isNativePlatform?.()` per Andrew's literal spec, SSR-safe via post-mount useEffect flip) mounted once in `app/page.tsx`. Web users see nothing. Native users see a tappable pill that uses `next/link` to navigate — sidesteps the WKWebView routing issue entirely because Next's client router knows the URL space. Both files (component + the one-line mount) deleted in Phase 5 alongside `/shell-preview`. Also: filed React #418/#423 landing-page hydration errors as a Phase 3 recon prerequisite under iOS-PR-2 Risks — pre-existing bug not introduced by PR-2; hypothesis is auth-state hydration mismatch from `ba-auth-cache-v1` localStorage. Typecheck clean; build:mobile clean. · 7743288
2026-05-09 · iOS-PR-2 Phase 2.7 · claude/ios-pr2-app-shell · TabBar polish from Phase 2 iPhone test. Andrew reported 2 PASS (B layoutId hairline animation, D display:none instant tab switches) + 2 PARTIAL FAIL: (A) labels cramped against home-indicator white line — fixed by adding 10px above `env(safe-area-inset-bottom)` (mid of Andrew's 8-12px guidance). The OS-reserved safe-area zone covers tap-region only, not visual breathing — additional padding is the right move. Pikkit reference comparison was the trigger. (C) Long-press on a tab label fired iOS's text-selection "copy" menu even though touch-down haptic was correct. globals.css PR-1 sets `-webkit-touch-callout: none` on body but inheritance doesn't propagate to button text content on iOS WKWebView — rules have to land on the actual long-pressable element. Added `NO_SELECT_STYLE` const (`WebkitUserSelect: 'none'`, `userSelect: 'none'`, `WebkitTouchCallout: 'none'`) inline on each tab button. One file, components/shell/TabBar.tsx, ~15 lines diff. Typecheck clean; build:mobile clean. Awaiting Andrew's re-test of A and C only — B and D passed in Phase 2 test, no re-verification needed. · (this commit)
```

---

## NORTH STAR — POST-PR MEASUREMENT TABLE

Update this after every PR's verification step. Felt-time numbers only. Stopwatch on physical iPhone.

| PR | Date | Cold open | Tab switch | Reload | Mutation feel | Notes |
|---|---|---|---|---|---|---|
| baseline | 2026-05-08 | 5s | 1-2s | 12s | 1-3s | Pre-PR-2-rip-out, physical iPhone via Xcode signing |
| post Tier 1 + PR 2 + rip-server-seed | 2026-05-08 | ? | ? | <1s on web | ? | iPhone test deferred — only verified on web localhost |
| iOS-PR-1 | 2026-05-08 | <1s (landing) / 6-7s (first-login dashboard) | 1-2s | not separately measured | not separately measured | Landing surface hits target; dashboard cold-load is the SWR-serial-queries floor that PR-3 caching is designed to flatten. Tab switch 1-2s unchanged from baseline — that's PR-2's territory (the AppShell's `display: none/flex` swap removes per-tab cold mount). Verified on physical iPhone after fix-forward `ce65792` shipped: landing scrolls, pinch-zoom blocked everywhere, all original gate items pass. |
| iOS-PR-2 | | | | | | |
| iOS-PR-3 | | | | | | |
| iOS-PR-4 | | | | | | |
| iOS-PR-5 | | | | | | |
| iOS-PR-6 | | | | | | |

If a row's number doesn't move forward of the row above it, that PR didn't deliver perceived speed. Investigate before moving to next PR.

---

## REFERENCES

- Full research playbook: see project artifact "BetAutopsy iOS Polish Playbook"
- Capacitor docs: https://capacitorjs.com/docs
- SWR docs: https://swr.vercel.app/docs
- Motion docs: https://motion.dev/docs
- Vaul docs: https://github.com/emilkowalski/vaul
- iOS HIG (haptics): https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- Project memory in Claude.ai (see Andrew's brand rules, design system, etc.)
- Notion Command Center: page ID `3335964c-daf2-81ca-a60b-f0410df9dd12`

---

## INSTRUCTIONS FOR CC AT END OF SESSION

Before stopping or context-switching, do these in order:

1. Run `git status && git log --oneline -3` and update CURRENT STATE
2. If a phase completed, check the relevant boxes in the PR checklist
3. If a verification gate passed, update the NORTH STAR table
4. If Andrew answered a question, move it from OPEN QUESTIONS to DECISION LOG
5. If something didn't work as expected, append to CALIBRATION LOG
6. Append a SESSION LOG entry with date, PR, branch, one-line summary, commits
7. If the PR is fully shipped: update CURRENT FOCUS to next PR

If you started a session and any of those entries from the previous session are missing, the previous session ended badly. Note it in CALIBRATION LOG and continue.
