# Capacitor Mobile Build — Current Status

Snapshot of where the dual-target (web + mobile) build work stands
as of commit `542ed3b`. Paired with `CAPACITOR_AUDIT_{1,2,3}.md`
which document the original survey.

## TL;DR

`npm run build:mobile` **builds successfully**. It produces a fully
static `out/` directory with every page prerendered to HTML and no
`ƒ (Dynamic)` entries. `npm run build` (web) is behaviorally
unchanged.

The static export is **buildable but not yet functional inside a
Capacitor shell** — several runtime concerns need client-side
replacements before the wrapped app will behave like the web app.

## Commits that got us here (on `main`, in order)

| Commit | Summary |
|---|---|
| `f430311` | docs: Capacitor audit #1 (API route inventory) |
| `1b35323` | docs: Capacitor audit #2 (Server Components & middleware) |
| `f545c6e` | docs: Capacitor audit #3 (static-export compatibility) |
| `1653c3d` | feat: dual-target (web + mobile) build support (package.json, next.config.js, lib/platform.ts) |
| `aaa8ec0` | feat: make 6 Server Components compatible with mobile static export |
| `1047497` | build(mobile): exclude `app/api` via `scripts/build-mobile.sh` wrapper |
| `6003a5c` | build(mobile): cover more blockers (dynamic dashboard pages, more excluded route dirs) |
| `542ed3b` | build(mobile): make `/go` statically renderable (GoSignupLink client split) |

## Build-time mechanics

### `package.json`

```json
"build":        "next build"
"build:mobile": "sh scripts/build-mobile.sh"
```

### `next.config.js`

Conditionally sets `output: 'export'` and omits `headers()` /
`redirects()` when `process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile'`.
Web config is unchanged.

### `lib/platform.ts`

Exposes `isMobileBuild()` (build-time constant), `isMobileApp()`
(runtime check for Capacitor native webview), and `isWeb()`.

### `scripts/build-mobile.sh`

Wrapper that moves runtime-only paths aside, runs
`NEXT_PUBLIC_BUILD_TARGET=mobile next build`, then restores them —
via a `trap cleanup EXIT INT TERM` that runs regardless of success
or failure. Preflight check refuses to run if any stale
`_*_excluded_from_mobile` directory is on disk. Currently
excludes:

| Path | Why |
|---|---|
| `app/api` | Server-only route handlers — ship secrets, can't prerender |
| `app/og` | `ImageResponse` edge runtime handlers |
| `app/blog/feed.xml` | RSS route handler |
| `app/auth` | Supabase OAuth callback (`cookies()`) |

## Server Components fixed for mobile

From `CAPACITOR_AUDIT_2_SERVER.md`:

| File | Fix |
|---|---|
| `app/layout.tsx` | `shouldRequireConsent()` gated behind `!isMobileBuild()` |
| `app/page.tsx` | Metrics display extracted to `components/PlatformMetrics.tsx` client component; `revalidate` conditional |
| `app/sample/page.tsx` | Same pattern as `/` |
| `app/go/page.tsx` | Removed server-side `loadPlatformMetrics()`; later split out `GoSignupLink` client component for UTM handling |
| `app/share/[id]/page.tsx` | Mobile branch renders `ShareRedirectMobile` client component instead of calling `cookies()` / Supabase; `generateStaticParams` returns `[{ id: '__placeholder__' }]` in mobile |
| `app/(dashboard)/admin/feedback/page.tsx` | Converted to client component with client-side `auth.getUser()` + `is_admin` check (server-side check still enforced by the API route) |

## Dynamic routes split into server-page + client-component wrappers

Pattern: a thin Server Component `page.tsx` exports
`generateStaticParams` (placeholder in mobile, empty in web) and
`dynamicParams = !IS_MOBILE_BUILD`, then renders the extracted
client component verbatim.

| Route | Server page | Client component |
|---|---|---|
| `/uploads/[id]` | `app/(dashboard)/uploads/[id]/page.tsx` | `UploadDetailClient.tsx` |
| `/admin/reports/[id]` | `app/(dashboard)/admin/reports/[id]/page.tsx` | `AdminReportDetailClient.tsx` |
| `/share/[id]` | `app/share/[id]/page.tsx` | `ShareRedirectMobile.tsx` (mobile only); web still uses original server flow |

## New files

- `components/PlatformMetrics.tsx`
- `app/share/[id]/ShareRedirectMobile.tsx`
- `app/go/GoSignupLink.tsx`
- `app/(dashboard)/uploads/[id]/UploadDetailClient.tsx`
- `app/(dashboard)/admin/reports/[id]/AdminReportDetailClient.tsx`
- `scripts/build-mobile.sh`
- `lib/platform.ts`

