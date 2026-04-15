# Capacitor Audit #3 — Static Export Compatibility

What would break if we switched this Next app to
`output: 'export'` (fully static). Based on a direct scan of
`next.config.js`, `app/`, and `middleware.ts`.

## 1. `next/image` usage

**None found.** There are no `import … from 'next/image'` statements
anywhere in the repo, and no `<Image>` JSX tags. The only hit for the
string `next/image` is in `middleware.ts:93` — a matcher regex that
excludes `_next/image` from the middleware, not an import:

```ts
matcher: [
  '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
]
```

Implication for `output: 'export'`: **nothing to change on the
`next/image` side.** If `next/image` is ever introduced later it would
need `images: { unoptimized: true }` in `next.config.js` to build under
static export, but that's not currently blocking.

## 2. `next.config.js` — conflicts with `output: 'export'`

Current config at `next.config.js`:

- `experimental.serverComponentsExternalPackages: ['@anthropic-ai/sdk']`
  — only meaningful if Server Components run at request time. With a
  static export there are no runtime Server Components, so this
  becomes a no-op (not a conflict, but dead config).
- `async headers()` returning a set of security and `Cache-Control`
  headers — **hard conflict.** `next export` strips the
  `headers()` hook entirely; headers must be set by the hosting layer
  (Capacitor / CDN / native webview). The `Content-Security-Policy-Report-Only`,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and
  the `/blog/:path*`, `/faq`, `/how-to-upload` cache headers would all
  silently stop being emitted.
- `async redirects()` with the apex→www 308 and `/whats-inside` → `/sample`
  — **hard conflict.** `redirects()` is also unsupported under
  `output: 'export'`. Both redirects would have to move into the
  hosting layer (or become client-side redirects).
- `withSentryConfig(...)` wrapping — works with `output: 'export'` for
  client-side Sentry, but the server-side Sentry instrumentation
  (`sentry.server.config.ts`, `sentry.edge.config.ts`) will not run
  because there is no server runtime.
- No `output`, `images`, `basePath`, `assetPrefix`, `rewrites`, or
  `trailingSlash` options are currently set — so adding `output: 'export'`
  is syntactically simple, it's everything else that will break.

## 3. ISR / `revalidate` / `generateStaticParams` / `dynamic` / `runtime`

Full inventory found via `Grep`:

| File | Directive | Compatible with `output: 'export'`? |
|---|---|---|
| `app/page.tsx` | `export const revalidate = 3600` | ❌ ISR — export only supports full static. The page itself also calls `createServiceRoleClient()` at render time (see §4), so it is doubly incompatible. |
| `app/sample/page.tsx` | `export const revalidate = 3600` | ❌ same as above — plus a `createServiceRoleClient()` call. |
| `app/go/page.tsx` | `export const revalidate = 3600` | ❌ same as above — plus a `createServiceRoleClient()` call. |
| `app/blog/[slug]/page.tsx` | `export function generateStaticParams()` | ✅ **Works.** This is exactly the pattern `output: 'export'` expects for dynamic segments — the slugs come from `BLOG_POSTS` at build time. |
| `app/og/route.tsx` | `export const runtime = 'edge'` + `ImageResponse` | ❌ Runtime route handler. Static export produces no runtime, so OG images can't be generated on demand. Would need pre-rendered PNGs or an external OG service. |
| `app/og/[id]/route.tsx` | `export const runtime = 'edge'` + `ImageResponse` + Supabase REST fetch | ❌ Same — and it fetches per-id share data at request time, so it cannot be pre-rendered. |
| `app/api/expire-trials/route.ts` | `export const dynamic = 'force-dynamic'` | ❌ All route handlers break under export, see §5. |
| `app/api/export/route.ts` | `export const dynamic = 'force-dynamic'` | ❌ |
| `app/api/freeze-refill/route.ts` | `export const dynamic = 'force-dynamic'` | ❌ |
| `app/api/parse-screenshot/route.ts` | `export const dynamic = 'force-dynamic'` | ❌ |
| `app/api/recent-activity/route.ts` | `export const dynamic = 'force-dynamic'` + `export const revalidate = 15` + `Cache-Control: public, s-maxage=15` | ❌ |
| `app/api/send-email/route.ts` | `export const dynamic = 'force-dynamic'` | ❌ |

No `'use server'` Server Action directives exist in the repo — a
global `Grep` for `use server` returned zero files — so Server Actions
are not a blocker.

## 4. Server Components that run code at request time

See `CAPACITOR_AUDIT_2_SERVER.md` for the full list. Recap of the
pieces that block static export:

