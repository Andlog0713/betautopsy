import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton browser-side Supabase client used by all SWR hooks.
//
// Mirrors the runtime branching that `lib/supabase.ts` has carried since
// the Capacitor session fix: web uses `@supabase/ssr`'s `createBrowserClient`
// (cookie-backed, lets middleware read the same session), Capacitor uses
// `@supabase/supabase-js` with `flowType: 'implicit'` + localStorage because
// cookies at `capacitor://localhost` are unreliable in WKWebView. Phase 5 of
// the data-layer overhaul will swap this to a compile-time gate via
// `isMobileBuild()` so webpack can fully tree-shake the unused SDK on web —
// for now the runtime branch keeps both Capacitor and web auth working.
//
// Lazy + cached so every hook call returns the same instance, preventing
// the "Multiple GoTrueClient instances detected" warning that the original
// `lib/supabase.ts` hit when each component minted its own client.

type CapacitorGlobal = {
  Capacitor?: { isNativePlatform?: () => boolean };
};
const isCapacitor =
  typeof window !== 'undefined' &&
  !!(window as unknown as CapacitorGlobal).Capacitor?.isNativePlatform?.();

let cached: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  if (isCapacitor) {
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
    ) as unknown as SupabaseClient;
  }

  return cached;
}