## Last successful `npm run build:mobile` output

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (44/44)
✓ Collecting build traces
⚠ Statically exporting a Next.js application via `next export` disables API routes and middleware.
✓ Finalizing page optimization
```

Resulting route table (excerpt):

- `○ /` static
- `○ /go` static
- `○ /sample` static
- `○ /dashboard`, `/upload`, `/uploads`, `/bets`, `/reports`, `/settings` static
- `○ /admin/feedback`, `/admin/reports` static
- `● /admin/reports/[id]` SSG → `__placeholder__`
- `● /share/[id]` SSG → `__placeholder__`
- `● /uploads/[id]` SSG → `__placeholder__`
- `● /blog/[slug]` SSG → 12 real slugs
- `○ /signup`, `/login`, `/reset-password`, `/quiz`, `/quiz/quick`, `/faq`, `/privacy`, `/terms`, `/pricing` static

No `ƒ (Dynamic)` entries. No `Middleware` row in the output
(confirming middleware was silently skipped for the static export).

## Remaining work before the shell is functional

These are **not build-time blockers** — the static export is green.
They are runtime gaps that will surface once `out/` is wrapped in
Capacitor and the user tries to log in or navigate.

### 1. Client `fetch('/api/...')` calls (largest chunk)

Every dashboard action hits `/api/*`:

- `/api/analyze` (analyze flow)
- `/api/ask-report` (Q&A on a report)
- `/api/parse-paste`, `/api/parse-screenshot`, `/api/upload`, `/api/upload-parsed`
- `/api/checkout`, `/api/billing` (Stripe)
- `/api/journal`, `/api/feedback`, `/api/share`, `/api/export`
- `/api/admin/reports`, `/api/admin/feedback`
- `/api/send-welcome`, `/api/quiz-lead`, `/api/log-error`, `/api/recent-activity`

In the Capacitor webview these resolve against the local bundle
(no `/api/` exists) and 404. Needs:

- An `apiUrl(path)` helper: `''` on web, `https://www.betautopsy.com` on mobile
- Every `fetch('/api/...')` call rewritten through it
- CORS config on the Vercel origin allowing the Capacitor app host
- An auth story for cross-origin requests — Supabase cookies don't
  cross origins, so either explicit `Authorization: Bearer <token>`
  from `supabase.auth.getSession()`, or continue relying on Supabase
  cookies set by a shared parent domain

### 2. Auth gating (was `middleware.ts`)

Middleware no longer runs in the static export. The gates it
provided need client-side replacements:

- Protected-route redirect (`/dashboard`, `/upload`, `/uploads`,
  `/bets`, `/reports`, `/settings`, `/admin`)
- Email-verification redirect (non-verified users → `/signup?verify=true`)
- Admin-only gate on `/admin/*`
- Auth-route redirect (already-logged-in user hitting `/login`,
  `/signup` → `/dashboard`)
- Supabase session refresh (`@supabase/ssr` + cookie writeback)

A root-level `<AuthGate>` component wrapping the `(dashboard)`
layout, plus per-route effects for the edge cases, is the usual
shape.

### 3. OAuth callback (`app/auth/callback/`)

Currently excluded from the mobile build entirely. The existing
server handler exchanges a Supabase auth code for a session and
writes cookies on the response. Native apps can't use an HTTP
redirect URL — needs either:

- Capacitor App plugin `appUrlOpen` listener to catch a custom
  URL scheme deep link
- `supabase.auth.signInWithOAuth({ redirectTo: <app scheme> })`
- Or: in-app webview OAuth (Apple / Google may reject — check
  store policies)

### 4. Dynamic route in-app navigation

`/uploads/<real-id>`, `/admin/reports/<real-id>`, `/share/<real-id>`
only have `/__placeholder__/index.html` on disk. Next's client
router *should* match the dynamic segment at runtime and render
the client component with real `useParams()`, but this needs
actual verification in the Capacitor webview. If it doesn't
work, the fallback is to restructure nav to use query params
(`/uploads?id=abc`).

### 5. Third-party script behavior in the webview

- Google Analytics, TikTok Pixel, Meta Pixel — wrapped in
  `process.env.NODE_ENV === 'production'` check in `app/layout.tsx`,
  will fire from the native app. Decide whether that's desired.
- Sentry client config loads. Server Sentry doesn't.
- `/og` and `/og/[id]` are excluded — any `<meta property="og:image">`
  pointing at `/og/...` will 404. Embed absolute web URLs instead.

### 6. Deferred / known-smaller items

- `feature-flags: PRICING_ENABLED is false in production` warning
  is printed repeatedly during build. Not a blocker.
- Recharts `width(-1) height(-1)` warnings during SSG — cosmetic,
  from prerendering chart components with no layout.
- `@sentry/nextjs` deprecation warnings about
  `sentry.server.config.ts` / `sentry.edge.config.ts` / `disableLogger`
  — unrelated to mobile work, should migrate to
  `instrumentation.ts` eventually.
- `npm audit` reports 8 vulnerabilities — separate chore.

## Quick verification

```bash
npm run build          # web build, unchanged
npm run build:mobile   # mobile build, should complete
ls out/                # should exist with 44 prerendered pages
ls out/index.html out/go/index.html out/sample/index.html
```

## Branch + pushing

All commits live on `main` and on the feature branch
`claude/document-api-files-YjXVt`. Every step has been pushed as a
fast-forward.
