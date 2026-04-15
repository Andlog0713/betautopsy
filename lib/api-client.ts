import { isMobileApp } from './platform';
import { createClient } from './supabase';

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
 *      (`https://betautopsy.com`) so `fetch` hits the hosted API
 *      instead of looking for a local `/api/` in the bundled
 *      `out/` — which doesn't exist.
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
  if (isMobileApp()) return 'https://betautopsy.com';
  return '';
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (!isMobileApp()) return {};
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost(
  path: string,
  body?: unknown,
  options?: { headers?: HeadersInit }
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
