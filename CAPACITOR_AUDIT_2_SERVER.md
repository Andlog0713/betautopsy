# Capacitor Audit #2 — Server Components & Middleware

Enumerates every file under `app/` that is a Server Component (no
`'use client'` directive) and touches a server-only API
(`cookies()`, `headers()`, or a helper that does — including the
`createServerSupabaseClient` / `createServiceRoleClient` helpers in
`lib/supabase-server.ts`, which respectively call `cookies()` from
`next/headers` and read `process.env.SUPABASE_SERVICE_ROLE_KEY`).

Scope: `app/**/*.tsx` and `app/**/*.ts` excluding API route handlers
under `app/api/` (those are covered in Capacitor Audit #1). Route
handlers outside `app/api/` (e.g. `app/auth/callback/route.ts`) are
listed separately at the bottom because they are technically not Server
Components but still ship server-only code that would break under a
fully-static export.

## Server Components using server-only APIs

| # | File | Server-only API used | What it does |
|---|---|---|---|
| 1 | `app/layout.tsx` | `headers()` (indirectly, via `shouldRequireConsent()` in `lib/consent-region.ts`, which reads the `x-vercel-ip-country` header) | Root layout. Geo-gates the cookie-consent banner (EU/EEA/UK/CH = consent required). Reading the header makes the layout dynamic. |
| 2 | `app/page.tsx` | `createServiceRoleClient()` → `SUPABASE_SERVICE_ROLE_KEY` | Marketing home page. Calls `loadPlatformMetrics()` which queries `bets` and `autopsy_reports` counts via the service-role client. Uses ISR (`export const revalidate = 3600`). |
| 3 | `app/sample/page.tsx` | `createServiceRoleClient()` → `SUPABASE_SERVICE_ROLE_KEY` | Public sample-report page. Loads a platform bet-count stat via the service-role client. Uses ISR (`export const revalidate = 3600`). |
| 4 | `app/go/page.tsx` | `createServiceRoleClient()` → `SUPABASE_SERVICE_ROLE_KEY` | Paid-traffic landing page. Loads platform bet/report counters via the service-role client. Uses ISR (`export const revalidate = 3600`). |
| 5 | `app/share/[id]/page.tsx` | `cookies()` from `next/headers` (directly) | Public share-report page. `getShareData()` builds a `createServerClient` with the anon key + cookie store, reads from `share_tokens`, and also drives `generateMetadata`. |
| 6 | `app/(dashboard)/admin/feedback/page.tsx` | `createServerSupabaseClient()` (which calls `cookies()`) | Admin-only feedback list page. Auths the caller, checks `is_admin`, and redirects non-admins. Delegates the data stream to a client child (`FeedbackStream`). |

All other `page.tsx` / `layout.tsx` files in `app/` (e.g. `app/blog/**`,
`app/faq/page.tsx` — which is client, `app/quiz/**`, `app/privacy`,
`app/terms`, `app/(auth)/layout.tsx`, `app/(dashboard)/layout.tsx`,
`app/not-found.tsx`, all `loading.tsx` files, etc.) either have
`'use client'` or do not touch `cookies()` / `headers()` /
`supabase-server` helpers and so are safely statically renderable.

### Route handlers in `app/` that rely on server-only APIs (not Server Components, but relevant)

| File | Server-only API used | What it does |
|---|---|---|
| `app/auth/callback/route.ts` | `cookies()` from `next/headers` | Supabase OAuth / email-confirmation callback — exchanges the auth code for a session and writes the session cookies on the response. |
| `app/og/route.tsx` | Node / Edge runtime `ImageResponse` | Open-graph image generator for the marketing home. Runtime-rendered, not static-exportable. |
| `app/og/[id]/route.tsx` | Node / Edge runtime `ImageResponse` + fetches report data | Per-share OG image generator. Runtime-rendered. |
| `app/sitemap.ts` | Built-in Next sitemap route | Generates the sitemap at request / build time. |
| `app/manifest.ts` | Built-in Next manifest route | Generates `manifest.webmanifest`. |
| `app/blog/feed.xml/route.ts` | Runtime route handler | Generates the blog RSS feed. |

## `middleware.ts`

Single file at repo root: `middleware.ts`. Runs on every request matching:

```
matcher: [
  '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
]
```

Responsibilities:

1. **Public-route bypass.** Short-circuits for paths that must never be
   auth-gated or cookie-touched: `/auth/callback`, `/api/webhook`,
   `/api/template`, `/og`, `/api/digest`, `/api/weekend-autopsy`,
   `/api/unsubscribe`, `/api/freeze-refill`, `/api/send-email`, and
   content pages `/blog`, `/quiz`, `/faq`, `/how-to-upload`, `/privacy`,
   `/sitemap.xml`, `/robots.txt`, `/reset-password`.
2. **Supabase session refresh.** Constructs a `createServerClient`
   (`@supabase/ssr`) bound to `request.cookies`, calls
   `supabase.auth.getUser()`, and pipes any refreshed cookies back onto
   the outgoing `NextResponse`. This is what keeps the Supabase session
   alive on SSR navigations.
3. **Protected-route gate.** Routes starting with `/dashboard`,
   `/upload`, `/uploads`, `/bets`, `/reports`, `/settings`, `/admin`
   redirect unauthenticated users to `/login`.
4. **Email-verification gate (defense in depth).** Authenticated users
   without `email_confirmed_at` are bounced to `/signup?verify=true`
   when they try to hit a protected route. OAuth users (Google) are
   auto-verified so they pass through.
5. **Admin-only gate.** On paths beginning with `/admin`, the
   middleware queries `profiles.is_admin` for the current user and
   redirects non-admins to `/dashboard`.
6. **Auth-route redirect.** `/login` and `/signup` redirect already
   authenticated users to `/dashboard`.

Env vars it reads: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
No server-only secrets (it intentionally uses the anon key + cookies
so it can run on the edge).

## Implications for a fully-static build

A `next export` / `output: 'export'` build would break on every row in
the first table (all six Server Components are dynamic) and on every
entry in the route-handler table. `middleware.ts` itself is also
incompatible with `output: 'export'` — middleware requires a running
Node/Edge runtime.
