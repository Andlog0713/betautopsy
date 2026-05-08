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
Branch: claude/ios-pr1-cold-start (renamed from claude/capacitor-cold-start-foundation-uAmco at session start)
Latest commit on branch: 1d6a7ac chore(claude): record cp-from-upload permission grant
Active CC session: claude/ios-pr1-cold-start (Phase 0 recon complete, Phase 1 starting)
Last verified on iPhone: never
DUNS requested: not yet
Apple Developer enrollment: not started
```

CC updates this on session start, after running `git status && git branch --show-current && git log --oneline -5`. Andrew reads it.

---

## CURRENT FOCUS

**This PR:** iOS-PR-1 — Capacitor + cold-start foundation
**Phase:** Phase 3 shipped (`c3b0d29`); awaiting Andrew's go-ahead for Phase 4 (Preferences adapter — final phase)
**Branch:** `claude/ios-pr1-cold-start`
**Blocking:** Nothing
**Next action:** Andrew reviews Phase 3 commit; CC starts Phase 4 on go

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

**Status:** `[ ]` Not started
**Branch:** `claude/ios-pr1-cold-start`
**Estimated:** 0.5 day
**Depends on:** Nothing
**Goal:** Kill the 5s cold open before any architectural changes.

**Phases (commit per phase — Phase 4 is the highest-risk piece and runs last so auth-storage verification isn't poisoned by earlier-phase regressions):**

**Phase 1 — `capacitor.config.ts` + viewport + global CSS** (lowest risk, easy revert) — **shipped `978e377`**
- [x] `capacitor.config.ts`: `ios.contentInset: 'never'`, `scrollEnabled: false`, `allowsLinkPreview: false`, `preferredContentMode: 'mobile'`, `backgroundColor: '#0D1117'`
- [x] `capacitor.config.ts`: `plugins.SplashScreen.launchShowDuration: 0` (explicit; `launchAutoHide: false`, `backgroundColor: '#0D1117'`, `showSpinner: false` already in place)
- [x] Viewport: confirmed existing `<meta>` already includes `viewport-fit=cover` plus `maximum-scale=1.0, user-scalable=no` — no change needed
- [x] Global CSS additions: `-webkit-tap-highlight-color: transparent` on html, `-webkit-touch-callout: none` + `overscroll-behavior-y: contain` on body, `font-size: max(16px, 1rem)` on raw input/textarea/select, `touch-action: manipulation` on button/a/[role=button]

**Phase 2 — Splash screen hook + double-rAF** — **shipped `c3821ed`**
- [x] Replace `<SplashHider>`'s single `useEffect` with double `requestAnimationFrame` to hide splash after first commit (avoids capacitor#960 white flash). Component name + import sites unchanged.

**Phase 3 — Sentry defer + AuthProvider lazy fetch** (Stripe item moot — see below) — **shipped `c3b0d29`**
- [x] Defer `Sentry.init()` by 1s via `setTimeout` in `sentry.client.config.ts`. Keep `@sentry/nextjs`. Errors in first 1s not captured (acceptable tradeoff).
- [x] AuthProvider rewritten: synchronous first-render seed from `ba-auth-cache-v1` (24h TTL); new context exposes `{ state, revalidate, signOut }`. Marketing pages cold-start with zero auth network. AuthGuard triggers `revalidate()` on dashboard mount; login/signup fire it after successful auth; `useAuthSignOut()` clears cache + sets anon BEFORE the supabase.auth.signOut network call so post-redirect destinations see correct anon state. 401 on getUser/profile fetch → clear cache + drop to anon.
- [x] 5 call sites migrated: login, signup, NavBar signOut, DashboardShell signOut, settings (signOut + delete-account).
- [x] ~~Move Stripe.js out of root layout; only `loadStripe()` on checkout route~~ — **moot.** `@stripe/stripe-js` is not installed in this repo. Checkout already redirects to a Stripe-hosted page via `openCheckoutUrl()` (Capacitor Browser → SFSafariViewController). No client Stripe SDK is bundled. Confirmed in Phase 0 recon.

**Phase 4 — Preferences adapter + Supabase `auth.storage` wiring** (highest-risk: wrong adapter shape → users logged out on next launch — and PR-1 ends here)
- [ ] Build `preferencesStorage` adapter using already-installed `@capacitor/preferences@^8.0.1` (spec said `^7`; we keep `^8` to match the rest of `@capacitor/*@^8`)
- [ ] Wire adapter into `createBrowserSupabaseClient()`'s mobile branch as `auth.storage`. Web branch untouched.

**Phase 5 — REMOVED.** Per Andrew's call (2026-05-08): no production users, no TestFlight, only Andrew's own physical iPhone. Anyone testing post-PR-1 can log in fresh — Preferences storage populates on first login. No `migrateAuthFromLocalStorage()` needed.

**Verification gate (must pass before merge):**
- [ ] Cold open <1.5s on physical iPhone (interim target — NORTH STAR is <800ms, achieved cumulatively across iOS-PR-1 through iOS-PR-3) (stopwatch)
- [ ] No white flash on launch
- [ ] No console errors on first launch
- [ ] Fresh install → log in → force-quit → cold reopen: session persists (proves Preferences `auth.storage` wired correctly)
- [ ] Uninstall + reinstall: lands on logged-out state (proves no stale tokens leak across installs)
- [ ] NORTH STAR cold-open number updated below

**Decisions logged in DECISION LOG:** branch rename, Sentry approach, AuthProvider laziness pattern, Phase 5 removal, Stripe-item-moot
**Calibration notes:** none yet

---

### iOS-PR-2 — App shell architecture

**Status:** `[ ]` Not started
**Branch:** `claude/ios-pr2-app-shell`
**Estimated:** 2 days
**Depends on:** iOS-PR-1 merged
**Goal:** Replace Next.js routing with single client-rendered tab shell. All 6 tabs mounted simultaneously, switched via `display: none/flex`.

**Key changes:**
- [ ] Install `motion@^12` (use `motion/react`, not `framer-motion`) and `zustand@^4.5`
- [ ] `app/page.tsx` becomes thin `dynamic(() => import('@/shell/AppShell'), { ssr: false })` wrapper
- [ ] `src/shell/useTabStore.ts` — zustand store: `active`, `stacks`, `scrollY`, `setActive`, `push`, `pop`, `setScroll`
- [ ] `src/shell/AppShell.tsx` — `<LazyMotion features={domAnimation}>`, all 6 tabs as siblings with `display: isActive ? 'flex' : 'none'`
- [ ] `src/shell/PageStack.tsx` — per-tab nav stack with iOS push/pop animation, motion variants, `ease: [0.32, 0.72, 0, 1]`, duration 0.30-0.35s
- [ ] `src/shell/useScrollMemory.ts` — preserves scroll position per cacheKey
- [ ] `src/shell/TabBar.tsx` — bottom tab bar, `paddingBottom: env(safe-area-inset-bottom)`, lucide outline → filled on active, `layoutId` hairline indicator
- [ ] `src/screens/lazy.ts` — lazy-loaded BetDetail/ReportDetail with `prefetchScreens()` call 1.5s after shell mount, plus `onTouchStart` prefetch on rows
- [ ] Migrate existing tab page bodies to `src/tabs/*.tsx`
- [ ] Replace every `next/link` and `useRouter` inside the shell with `useTabStore` calls
- [ ] Add `wasEverActive` lazy-init pattern on Bets and Reports tabs (lighter first-launch)

**Verification gate (must pass before merge):**
- [ ] Tab tap → content visible <50ms (Safari Web Inspector Timeline)
- [ ] Switch from scrolled Bets → Settings → back: scroll position preserved
- [ ] Tab switch fires zero network requests (Network tab proof)
- [ ] Push BetDetail: ≥58fps slide-in (Xcode Instruments → Core Animation FPS)
- [ ] All 6 tabs warm: <150MB resident memory on iPhone 12 (Xcode Instruments → Allocations)
- [ ] NORTH STAR tab-switch number updated below

**Risks (track here as they materialize):**
- AppShell mount cost on first launch — if cold open regresses past iOS-PR-1's number, the lazy-init pattern is wrong
- Scroll memory across rotation / split view (low priority, document if broken)
- Deep links to specific tabs from notifications / Stripe return — requires `useTabStore.setActive()` on URL match

**Decisions logged in DECISION LOG:** none yet
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
```

---

## NORTH STAR — POST-PR MEASUREMENT TABLE

Update this after every PR's verification step. Felt-time numbers only. Stopwatch on physical iPhone.

| PR | Date | Cold open | Tab switch | Reload | Mutation feel | Notes |
|---|---|---|---|---|---|---|
| baseline | 2026-05-08 | 5s | 1-2s | 12s | 1-3s | Pre-PR-2-rip-out, physical iPhone via Xcode signing |
| post Tier 1 + PR 2 + rip-server-seed | 2026-05-08 | ? | ? | <1s on web | ? | iPhone test deferred — only verified on web localhost |
| iOS-PR-1 | | | | | | |
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
