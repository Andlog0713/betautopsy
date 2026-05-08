# BetAutopsy — Capacitor Bundled-Static Migration: Phase 0 Recon

> **Read this first.** The migration described in the prompt is already
> substantially shipped. The dual-target build infrastructure
> (`output: 'export'`, `NEXT_PUBLIC_BUILD_TARGET=mobile`,
> `lib/api-client.ts`, `getAuthenticatedClient`, `AuthGuard`,
> placeholder `generateStaticParams` for unbounded dynamic routes,
> CORS on `/api/*`, `iosScheme: 'https'` + `hostname: 'localhost'`,
> SFSafariViewController for Stripe) all landed across commits
> `f430311 → 542ed3b` on `main` (see `CAPACITOR_MOBILE_BUILD_STATUS.md`).
>
> This recon documents **current state vs. the stated goal**, calls
> out the remaining gaps, and surfaces decisions Andrew still owes.
> Per the prompt, ZERO files were modified. The only output is this
> document.

Branch inspected: `claude/capacitor-migration-recon-l0LuG`
(working tree clean; `git log` shows the last shipped work was the
Tier 1 perf branch, not new mobile work).

---

## Section 1: Current Capacitor configuration

### 1.1 `capacitor.config.ts`

| Field | Value |
|---|---|
| `appId` | `com.betautopsy.app` |
| `appName` | `BetAutopsy` |
| `webDir` | `out` (produced by `npm run build:mobile`) |
| `server.url` | **not set** — this is a bundled-static config, not remote-URL |
| `server.cleartext` | **not set** |
| `server.hostname` | `localhost` |
| `server.iosScheme` | `https` |
| `server.androidScheme` | `https` |
| `server.allowNavigation` | `['*.supabase.co', 'betautopsy.com', 'www.betautopsy.com']` |

> **Note on `iosScheme: 'https'` + `hostname: 'localhost'`:** the file
> documents this verbatim — using a custom URL scheme would have
> WKWebView report origin as `null` and break Supabase auth CORS
> preflight. The bundle is served from `https://localhost`, which has
> standard HTTPS CORS semantics.

### 1.2 Plugins listed in `capacitor.config.ts`

- `SplashScreen` — `backgroundColor: '#0D1117'`, `launchAutoHide: false`,
  `showSpinner: false` (hidden deterministically by `<SplashHider>`)
- `Keyboard` — `resize: 'body'`, `style: 'dark'`
- `StatusBar` — `style: 'dark'`, `backgroundColor: '#0D1117'`

### 1.3 `@capacitor/*` packages in `package.json`

| Package | Version |
|---|---|
| `@capacitor/app` | `^8.1.0` |
| `@capacitor/browser` | `^8.0.3` |
| `@capacitor/core` | `^8.3.0` |
| `@capacitor/filesystem` | `^8.1.2` |
| `@capacitor/haptics` | `^8.0.2` |
| `@capacitor/ios` | `^8.3.0` |
| `@capacitor/keyboard` | `^8.0.3` |
| `@capacitor/preferences` | `^8.0.1` |
| `@capacitor/push-notifications` | `^8.0.3` |
| `@capacitor/share` | `^8.0.1` |
| `@capacitor/splash-screen` | `^8.0.1` |
| `@capacitor/status-bar` | `^8.0.2` |
| `@capacitor/cli` (dev) | `^8.3.0` |

### 1.4 Platform directories

- `ios/` — **present** (root: `ios/App/App/`, `Info.plist`,
  `AppDelegate.swift`, `MainViewController.swift`,
  `PrivacyInfo.xcprivacy`, `Assets.xcassets`).
  Also `ios/App/debug.xcconfig`.
- `android/` — **NOT present** at repo root.

### 1.5 `Info.plist` audit

- `WKAppBoundDomains` — **NOT set.** No `WKAppBoundDomains` key
  exists. (Optional Apple feature; only required for in-app browser
  cookie isolation. Not a blocker.)
- `CFBundleURLTypes` / URL schemes — **NOT set.** No custom URL
  scheme is registered. **Implication:** there is currently no
  deep-link entry point. Stripe success redirects, OAuth callbacks,
  and share-link handoffs cannot bounce back into the app via a
  custom scheme today. Universal Links are also not configured (no
  AASA `applinks` mention anywhere).
- `UIUserInterfaceStyle = Dark` — set.
- `UIViewControllerBasedStatusBarAppearance` — `true`.
- `UISupportedInterfaceOrientations` — Portrait + LandscapeLeft +
  LandscapeRight (iPhone). All four on iPad.

### 1.6 Native iOS code

- `MainViewController.swift` — subclasses `CAPBridgeViewController`,
  enables `webView.allowsBackForwardNavigationGestures = true` in
  `capacitorDidLoad()`.
- `AppDelegate.swift` — stock Capacitor template. Forwards `open url`
  and `continue userActivity` to `ApplicationDelegateProxy.shared`,
  so the App plugin (`@capacitor/app`) can already observe deep
  links if/when a URL scheme is registered.

---

## Section 2: Build flag inventory

### 2.1 `IS_MOBILE_BUILD` / `isMobileBuild` / `isMobileApp` — every occurrence

The codebase has two parallel flags, defined in `lib/platform.ts`:
- `isMobileBuild()` — compile-time, reads `process.env.NEXT_PUBLIC_BUILD_TARGET`
- `isMobileApp()` — runtime, checks `window.Capacitor?.isNativePlatform()`
- `isWeb()` — convenience inverse of `isMobileApp()`

Files that consume one or both flags (excluding the definition in
`lib/platform.ts`):

