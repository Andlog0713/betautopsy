/**
 * Capacitor Preferences-backed storage adapter for Supabase auth.
 *
 * Why this exists: on iOS the WKWebView's localStorage is wiped
 * whenever the OS reclaims storage (background app eviction,
 * "Offload Unused Apps", low-disk pressure, sometimes a Safari
 * privacy-preserving cleanup that affects WKWebView storage too).
 * Anything we keep in localStorage can disappear without warning,
 * which means a logged-in user can be silently signed out between
 * launches. Capacitor Preferences writes through to the native
 * keychain-adjacent UserDefaults plist, which iOS treats as part
 * of the app's persistent data — it survives app suspension and
 * is only cleared on uninstall.
 *
 * Wired into Supabase via `auth.storage` in the mobile branch of
 * `lib/supabase-browser.ts`. The web branch keeps the SDK's
 * default localStorage adapter — no behavior change on web.
 *
 * Shape matches Supabase's `SupportedStorage` interface:
 *   - getItem(key): Promise<string | null>
 *   - setItem(key, value): Promise<void>
 *   - removeItem(key): Promise<void>
 *
 * All three methods are async — Supabase awaits storage calls in
 * its session-restore + token-refresh paths, so async return is
 * the natural fit.
 *
 * Why dynamic-import inside each method instead of a top-level
 * `import { Preferences } from '@capacitor/preferences'`:
 * matches the project pattern in `lib/native.ts`. The static
 * import of *this* module from `supabase-browser.ts` is cheap —
 * it just registers three method references. The actual plugin
 * code is only fetched when a method runs, which on the web bundle
 * is never (the mobile branch is dead-code-eliminated by
 * webpack's NEXT_PUBLIC_BUILD_TARGET inlining). On the mobile
 * bundle the dynamic import resolves to the bundled plugin
 * module on first call.
 *
 * Failure mode: if `@capacitor/preferences` fails to load
 * (corrupted plugin install, OS-level filesystem error), `getItem`
 * resolves null — Supabase treats that as "no session" and the
 * user lands on /login. We deliberately don't fall back to
 * localStorage: a partially-working preferences plugin must not
 * silently switch to a less durable backend, because the next
 * successful Preferences write would write to a different keyspace
 * and split the session across two stores. Hard fail → fresh
 * login → consistent state.
 */

interface SupportedStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const preferencesStorage: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value ?? null;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
    } catch {
      // Silent: a failed write means the next launch won't restore
      // the session, but throwing here would cascade into Supabase's
      // sign-in flow as if auth itself had failed.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
    } catch {
      // Silent: a failed remove during signOut is non-fatal — the
      // outer signOut() flow already cleared in-memory state and
      // is about to redirect; a stale Preferences entry will be
      // overwritten on the next successful auth action.
    }
  },
};
