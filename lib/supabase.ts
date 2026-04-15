import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ─── Storage backend selection ───────────────────────────────────
//
// Web (including a regular mobile browser): use `@supabase/ssr`'s
// `createBrowserClient`, which stores the session in cookies so the
// Next.js server actions / middleware can read it on the same origin.
//
// Capacitor native webview: the app is served from `betautopsy://
// localhost` (a custom URL scheme). Cookies at custom schemes are
// unreliable in WKWebView — Safari accepts them, writes them back,
// and then the runtime silently fails to include them on subsequent
// requests. `supabase.auth.signInWithPassword` hangs indefinitely
// because `auth.getSession()` can't find the token it just wrote.
//
// The fix is to use the plain `@supabase/supabase-js` `createClient`,
// which defaults to `localStorage` for session persistence.
// `localStorage` works at custom schemes in WKWebView and is what
// every other Capacitor + Supabase app uses.
//
// Detection is synchronous at module load so every caller of
// `createClient()` gets a consistent backend without needing to
// await. The `typeof window` guard keeps the branch `false` during
// SSR / prerender, which is correct — cookie-based auth is the
// right choice there.

// Structured cast (matching `lib/platform.ts`) avoids an `any`
// assertion that this project's ESLint config doesn't know how
// to disable.
type CapacitorGlobal = {
  Capacitor?: { isNativePlatform?: () => boolean };
};
const isCapacitor =
  typeof window !== 'undefined' &&
  !!(window as unknown as CapacitorGlobal).Capacitor?.isNativePlatform?.();

if (typeof window !== 'undefined') {
  // Intentional console.log — this is a debug signal we want
  // visible in the Xcode console on every native-app boot and in
  // the browser devtools on every web page load. Helps confirm
  // which storage backend is active without inspecting state.
  // eslint-disable-next-line no-console
  console.log(
    '[supabase] Using',
    isCapacitor ? 'localStorage client' : 'SSR cookie client'
  );
}

// ── Browser Client (for Client Components) ──
//
// Same exported signature as before; call sites don't change.

export function createClient() {
  if (isCapacitor) {
    // Supabase JS v2 defaults `flowType` to `'pkce'`, which
    // requires a server-side code exchange via a URL callback.
    // Inside the Capacitor webview at `betautopsy://localhost`
    // there is no server to receive the exchange, and the SDK's
    // internal "wait for the auth code to round-trip" loop hangs
    // `signInWithPassword` indefinitely — even though password
    // auth conceptually has nothing to do with OAuth / PKCE.
    //
    // Switch to `'implicit'` so the access token comes back
    // directly in the password-grant response. Also turn off
    // `detectSessionInUrl` because that feature scans the
    // current URL for `#access_token=...` fragments, which can
    // also stall at custom URL schemes. `persistSession` and
    // `autoRefreshToken` are the defaults but stated
    // explicitly for clarity.
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