| File | Line | Flag | What it controls |
|---|---|---|---|
| `next.config.js` | 3 | `NEXT_PUBLIC_BUILD_TARGET === 'mobile'` (literal) | Switches `output: 'export'` on, drops `headers()` + `redirects()` |
| `next.config.js` | 105 | same | Conditional spread |
| `app/layout.tsx` | 7, 161, 166, 180, 183 | `isMobileBuild()` | Tree-shakes `<TikTokPixel>`, `<MetaPixel>`, `<CookieConsent>` out of mobile bundle; tree-shakes in `<AIConsentModal>` for mobile |
| `app/(auth)/login/page.tsx` | 7, 112 | `isMobileApp()` | Hides web-only OAuth buttons inside the native app |
| `app/(auth)/signup/page.tsx` | 8, 163 | `isMobileApp()` | Same as login |
| `app/(dashboard)/DashboardShell.tsx` | 9, 112 | `isMobileApp()` | Native tab-bar layout vs. web header layout |
| `app/share/[id]/page.tsx` | 26 (`IS_MOBILE_BUILD = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile'`) | literal | Stub `generateStaticParams` for mobile, swap `<SharedReport>` for `<ShareRedirectMobile>` |
| `app/share/[id]/ShareRedirectMobile.tsx` | 5, 40 | `isMobileApp()` | Opens canonical URL in system browser via `_system` target |
| `app/(dashboard)/uploads/[id]/page.tsx` | 15 | literal `IS_MOBILE_BUILD` | Stub `generateStaticParams` for mobile |
| `app/(dashboard)/admin/reports/[id]/page.tsx` | 8 | literal `IS_MOBILE_BUILD` | Stub `generateStaticParams` for mobile |
| `components/AIConsentModal.tsx` | 5, 32 | `isMobileApp()` | Self-gates the modal at runtime |
| `components/GoogleAnalytics.tsx` | 2, 23 | `isMobileBuild()` | Inline GA bootstrap script changes per build target |
| `components/SplashHider.tsx` | (doc only) | `isMobileApp()` | Already gated inside `lib/native.ts` |
| `components/native/NativeTabBar.tsx` | 6, 20 | `isMobileApp()` | Returns `null` outside Capacitor webview |
| `lib/api-client.ts` | 1, 19, 44, 49 | `isMobileApp()` | Selects `https://www.betautopsy.com` base URL + Bearer token on mobile |
| `lib/native.ts` | many | `isMobileApp()` | Every plugin wrapper gates here |

### 2.2 `next.config.js` `output:` and mobile branches

```js
const isMobileBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';
…
...(isMobileBuild
  ? { output: 'export', trailingSlash: true }
  : { headers, redirects }),
```

Plus `experimental.serverComponentsExternalPackages: ['@anthropic-ai/sdk']`
which is benign on the mobile side (no Server Components run at
request time under `output: 'export'`).

### 2.3 `package.json` mobile-related scripts

```json
"build":        "next build"
"build:mobile": "sh scripts/build-mobile.sh"
"ios:build":    "npm run build:mobile && npx cap sync ios"
"ios:open":     "npx cap open ios"
"ios:run":      "npx cap run ios"
```

`scripts/build-mobile.sh` moves `app/api`, `app/og`, `app/blog/feed.xml`,
and `app/auth` to `_*_excluded_from_mobile` siblings, runs
`NEXT_PUBLIC_BUILD_TARGET=mobile next build`, and restores them via
`trap … EXIT INT TERM`.

### 2.4 Other env-var patterns

`NEXT_PUBLIC_IS_MOBILE` — **NOT used anywhere.** The codebase
standardized on `NEXT_PUBLIC_BUILD_TARGET=mobile`.

### 2.5 Conclusion

**The codebase is ~95% wired for dual-build.** Build infra,
client→API base URL, auth-token plumbing, runtime feature gates,
mobile-specific layout chrome, dynamic-route placeholders, and
SFSafariViewController for paid checkouts are all live. The
remaining 5% is the runtime gaps documented in
`CAPACITOR_MOBILE_BUILD_STATUS.md` § "Remaining work":

