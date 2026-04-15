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

const isCapacitor =
  typeof window !== 'undefined' &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  !!(window as any).Capacitor?.isNativePlatform?.();

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
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
