import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ─── Storage backend selection ───────────────────────────────────
//
// Web (including a regular mobile browser): use `@supabase/ssr`'s
// `createBrowserClient`, which stores the session in cookies so the
// Next.js server actions / middleware can read it on the same origin.
//
// Capacitor native webview: the app is served from a custom URL
// scheme (`capacitor://localhost`). Cookies at custom schemes are
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

// ── Browser Client (for Client Components) ──
//
// Singleton: the client is created once per page load and cached.
// `isCapacitor` is a module-load constant (always one value for the
// lifetime of the bundle), so only one branch ever executes. Caching
// eliminates the "Multiple GoTrueClient instances detected in the
// same browser context" warning that fired 9+ times per session when
// every component call to `createClient()` produced a fresh instance.

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cached) return cached;

  if (isCapacitor) {
    // Supabase JS v2 defaults `flowType` to `'pkce'`, which
    // requires a server-side code exchange via a URL callback.
    // Inside the Capacitor webview there is no server to receive
    // the exchange, and the SDK's internal loop hangs
    // `signInWithPassword` indefinitely.
    //
    // `'implicit'` returns the access token directly in the
    // password-grant response. `detectSessionInUrl: false` skips
    // the startup scan for `#access_token=...` fragments, which
    // can also stall at custom URL schemes.
    cached = createSupabaseClient(
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
  } else {
    cached = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return cached;
}
