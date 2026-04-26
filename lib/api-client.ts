import { isMobileApp } from './platform';

// NOTE: `./supabase` is *not* imported statically here — it would
// drag `@supabase/ssr` + `@supabase/supabase-js` into the chunk
// graph of every page that transitively uses this helper (e.g.
// `/go`, `/quiz/quick`, `/share/[id]`), adding ~55 kB of First
// Load JS to public landing pages for no reason. The token lookup
// inside `getAuthHeaders()` only runs on the mobile build, so we
// lazy-load the module via `await import('./supabase')` below —
// webpack code-splits that into a chunk that web never loads.

/**
 * Cross-origin-aware API client for BetAutopsy.
 *
 * On the web build, every helper below resolves to a same-origin
 * `fetch('/api/...')` call with cookie-based auth — the default
 * behavior that every current call site already relies on.
 *
 * Inside the Capacitor native webview (`isMobileApp()` returns
 * `true`), the helpers:
 *
 *   1. Rewrite the URL to the canonical web origin
 *      (`https://www.betautopsy.com`) so `fetch` hits the hosted
 *      API instead of looking for a local `/api/` in the bundled
 *      `out/` — which doesn't exist. The apex `betautopsy.com`
 *      308-redirects to the `www` subdomain on Vercel; pointing
 *      directly at `www` avoids a cross-host redirect that can
 *      silently drop the `Authorization` header in WKWebView and
 *      costs a round trip on every API call regardless.
 *   2. Attach an `Authorization: Bearer <supabase access token>`
 *      header pulled from the browser Supabase client's session.
 *      Supabase cookies don't cross origins, so the Bearer token
 *      is the only auth signal the cross-origin request carries.
 *
 * The server side of this contract lives in
 * `lib/supabase-from-request.ts` (`getAuthenticatedClient`),
 * which accepts either cookie-based sessions (web) or the
 * Bearer token (mobile). Both paths resolve to the same
 * `{ supabase, user }` shape, so route handlers don't need to
 * branch on build target.
 */

function getBaseUrl(): string {
  if (isMobileApp()) return 'https://www.betautopsy.com';
  return '';
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (!isMobileApp()) return {};
  // Dynamic import — only reached inside the Capacitor webview.
  // Web bundles never execute this branch, so webpack emits the
  // chunk as lazy and strips it from every static route.
  const { createClient } = await import('./supabase');
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost(
  path: string,
  body?: unknown,
  options?: { headers?: HeadersInit; signal?: AbortSignal }
): Promise<Response> {
  const baseHeaders = await getAuthHeaders();
  return fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...baseHeaders,
      ...options?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });
}

export async function apiGet(path: string): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(`${getBaseUrl()}${path}`, { headers });
}

export async function apiPostFormData(
  path: string,
  formData: FormData
): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
}