- OAuth deep-link handling (no URL scheme registered)
- Stripe success / billing-portal-close deep-link handling (same)
- App icon (still placeholder)
- Cold-launch UX (mobile lands on `/`, not `/login`)
- Verification on-device of Phase D dynamic-route navigation
  (placeholder `__placeholder__/index.html` may or may not match
  Next's client-router on `/uploads/<real-id>` inside Capacitor)

---

## Section 3: Auth state architecture

### 3.1 Auth modules — what each does

- `lib/supabase.ts` (browser/client) — exports `createClient()` with
  a singleton cache. **Splits on runtime `isCapacitor` detection at
  module load:** native webview gets a `@supabase/supabase-js`
  client with `flowType: 'implicit'`, `detectSessionInUrl: false`,
  `persistSession: true` (localStorage backend); regular browsers
  get `@supabase/ssr`'s `createBrowserClient` (cookie-bound).
- `lib/supabase-server.ts` — exports `createServerSupabaseClient()`
  (cookie-bound `createServerClient` from `@supabase/ssr`),
  `createServiceRoleClient()` (admin operations), and `requireAuth()`
  helper for API routes.
- `lib/supabase-from-request.ts` — exports `getAuthenticatedClient()`
  which transparently handles both auth paths: Bearer header
  (mobile) → fresh `createClient` with `Authorization` global
  override; cookie path (web) → fall-through to
  `createServerSupabaseClient`. Returns the same `{ supabase, user,
  error }` shape so route handlers don't branch on build target.
- `components/AuthProvider.tsx` — client provider mounted in
  `app/layout.tsx`. Single `getUser()` + `profiles` + latest-snapshot
  query on mount, exposed via `useAuthState()`. Status enum:
  `loading` / `anon` / `no-snapshot` / `has-snapshot`.

### 3.2 Auth storage mechanism — actually in use

**Both paths exist concurrently, selected at runtime:**

- **Web (browser):** cookies via `@supabase/ssr` `createBrowserClient`
  (default storage backend in that helper).
- **Mobile (Capacitor):** localStorage via plain
  `@supabase/supabase-js` `createClient` with `persistSession: true`.

Note: `@capacitor/preferences` is NOT used for the Supabase session
itself — Supabase's own localStorage backend handles persistence.
Preferences is used only by `lib/native.ts` `storeLocally()` /
`getLocally()` for app-level keys (e.g. `ai-consent-anthropic-v1` in
`AIConsentModal`).

### 3.3 `signInWithPassword` / `signInWithOAuth` / `signUp` / `signOut` — call sites

| Call | File:line |
|---|---|
| `signInWithPassword` | `app/(auth)/login/page.tsx:55` |
| `signUp` | `app/(auth)/signup/page.tsx:74` |
| `signInWithOAuth` | `components/OAuthButtons.tsx:25` (provider: `'google' \| 'discord'`) |
| `signOut` | `app/(dashboard)/DashboardShell.tsx:69` |
| `signOut` | `app/(dashboard)/settings/page.tsx:112, 135` |
| `signOut` | `components/NavBar.tsx:39` |

### 3.4 `getUser` / `getSession` — call sites

`getUser()` call sites (16 total — most are dashboard pages
defensively re-fetching the user):

- `middleware.ts:64` (web only)
- `components/AuthProvider.tsx:45` (the canonical bootstrap)
- `app/(auth)/login/page.tsx:33`
- `app/(auth)/signup/page.tsx:40`
- `app/(dashboard)/DashboardShell.tsx:47`
- `app/(dashboard)/admin/feedback/page.tsx:33`
- `app/(dashboard)/admin/reports/[id]/AdminReportDetailClient.tsx:52`
- `app/(dashboard)/admin/reports/page.tsx:90`
- `app/(dashboard)/bets/page.tsx:40, 194, 516, 621` (4 separate fetches)
- `app/(dashboard)/dashboard/page.tsx:99`
- `app/(dashboard)/pricing/page.tsx:39`
- `app/(dashboard)/reports/page.tsx:118, 145, 196, 396` (4 separate fetches)
- `app/(dashboard)/settings/page.tsx:41`
- `app/(dashboard)/upload/page.tsx:50, 220`
- `app/(dashboard)/uploads/compare/page.tsx:82`
- `app/(dashboard)/uploads/page.tsx:28`
- `app/quiz/QuizClient.tsx:51`
- `app/api/admin/feedback/route.ts:11` (server)
- `app/api/admin/reports/route.ts:9` (server)
- `app/api/admin/reports/[id]/route.ts:14` (server)
- `components/DisciplineScoreCard.tsx:78`
- `lib/supabase-from-request.ts:61, 70` (server, both paths)
- `lib/supabase-server.ts:53`

`getSession()` call sites (token extraction for cross-origin
requests):

- `lib/api-client.ts:55` (mobile Bearer token attachment)
- `app/reset-password/page.tsx:39`

### 3.5 `middleware.ts` audit

Auth-related checks performed (web only — middleware does not run
under `output: 'export'`):

| Check | On success | On failure |
|---|---|---|
| `getUser()` against request cookies (lines 43–64) | propagate refreshed cookies on response | `user` is null, falls through |
| Protected-route guard (`/dashboard`, `/upload`, `/uploads`, `/bets`, `/reports`, `/settings`, `/admin`) (line 67) | continue | 302 → `/login` |
| `email_confirmed_at` check (line 76) | continue | 302 → `/signup?verify=true` |
| Admin gate (`pathname.startsWith('/admin')`) — looks up `profiles.is_admin` (lines 84–96) | continue | 302 → `/dashboard` |
| Auth-route bounce (`/login`, `/signup` while authed) (lines 101–116) | 302 → `next` (same-origin only) or `/dashboard` | n/a |
| Geo cookie (`ba-geo-eu`) — `attachGeoCookie()` at every response | sets cookie if absent | n/a |

Public bypass list (line 30): `/auth/callback`, `/api/webhook`,
`/api/template`, `/og`, `/api/digest`, `/api/weekend-autopsy`,
`/api/unsubscribe`, `/api/freeze-refill`, `/api/send-email`. Plus
public content list (line 35): `/blog`, `/quiz`, `/faq`,
`/how-to-upload`, `/privacy`, `/sitemap.xml`, `/robots.txt`,
`/reset-password`.

### 3.6 OAuth flows present

**YES — Google AND Discord are wired up** via
`components/OAuthButtons.tsx:25`. The redirect URL is
`${window.location.origin}/auth/callback?next=…`. On mobile that
origin is `https://localhost`, which Supabase will reject as a
redirect URL unless explicitly whitelisted in the Supabase dashboard
— and the `app/auth/callback/route.ts` handler is **excluded by
`scripts/build-mobile.sh`** anyway, so a successful OAuth code
exchange has nowhere to land in the native app today.

This is a **critical complexity flag** — but only if OAuth needs to
work in the mobile app. PROGRESS.md "Parked / next branch" already
notes Apple Sign-In is parked on DUNS/Apple Developer enrollment;
Google + Discord OAuth on iOS is not currently a goal of the
shipped mobile build.

### 3.7 AUTH STRATEGY DECISION REQUIRED

> **Already decided and shipped.** The codebase implements *exactly*
> the dual-client pattern the prompt suggests:
>
> - Web build keeps cookie-based `@supabase/ssr` (default for SEO +
>   middleware support).
> - Mobile build uses localStorage-backed `@supabase/supabase-js`
>   with `flowType: 'implicit'` + `detectSessionInUrl: false`.
> - Selection is **runtime** in `lib/supabase.ts:34` via a
>   `window.Capacitor?.isNativePlatform()` check — not a separate
>   `lib/supabase-mobile.ts` factory file. There is no conditional
>   import in consuming components; they all call `createClient()`
>   from `@/lib/supabase` and the module picks the right backend at
>   load time.
> - Session loss under iOS storage-pressure: real but not addressed.
>   Worth measuring before adding `@capacitor/preferences` mirror.
>
> **Question for Andrew (residual):** OAuth (Google + Discord) is
> wired up but does not function in the mobile build (callback is
> excluded by `build-mobile.sh`, no URL scheme registered). Apple
> OAuth is parked on DUNS. **Is OAuth on iOS in scope for the next
> branch, or stay email/password-only on mobile until Apple lands?**
> This is the single biggest decision shaping any "Phase E" work.

---

## Section 4: API routes inventory

All 29 routes under `app/api/` plus `app/auth/callback/route.ts` and
`app/blog/feed.xml/route.ts`. Every route is exempt from mobile
build (excluded by `scripts/build-mobile.sh`) and called from the
mobile app over absolute URL via `lib/api-client.ts`.

CORS headers (`Access-Control-Allow-Origin: *`, methods `GET, POST,
OPTIONS`, headers `Content-Type, Authorization`) are set globally
on `/api/:path*` in `next.config.js:31-37` for the **web build only**
(static-export drops `headers()`, but mobile doesn't host the routes
anyway — the routes live on Vercel and are reached cross-origin).

### 4.1 Route table

| File | Method(s) | `cookies()` / `headers()`? | Auth-required (`getAuthenticatedClient` or `requireAuth`)? | Caller | CORS today? | Tag |
|---|---|---|---|---|---|---|
| `app/api/account/delete/route.ts` | POST | indirect | yes (Bearer or cookie) | client (`apiPost('/api/account/delete')`) | yes (global) | CLIENT-CALLED |
| `app/api/admin/feedback/route.ts` | GET | yes (cookie) | yes + admin gate | client (`apiGet`) | yes | CLIENT-CALLED |
| `app/api/admin/reports/route.ts` | GET | yes (cookie) | yes + admin gate | client (`apiGet`) | yes | CLIENT-CALLED |
| `app/api/admin/reports/[id]/route.ts` | GET | yes (cookie) | yes + admin gate | client (`apiGet`) | yes | CLIENT-CALLED |
| `app/api/analyze/route.ts` | POST | indirect | yes | client (`apiPost`, SSE) | yes | CLIENT-CALLED |
| `app/api/ask-report/route.ts` | POST | indirect | yes | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/billing/route.ts` | POST | indirect | yes | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/checkout/route.ts` | POST | indirect | yes | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/digest/route.tsx` | GET | none (cron secret only) | cron secret | Vercel cron | n/a | CRON |
| `app/api/expire-trials/route.ts` | GET | n/a (no-op stub) | n/a | legacy cron | n/a | CRON |
| `app/api/export/route.ts` | GET | indirect | yes | client (browser download) | yes | CLIENT-CALLED |
| `app/api/feedback/route.ts` | POST | indirect | yes (or anon for public form) | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/freeze-refill/route.ts` | GET | none | cron secret | Vercel cron | n/a | CRON |
| `app/api/inbound-email/route.ts` | POST | none | Resend webhook signature | Resend | n/a | WEBHOOK |
| `app/api/journal/route.ts` | GET, POST | indirect | yes | client (`apiGet`, `apiPost`) | yes | CLIENT-CALLED |
| `app/api/log-error/route.ts` | POST | none | none (anonymous logging) | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/onboarding-emails/route.ts` | GET | none | cron secret | Vercel cron | n/a | CRON |
| `app/api/parse-paste/route.ts` | POST | indirect | yes | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/parse-screenshot/route.ts` | POST | indirect | yes | client (`apiPostFormData`) | yes | CLIENT-CALLED |
| `app/api/quiz-lead/route.ts` | POST | none | none | client (`apiPost` from `/quiz`) | yes | CLIENT-CALLED |
| `app/api/recent-activity/route.ts` | GET | none | none (public ticker) | client (`apiGet`) | yes | CLIENT-CALLED |
| `app/api/send-email/route.ts` | GET | none | cron secret | manual / cron | n/a | CRON |
| `app/api/send-welcome/route.ts` | POST | indirect | yes | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/share/route.ts` | POST | indirect | yes | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/template/route.ts` | GET | none | none (CSV download) | direct browser link | yes | CLIENT-CALLED |
| `app/api/unsubscribe/route.ts` | GET | none | one-time token in URL | email link | n/a | WEBHOOK (link) |
| `app/api/upload/route.ts` | POST | indirect | yes | client (`apiPostFormData`) | yes | CLIENT-CALLED |
| `app/api/upload-parsed/route.ts` | POST | indirect | yes | client (`apiPost`) | yes | CLIENT-CALLED |
| `app/api/webhook/route.ts` | POST | none | Stripe signature | Stripe | n/a | WEBHOOK |
| `app/api/weekend-autopsy/route.ts` | GET | none | cron secret | Vercel cron | n/a | CRON |
| `app/auth/callback/route.ts` | GET | yes (writes cookies) | OAuth code exchange | external (Supabase OAuth) | n/a | INTERNAL/WEBHOOK |
| `app/blog/feed.xml/route.ts` | GET | none | none | crawlers | n/a | INTERNAL |

### 4.2 API ORIGIN STRATEGY DECISION

> **Already decided and shipped** in `lib/api-client.ts`:
>
> - Helper-based, **not** an env-var swap. `getBaseUrl()` returns
>   `''` on web and `https://www.betautopsy.com` (the canonical
>   `www` host, bypassing the apex-→-www 308) on mobile.
> - Three exported helpers: `apiPost`, `apiGet`, `apiPostFormData`.
> - Auth: Bearer token from `supabase.auth.getSession()` is attached
>   on mobile only; web stays cookie-based. `lib/supabase` is
>   dynamically imported inside `getAuthHeaders()` so web bundles
>   don't pay for it on landing pages.
> - **Every** client `fetch('/api/...')` call has been migrated. A
>   project-wide grep for raw `fetch('/api/...` returns only the doc
>   comment in `api-client.ts:16` and `lib/report-error.ts:9` (which
>   still routes through `apiPost`).
>
> **No residual decision needed for routing/CORS.** The remaining
> open question is auth on the cron endpoints called by the mobile
> app — none of them are CLIENT-CALLED, so this is moot.

---

## Section 5: Dynamic route audit

Five dynamic segments exist under `app/`:

### 5.1 `/blog/[slug]`

- `generateStaticParams` — **yes**, returns
  `BLOG_POSTS.map(p => ({ slug: p.slug }))` (12 posts at last
  count). Source: `lib/blog-posts.ts`.
- `dynamicParams` — **not exported** (defaults to `true`, but
  `output: 'export'` only emits the listed slugs; new slugs need a
  rebuild).
- `revalidate` — not exported (whole route is fully static).
- Param domain: **finite**, content-managed in code.
- **Classification: STATIC-FRIENDLY.** Already in mobile build with
  all 12 slugs prerendered.

### 5.2 `/share/[id]`

- `generateStaticParams` — yes; returns `[{ id: '__placeholder__' }]`
  on mobile, `[]` on web.
- `dynamicParams` — `!IS_MOBILE_BUILD` (i.e. `false` on mobile,
  `true` on web).
- `revalidate` — not exported.
- Param domain: **unbounded** (user-generated `share_tokens.id`).
- Mobile body swaps to `<ShareRedirectMobile>` which reads
  `window.location.pathname` and bounces to
  `https://www.betautopsy.com/share/<id>` via `window.open(_, '_system')`.
- **Classification: UNBOUNDED — already handled via redirect to web.**

### 5.3 `/uploads/[id]`

- `generateStaticParams` — yes; placeholder pattern.
- `dynamicParams` — `!IS_MOBILE_BUILD`.
- `revalidate` — not exported.
- Param domain: **unbounded** (user-generated `uploads.id`).
- Page renders `<UploadDetailClient />` which reads `useParams()`
  client-side and fetches via `apiGet`.
- **Classification: UNBOUNDED — needs verification on-device that
  Next's client router resolves `/uploads/<real-id>` against the
  prerendered `__placeholder__` chunk.**

### 5.4 `/admin/reports/[id]`

- Same pattern as `/uploads/[id]` — placeholder + client component
  + `apiGet`.
- **Classification: ADMIN-ONLY.** Should arguably be excluded from
  mobile build outright (Andrew is the only consumer), but the cost
  of leaving it in is one extra prerendered HTML stub. Not urgent.

### 5.5 `/og/[id]` and `/og`

- These are runtime-only `ImageResponse` route handlers. Excluded
  from the mobile build via `scripts/build-mobile.sh`. They live on
  Vercel and are referenced by absolute URL from
  `app/share/[id]/page.tsx` (`<meta og:image>`).
- **Classification: INTERNAL** (only crawlers and social unfurl
  servers reach them; the mobile app never navigates here).

### 5.6 ROUTE DECISIONS

> **`/share/[id]` decision** — already made: redirect into the system
> browser via `_system` target on mobile. The share recipient sees
> the canonical web URL with full server-rendered metadata. ✓
>
> **`/uploads/[id]` decision** — already made: include with empty
> `generateStaticParams` + client-side fetch (Option C in the
> prompt). **Verification owed:** confirm Next 14's client router
> matches `__placeholder__/index.html` for arbitrary id values inside
> Capacitor's WKWebView served from `https://localhost`. If this
> fails, fallback is to switch to query-param route `/uploads?id=…`
> in the mobile build.
>
> **`/admin/reports/[id]` decision** — same as `/uploads/[id]`.
> Could be moved to ADMIN-ONLY (excluded from mobile bundle) without
> any user-visible impact, since Andrew rarely uses iOS for admin
> work. Net savings: one prerendered route. **Probably not worth
> the diff.** Leave as-is.

---

## Section 6: Middleware audit

`middleware.ts` is the source of truth for web-side request
handling. **None of it runs in the mobile build** (static export
disables middleware entirely). Mapping each check to its mobile
equivalent:

| `middleware.ts` responsibility | Lines | Web behavior | Client-side mobile equivalent |
|---|---|---|---|
| Public-route bypass list (API webhooks, OG, public content) | 30–39 | short-circuit, no auth touch | n/a — those routes don't ship to mobile. |
| Geo cookie `ba-geo-eu` (`attachGeoCookie`) | 12–24 | stamps cookie at edge | **No mobile equivalent.** Mobile build tree-shakes `<CookieConsent>` out of `app/layout.tsx:166-172` because consent banners are not used in the iOS app (analytics are also tree-shaken — no GA/Meta/TikTok in the mobile bundle). Net effect: moot. |
| Supabase session refresh | 43–62 | refreshes cookies on every nav | **n/a on mobile.** localStorage-backed Supabase client manages its own refresh via `autoRefreshToken: true`. |
| Protected-route guard (auth required) | 67–72 | 302 → `/login` | `<AuthGuard>` (mounted in `DashboardShell.tsx:115` and `:86`) reads `useAuthState()` and `router.replace('/login')` on `status === 'anon'`. |
| Email-verification gate | 76–81 | 302 → `/signup?verify=true` | `<AuthGuard>` lines 55–57 — same `router.replace` pattern, with the same OAuth-provider escape hatch the middleware grew. |
| Admin-only gate | 84–96 | profile lookup + 302 → `/dashboard` | **Defense-in-depth lost on mobile.** Admin API routes (`/api/admin/*`) still enforce `is_admin` server-side via `getAuthenticatedClient` + profile lookup, so the security boundary is intact; only the UX redirect is missing. The admin pages also exist in the mobile bundle (no exclusion). Andrew is the only admin and isn't using iOS for that, so the gap is academic. |
| Auth-route bounce (`/login` / `/signup` while authed) + same-origin `next` honoring | 101–116 | 302 to safe destination | **No client-side equivalent shipped.** A logged-in mobile user landing on `/login` will see the form. `<AuthProvider>` could drive a `useEffect` redirect easily. **Quick win — see §12.** |

### Specifically on the prompt's call-outs

- **Geo cookie (just shipped) — moot in mobile build:** confirmed.
  GA / Meta / TikTok / CookieConsent are all `!isMobileBuild()`-gated.
- **Auth redirects — need client-side equivalent:** **already
  shipped.** `components/AuthGuard.tsx` is the equivalent. It mounts
  unconditionally inside `DashboardShell`, so both web and mobile go
  through it (web gets it as a redundant double-check on top of
  middleware; mobile gets it as the only gate).
- **Cron auth — server-only, fine:** confirmed. Cron endpoints are
  not even part of the mobile bundle.
- **Rewrites/redirects:** the only `redirects()` entries are
  apex→www and `/whats-inside → /sample`. Both are dropped on
  mobile (no apex on `https://localhost`, and the legacy
  `/whats-inside` has zero referrers in the app). No action needed.

---

## Section 7: Stripe / payment flow audit

### 7.1 Files involved

- `lib/stripe.ts` — `getStripe`, `getOrCreateCustomer` (live/test
  mode reconciliation, see PROGRESS.md hotfix `71d43ee`),
  `createCheckoutSession*`, `createCustomerPortalSession`,
  `tierFromPriceId`. Reads `STRIPE_SECRET_KEY` from env.
- `lib/native.ts:openCheckoutUrl()` — the cross-platform helper
  every CTA goes through. Native: `await Browser.open({ url,
  presentationStyle: 'fullscreen' })`. Web: `window.location.href = url`.
- `app/api/checkout/route.ts` — POST. Authenticated via
  `getAuthenticatedClient`. Builds Stripe checkout session, returns
  `{ url }`. `success_url` and `cancel_url` are constructed
  server-side.
- `app/api/billing/route.ts` — POST. Returns Stripe customer-portal
  URL. Same `openCheckoutUrl` consumer.
- `app/api/webhook/route.ts` — POST. Stripe webhook signed with
  `STRIPE_WEBHOOK_SECRET`. Updates `profiles.subscription_tier`,
  `subscription_status`, `current_period_end`.
- `app/(dashboard)/pricing/page.tsx` — `handleBuyReport` (line 103),
  `handleSubscribe` (line 137). Both POST `/api/checkout`, then
  `await openCheckoutUrl(data.url)`.
- `app/(dashboard)/settings/page.tsx:146` — `handleManageBilling`
  POSTs `/api/billing`, then `openCheckoutUrl(data.url)`.
- `components/SnapshotPaywall.tsx:33` — same pattern.
- `components/ProUpsellModal.tsx:96` — same pattern.

### 7.2 Trace of the user flow

1. User taps "Get Your Report" or "Subscribe to Pro" on
   `/pricing`.
2. `handleBuyReport` / `handleSubscribe` (auth-gated by
   `<AuthGuard>` upstream) POST `/api/checkout` via `apiPost`.
   On mobile this hits `https://www.betautopsy.com/api/checkout`
   with `Authorization: Bearer <token>`.
3. Server creates a Stripe Checkout Session with
   `success_url: …/dashboard?upgrade=success` and
   `cancel_url: …/pricing` (or similar — exact strings live in
   `lib/stripe.ts`; not displayed here to keep this read-only).
4. Server returns `{ url: 'https://checkout.stripe.com/...' }`.
5. Client calls `openCheckoutUrl(url)`:
   - Native: `Browser.open({ url, presentationStyle: 'fullscreen' })`
     — opens in **SFSafariViewController** with visible URL chrome.
     This is the App Review-friendly pattern documented in
     PROGRESS.md "Stripe / payments".
   - Web: same-tab `window.location.href = url`.
6. After Stripe completes, the webhook fires server-side and updates
   `profiles.subscription_tier`. The user is shown Stripe's success
   page inside SFSafariViewController.
7. **Returns to app: NOT WIRED.** SFSafariViewController has a
   "Done" button that closes the in-app browser, returning to the
   underlying `/pricing` page in the WebView. The success URL
   (`/dashboard?upgrade=success`) renders inside SFSafariViewController
   — so the user sees a marketing-domain success page in a web
   chrome they then have to dismiss. There is no deep-link bounce
   back into the native app.

### 7.3 What changes for Capacitor that hasn't been done

**The webhook + SFSafariViewController combo is functionally
correct.** The user's subscription is updated server-side regardless
of whether they ever leave SFSafariViewController. When they tap
"Done", the underlying `/pricing` page is still mounted. **Missing
piece:** `/pricing` doesn't observe a "checkout-completed" signal,
so the UI doesn't refresh from "Subscribe to Pro" → "Manage Billing"
without a manual reload. The web flow gets this for free via the
`?upgrade=success` redirect; the native flow doesn't.

Workable fixes:
- **Easy:** poll `/api/journal?count=true` style or refetch the
  profile when the app foregrounds via `@capacitor/app`'s `appStateChange`
  listener.
- **Better:** register a custom URL scheme (`betautopsy://...`),
  set `success_url` to that scheme on mobile, listen via
  `@capacitor/app`'s `appUrlOpen` listener, force-close
  SFSafariViewController, refetch the profile.

### 7.4 STRIPE FLOW DECISION

> **Mostly already decided and shipped:**
>
> - In-app SFSafariViewController via `openCheckoutUrl` ✓
> - Webhook fires server-side independently of redirect UX ✓
> - PROGRESS.md "Stripe / payments" enshrines this as
>   non-negotiable: "Stripe stays web-routed. Never IAP."
>
> **Question for Andrew (residual):** Is the missing post-checkout
> deep-link back into the app worth the URL-scheme work, or is the
> current "user taps Done in SFSafariViewController + state refreshes
> on next mount" pattern good enough? The Apple IAP question from
> the prompt is **already answered No** — Stripe is web-routed and
> review-passable under 3.1.3(a), per PROGRESS.md.

---

## Section 8: Heavy assets and performance considerations

### 8.1 Already-shipped wins (per PROGRESS.md)

- Static layout fix (`df9caeb`) — `headers()` out of `app/layout.tsx`.
- Anthropic SDK lazy-import (`acf1f26`) — `runAutopsy` /
  `runSnapshot` use `await import('@anthropic-ai/sdk')`. Saved 19 KB
  gzipped per consuming client page.
- `AutopsyReport` code-split (`0c53d8d`) — `next/dynamic` on
  `/share/[id]` and `/admin/reports/[id]`. -191 KB and -186 KB First
  Load JS respectively.

### 8.2 Concerns to verify on mobile

- **Fonts:** local TTFs via `next/font/local` —
  `app/fonts.ts:3-25` references
  `public/fonts/PlusJakartaSans-VariableFont_wght.ttf`,
  `public/fonts/IBMPlexMono-Regular.ttf`,
  `public/fonts/IBMPlexMono-Medium.ttf`. Bundled, not fetched. ✓
  **Quick win parked:** PROGRESS.md "Parked / next branch" lists
  WOFF2 conversion for ~30% byte savings.
- **Demo data fixture:** `lib/demo-data.ts` is **752 lines / ~62 KB**
  of static fixtures. Imported by `app/sample/page.tsx` and the
  `<DemoReportWrapper>`. PROGRESS.md flags it as the `/sample`-page
  killer for paid traffic. **Will end up in mobile bundle if any
  mobile route reaches `/sample`.** The mobile app currently lands
  on `/` (which is the marketing landing — see "Cold-launch UX
  architecture" in Parked); not clear that `/sample` is reachable in
  the mobile experience. Worth confirming once the cold-launch
  redirect lands.
- **Recharts:** imported by `components/ProgressChart.tsx:6` and
  `components/AutopsyReport.tsx:8`. AutopsyReport is already
  `next/dynamic`-loaded on `/share/[id]` and
  `/admin/reports/[id]` per the perf branch — verifying it stays
  lazy on `/reports` (the auth-gated detail page) is on the list.
  Not a mobile-specific blocker.
- **`next/image` usage:** `Grep` for `from 'next/image'` returns
  zero hits. ✓ no `images: { unoptimized: true }` needed.
- **Sentry server config:** server / edge configs don't run under
  `output: 'export'` (no server runtime). Client config does. The
  `global-error.tsx` Sentry import is on the audit list as worse
  than the original audit suggested (PROGRESS.md "User-flagged
  items"). Not mobile-specific.

---

## Section 9: Routes to exclude from mobile build

Source of truth is `scripts/build-mobile.sh:21`. Currently excluded:

| Path | Why | Status |
|---|---|---|
| `app/api/` | Server route handlers, ship secrets, can't prerender | ✓ Excluded |
| `app/og/` | `ImageResponse` edge-runtime handlers | ✓ Excluded |
| `app/blog/feed.xml/` | RSS route handler | ✓ Excluded |
| `app/auth/` | Supabase OAuth callback (writes session cookies) | ✓ Excluded |

### Routes still in the mobile bundle that arguably shouldn't be

| Route | Why it could be excluded | Recommendation |
|---|---|---|
| `/admin/feedback` | Admin-only — Andrew is the sole admin and uses desktop. | **Keep.** Cost of inclusion is one prerendered HTML stub. |
| `/admin/reports`, `/admin/reports/[id]` | Same. | **Keep.** Same. |
| `/sample` | Paid-traffic landing page; doesn't make sense to ship to App Store users. Also drags `lib/demo-data.ts` (~62 KB) into the bundle. | **Reconsider.** If the cold-launch UX flips `/` → `/login` (PROGRESS.md "Parked"), `/sample` becomes inert dead code on mobile. Consider `app/sample/page.tsx` excluding itself behind `isMobileBuild()` returning a redirect, or moving to `_excluded_from_mobile`. |
| `/blog`, `/blog/[slug]` | App Store reviewers might prefer a blog-free mobile bundle for clarity, but the content is editorial gambling-psychology articles, not promotional. PROGRESS.md does NOT mark this excluded. | **Keep.** Net positive for engagement; small bundle delta. |
| `/quiz`, `/quiz/quick` | Marketing funnel route. Currently in bundle. | **Keep, verify.** Quiz works client-side, calls `/api/quiz-lead`. |
| `/og`, `/og/[id]` | Excluded already (build-mobile.sh). | ✓ |
| `/share/[id]` | User-generated; redirects out via `_system` browser. | **Keep with redirect** (current state). |
| `/api/*` | Excluded. | ✓ |

> The "exclude `/sample`" decision is the only meaningful one
> remaining in this section, and even that is worth ~62 KB +
> framer-motion + the marketing scroll components. Defer to the
> cold-launch UX branch.

---

## Section 10: Migration phasing

The prompt's suggested phases mapped to current state:

### Phase A — Build infrastructure: **DONE** (S, complete)

Files touched (per `CAPACITOR_MOBILE_BUILD_STATUS.md`):
`package.json`, `next.config.js`, `lib/platform.ts`,
`scripts/build-mobile.sh`, `capacitor.config.ts`. Commits:
`1653c3d`, `1047497`, `6003a5c`, `542ed3b`.

### Phase B — API CORS + apiUrl helper migration: **DONE** (M, complete)

Files: `next.config.js` (CORS headers on `/api/:path*`),
`lib/api-client.ts` (new), `lib/supabase-from-request.ts` (new), and
~25 client components migrated to `apiPost`/`apiGet`/`apiPostFormData`.

### Phase C — Mobile auth client: **DONE** (L, complete)

Files: `lib/supabase.ts` (dual-client at module load),
`lib/supabase-from-request.ts` (Bearer + cookie), `lib/api-client.ts`
(token attachment), `components/AuthProvider.tsx`,
`components/AuthGuard.tsx`. `@capacitor/preferences` is shipped via
`lib/native.ts` `storeLocally`/`getLocally` for app-level keys (e.g.
AI consent), but Supabase session storage is the SDK's own
localStorage backend (not Preferences-mirrored).

### Phase D — Route exclusions + generateStaticParams: **DONE** (M, complete)

Files: `app/share/[id]/page.tsx`, `app/share/[id]/ShareRedirectMobile.tsx`,
`app/(dashboard)/uploads/[id]/page.tsx`, `app/(dashboard)/uploads/[id]/UploadDetailClient.tsx`,
`app/(dashboard)/admin/reports/[id]/page.tsx`,
`app/(dashboard)/admin/reports/[id]/AdminReportDetailClient.tsx`,
`app/(dashboard)/admin/feedback/page.tsx` (client conversion),
`app/page.tsx` / `app/sample/page.tsx` / `app/go/page.tsx` (revalidate-conditional),
`app/layout.tsx` (consent gate moved client-side),
`scripts/build-mobile.sh` (path move list).

### Phase E — Stripe deep-link + OAuth deep-link: **PARTIALLY DONE** (L)

Done:
- `lib/native.ts:openCheckoutUrl` opens Stripe URLs in
  SFSafariViewController on native ✓
- Webhook `app/api/webhook/route.ts` updates Supabase server-side
  independent of UX flow ✓

Remaining:
- **No URL scheme registered** in `Info.plist` `CFBundleURLTypes`.
- **No `@capacitor/app` `appUrlOpen` listener** in any component.
- **No `success_url` swap** in `lib/stripe.ts` for the mobile path
  (the helper has no signal to know the caller is mobile, and the
  client doesn't pass one).
- `app/auth/callback/route.ts` is excluded by build-mobile.sh, so
  Google + Discord OAuth don't function in the native app even
  though the buttons render.
- Apple OAuth parked on DUNS (PROGRESS.md).

### Phase F — Physical-device build + smoke tests: **NOT STARTED**

PROGRESS.md "Verification still pending (simulator)" lists the
remaining checks for the prior `bugs-ZTqzz` branch — those are
mostly orthogonal. A fresh smoke list for the bundled-static build:

- Cold launch from app icon — splash → `/` (or `/login` after
  cold-launch UX work).
- Email/password sign-up + sign-in.
- Logged-in dashboard nav (every route in `navItems`).
- Upload CSV → analyze (SSE end-to-end through `apiPost`).
- Stripe checkout in SFSafariViewController + manual return.
- Deep-link verification on `/uploads/<real-id>`,
  `/admin/reports/<real-id>` — does Next's client router match the
  placeholder?
- Account deletion (already verified per PROGRESS.md "bugs-ZTqzz"
  reconciliation).

### Net assessment

A more accurate phasing for the **next branch** (since A–D are done):

1. **Phase E.1: Mobile URL scheme + Stripe success deep-link** — M
2. **Phase E.2: OAuth on iOS** (Apple Sign-In specifically;
   Google/Discord via Capacitor app browser) — L, blocked on Apple
   DUNS + Services ID for Apple
3. **Phase F: Physical-device smoke test** — M
4. **Phase G (orthogonal): Cold-launch UX** — S/M
5. **Phase H (orthogonal): App icon assets, App Store metadata,
   privacy nutrition labels** — M

These are the items in `PROGRESS.md` "Parked / next branch" today.

---

## Section 11: Open questions block (consolidated)

1. **OAuth scope:** Should Google + Discord OAuth function in the
   iOS build, or stay email/password-only on mobile until Apple
   Sign-In lands? Affects whether to register a URL scheme + add
   the `appUrlOpen` listener now or punt to the Apple branch.
2. **Stripe success deep-link:** worth registering a URL scheme +
   handling `appUrlOpen` to bounce out of SFSafariViewController and
   refresh `/pricing`, or keep "user taps Done, state refreshes on
   next mount" as the UX?
3. **`/sample` in mobile bundle:** keep or exclude? Currently in,
   ships ~62 KB of demo fixtures. Tied to cold-launch UX decision.
4. **`/admin/*` in mobile bundle:** keep or exclude? Cost of
   keeping is trivial; semantic clarity benefit if excluded.
5. **`/uploads/[id]` runtime verification:** does Next 14's
   client router resolve `/uploads/<real-id>` against the
   `__placeholder__` chunk inside Capacitor's WKWebView at
   `https://localhost`? Needs an on-device test.
6. **Auth-route bounce on mobile:** should an authed user landing
   on `/login` or `/signup` get a client-side redirect to
   `/dashboard` (currently only middleware does this)?
7. **`@capacitor/preferences` for Supabase session?** Current setup
   uses the SDK's own localStorage backend. Worth mirroring to
   Preferences as defense against iOS storage-pressure eviction?
   Probably premature without measurement.
8. **Cold-launch UX (`/` on mobile):** redirect to `/login`, build a
   2–3 screen onboarding carousel, or keep marketing landing? Apple
   reviewer optics cited in PROGRESS.md "Parked".

---

## Section 12: Quick wins identified during recon

Items noticed that are unrelated to the migration core but cheap to
fix (do NOT fix in this phase per the prompt):

1. **`app/(dashboard)/bets/page.tsx` and `reports/page.tsx` each
   call `supabase.auth.getUser()` 4 times.** `<AuthProvider>` /
   `useAuthState()` already provides a single shared `user` for the
   whole tree (`components/AuthProvider.tsx:33`). Migrating these
   call sites would save 7 redundant Supabase auth round-trips per
   page load on the busiest pages.
2. **`app/(dashboard)/DashboardShell.tsx:47` re-fetches `getUser()`
   AND the profile** even though `<AuthProvider>` already has both.
   The two-source-of-truth is what the perf branch was supposed to
   collapse — looks like the dashboard shell wasn't migrated.
3. **`components/DisciplineScoreCard.tsx:78`** also has its own
   `getUser()` instead of consuming `useAuthState()`.
4. **`app/(dashboard)/admin/feedback/page.tsx:33`** — same.
5. **`/api/admin/feedback/route.ts:11`, `/api/admin/reports/route.ts:9`,
   `/api/admin/reports/[id]/route.ts:14`** — these still use the
   raw `supabase.auth.getUser()` pattern instead of going through
   `getAuthenticatedClient()` from `lib/supabase-from-request.ts`.
   Functionally equivalent today (cookies present on web), but
   they will not work from the mobile app once admin pages are
   reachable from iOS — the Bearer token path is bypassed. **Real
   bug if anyone tries to admin from iOS.**
6. **`PROGRESS.md` "Current branch" string is stale** — at the top
   it lists `claude/update-app-website-sync-vuQB7` while the actual
   branch checked out is `claude/capacitor-migration-recon-l0LuG`.
   Cosmetic.
7. **No `WKAppBoundDomains`** in `Info.plist`. Optional Apple
   feature — only relevant if we want `<input type="password">`
   storage to be isolated to specific domains. Probably not worth
   wiring up unless the App Reviewer asks.
8. **Sentry deprecation warnings** noted in
   `CAPACITOR_MOBILE_BUILD_STATUS.md` — separate chore.
9. **The mobile bundle still ships `framer-motion`** transitively
   (any landing page that uses it). Net effect on iOS app size
   should be measured against the `next/dynamic`-based code-splits
   that already shipped.

---

# Final summary

**Recon document:** `/tmp/capacitor-migration-recon.md`

## 5 highest-risk items

1. **Dynamic-route client-router resolution on `/uploads/<real-id>`
   and `/admin/reports/<real-id>` is unverified on-device.** Mobile
   only has `__placeholder__/index.html` on disk; Next 14's client
   router needs to handle the live id. If it doesn't, the fallback
   is a query-param refactor (`/uploads?id=…`).
2. **No URL scheme registered → no deep-link return path** for
   Stripe, OAuth, or anything else that leaves the WebView. Fine
   today because Stripe's webhook is server-side, but blocks any
   future flow that needs a callback into the app.
3. **`/api/admin/*` routes still use the cookie-only auth pattern**
   instead of `getAuthenticatedClient`. They will silently 401 from
   any future mobile admin call. Latent bug, not currently exercised.
4. **OAuth shipped in `<OAuthButtons>` UI but non-functional on
   mobile** — `app/auth/callback/route.ts` is excluded from the
   mobile build, and there's no URL scheme to deep-link back. If
   any mobile user taps Continue with Google, the flow dead-ends.
   Either gate the OAuth buttons behind `!isMobileApp()` (already
   done — `app/(auth)/login/page.tsx:112` and signup`:163`) is the
   current mitigation. Verify the gate covers every call site.
5. **`lib/demo-data.ts` (62 KB)** ships in the mobile bundle as
   long as `/sample` is reachable. Tied to the cold-launch UX
   decision; left in by default until that lands.

## Decision-required count

**8 questions for Andrew** (Section 11). Most are scope decisions
for the next branch, not blockers for the already-shipped state.

STOP. No implementation phase initiated.