| File | What breaks |
|---|---|
| `app/layout.tsx` | Calls `shouldRequireConsent()` which reads `headers().get('x-vercel-ip-country')`. Under `output: 'export'` `headers()` is unavailable, so this would throw or be statically frozen to the fail-closed default (consent required everywhere). |
| `app/page.tsx` | `loadPlatformMetrics()` runs `createServiceRoleClient()` (reads `SUPABASE_SERVICE_ROLE_KEY`) and hits Supabase at render time. |
| `app/sample/page.tsx` | Same Supabase call pattern as `app/page.tsx`. |
| `app/go/page.tsx` | Same Supabase call pattern. |
| `app/share/[id]/page.tsx` | Calls `cookies()` directly and also defines `generateMetadata` that reads per-id data from Supabase — cannot be prerendered without known ids (no `generateStaticParams`). |
| `app/(dashboard)/admin/feedback/page.tsx` | Server Component that calls `createServerSupabaseClient()` (cookie-bound) and redirects non-admins — requires a live request context. |

## 5. Every API route handler (`app/api/**/route.ts(x)`)

`output: 'export'` **does not build any route handlers at all.** All
29 routes in `CAPACITOR_AUDIT_1_API.md` would stop existing on the
static host, which would break the entire product (analyze,
parse-paste, parse-screenshot, checkout, webhook, share,
admin/feedback, cron jobs, etc.). In a Capacitor native-app scenario
these would have to run against a remote Next/Node origin and the
client code would call them over HTTPS instead of `/api/...` paths.

## 6. `middleware.ts`

`middleware.ts` is the big one. `output: 'export'` **does not run
middleware at all.** Everything this file does today silently
disappears:

- Supabase session refresh (`@supabase/ssr` + `getUser()` + cookie
  writeback) — users would no longer stay logged in between SSR
  navigations, and the cookie refresh that the `@supabase/ssr`
  helpers depend on would stop happening.
- Protected-route redirect (`/dashboard`, `/upload`, `/uploads`,
  `/bets`, `/reports`, `/settings`, `/admin` → `/login` if
  unauthenticated) — would have to be reimplemented client-side.
- Email-verification gate (`!user.email_confirmed_at` →
  `/signup?verify=true`) — client-side fallback needed.
- Admin-only gate on `/admin*` (profile `is_admin` lookup) — client-side
  fallback needed, which loses the defense-in-depth property of the
  server-side check.
- Auth-route redirect (`/login`, `/signup` → `/dashboard` when signed
  in) — client-side fallback.
- Public-route bypass list (including `/api/webhook`, `/auth/callback`,
  `/api/digest`, `/api/weekend-autopsy`, `/api/unsubscribe`,
  `/api/freeze-refill`, `/api/send-email`, `/api/template`, `/og`,
  and content pages) — irrelevant without a middleware, but some of
  these routes themselves also die (see §5).

## 7. Other server-only surface area

- **`app/auth/callback/route.ts`** — Supabase OAuth callback. Calls
  `cookies()` to write the session cookies after the code exchange.
  Runtime-only; no static export equivalent.
- **`app/sitemap.ts`** — `app/sitemap.ts` with a default export. Under
  `output: 'export'` this is generated at build time, so it's **fine**.
- **`app/manifest.ts`** — Same; static-generatable, **fine**.
- **`app/blog/feed.xml/route.ts`** — runtime route handler, would
  break. Would need to become an `app/blog/feed.xml/route.ts` that is
  statically pre-rendered, or a plain file in `public/`.
- **Sentry server/edge configs** (`sentry.server.config.ts`,
  `sentry.edge.config.ts`) — unreachable without a server runtime;
  client Sentry (`sentry.client.config.ts`) still works.
- **`withSentryConfig` tunnel route + source-map upload** — the
  source-map upload path is fine, but the Sentry tunnel route
  (if enabled) is a server route and would disappear.

## 8. Summary of blockers for `output: 'export'`

| Category | Count | Blocker? |
|---|---|---|
| `next/image` imports / `<Image>` usage | 0 | ✅ No change needed |
| `next.config.js` `headers()` | 1 block | ❌ Must move to host |
| `next.config.js` `redirects()` | 1 block | ❌ Must move to host |
| ISR (`revalidate`) on pages | 3 (`/`, `/sample`, `/go`) | ❌ Remove or switch to build-time data |
| `generateStaticParams` | 1 (`/blog/[slug]`) | ✅ Already static-export-friendly |
| OG image route handlers | 2 (`/og`, `/og/[id]`) | ❌ Runtime-only |
| API route handlers | 29 | ❌ All die |
| Other runtime route handlers (`/auth/callback`, `/blog/feed.xml`) | 2 | ❌ Die |
| Server Components touching `cookies()`/`headers()`/Supabase at render | 6 | ❌ Must be refactored to client or build-time |
| `middleware.ts` | 1 | ❌ Entire file does not run |
| Server Actions (`'use server'`) | 0 | ✅ No change needed |
| Sitemap / manifest | 2 | ✅ OK |

**Bottom line:** a plain `output: 'export'` of the current tree would
yield a site where only the blog, marketing content without live
platform counters, sitemap, manifest, and the purely client
dashboards would render, and every auth, analysis, payment, email,
admin, and share flow would 404. Any Capacitor/static path needs to
split the app into a static client shell that talks to a separately
hosted Next.js (or other) backend for everything in §§4-7.
