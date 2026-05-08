import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { preferencesStorage } from './preferences-storage';

// Singleton browser-side Supabase client used by all SWR hooks.
//
// Compile-time branching on NEXT_PUBLIC_BUILD_TARGET: webpack inlines the
// env literal during build, so the unreachable branch is dead-code-
// eliminated. Web bundle drops the `@supabase/supabase-js` direct import
// (it still arrives transitively via `@supabase/ssr`, but that path
// lazy-loads sub-modules and skips realtime when not subscribed). Mobile
// (Capacitor) builds keep `@supabase/supabase-js` because cookies are
// unreliable at `capacitor://localhost` in WKWebView — `flowType:
// 'implicit'` + Capacitor Preferences (see `auth.storage` below) is the
// only reliable session-persistence path inside the native webview.
//
// Lazy + cached so every hook call returns the same instance, preventing
// the "Multiple GoTrueClient instances detected" warning.

const IS_MOBILE_BUILD = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';

let cached: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  if (IS_MOBILE_BUILD) {
    cached = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Capacitor Preferences-backed storage. Survives WKWebView
          // localStorage eviction (low-disk pressure, "Offload Unused
          // Apps", privacy cleanup) which would otherwise sign users
          // out silently between launches. See `lib/preferences-storage.ts`
          // for the adapter and rationale.
          storage: preferencesStorage,
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
    ) as unknown as SupabaseClient;
  }

  return cached;
}
