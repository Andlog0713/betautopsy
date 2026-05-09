'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient as createClient } from '@/lib/supabase-browser';
import type { Profile } from '@/types';

/**
 * App-wide auth + snapshot state.
 *
 * Cold-start contract (iOS-PR-1 Phase 3):
 *   - First render seeds state synchronously from `localStorage`
 *     under key `ba-auth-cache-v1`. Cold marketing pages get correct
 *     SmartCTALink routing on the first paint with zero network
 *     traffic, as long as the cache is fresh (<24h).
 *   - There is NO automatic network revalidation on mount. The
 *     network fetch only fires when something explicitly calls
 *     `revalidate()` — currently AuthGuard on dashboard mount, plus
 *     the post-login / post-signup flows. Marketing pages never
 *     trigger one.
 *   - `signOut()` clears the cache synchronously *before* invoking
 *     `supabase.auth.signOut()` so any redirect that runs after the
 *     promise resolves doesn't briefly read stale "has-snapshot"
 *     state from cache.
 *
 * Status enum (unchanged from the legacy provider so consumers
 * don't need to migrate):
 *   - `loading`       — no cache, no fetch yet
 *   - `anon`          — no Supabase user
 *   - `no-snapshot`   — authed user with no autopsy_reports snapshot
 *   - `has-snapshot`  — authed user with at least one snapshot
 *
 * Cache TTL is 24h — stale entries are treated as a cache miss. The
 * tradeoff: a marketing-only visitor who hasn't opened the dashboard
 * in 24h sees `loading` on cold start instead of an instant cached
 * answer. Per Andrew (2026-05-08 decision): acceptable.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'no-snapshot'; user: User; profile: Profile | null }
  | { status: 'has-snapshot'; user: User; profile: Profile | null; snapshotId: string };

interface AuthContextValue {
  state: AuthState;
  /** Fetch user/profile/snapshot, write cache, update state. Deduped. */
  revalidate: () => Promise<void>;
  /** Clear cache, drop state to anon, then call `supabase.auth.signOut()`. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  state: { status: 'loading' },
  revalidate: async () => {},
  signOut: async () => {},
});

export function useAuthState(): AuthState {
  return useContext(AuthContext).state;
}

export function useAuthRevalidate(): () => Promise<void> {
  return useContext(AuthContext).revalidate;
}

export function useAuthSignOut(): () => Promise<void> {
  return useContext(AuthContext).signOut;
}

const CACHE_KEY = 'ba-auth-cache-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  userId: string;
  email: string;
  profile: Profile | null;
  snapshotId: string | null;
  hasActiveSnapshot: boolean;
  cachedAt: number;
}

function readCache(): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      typeof parsed?.cachedAt !== 'number' ||
      Date.now() - parsed.cachedAt > CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* Safari private mode / quota — silent */
  }
}

function clearCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* silent */
  }
}

function stateFromCache(entry: CacheEntry): AuthState {
  // Reconstruct a User-shaped object from cached id+email. The full
  // `User` type from supabase-js carries app_metadata, identities,
  // etc. — anything beyond id/email read from cached state should be
  // a code smell. If a consumer needs more, call revalidate() first
  // to overwrite cached state with fresh data from getUser().
  const user = { id: entry.userId, email: entry.email } as User;
  if (entry.hasActiveSnapshot && entry.snapshotId) {
    return {
      status: 'has-snapshot',
      user,
      profile: entry.profile,
      snapshotId: entry.snapshotId,
    };
  }
  return { status: 'no-snapshot', user, profile: entry.profile };
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronous first-render seed. SSR returns 'loading' (no window);
  // the very first client render reads the cache and sets state in
  // one pass, so SmartCTALink renders correct routing on first paint
  // for any user whose cache is fresh.
  const [state, setState] = useState<AuthState>(() => {
    const cached = readCache();
    return cached ? stateFromCache(cached) : { status: 'loading' };
  });

  // Dedupe concurrent revalidate() calls (e.g. AuthGuard mount races
  // with a post-login revalidate). The first call's promise is
  // returned to subsequent callers so they don't double-fetch.
  const inFlight = useRef<Promise<void> | null>(null);

  const revalidate = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const supabase = createClient();
    const promise = (async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      // No session, or token rejected at the auth server. Treat as
      // logged out: clear cache so a subsequent cold load doesn't
      // re-render stale "has-snapshot" state.
      if (userError || !user) {
        clearCache();
        setState({ status: 'anon' });
        return;
      }

      const [
        { data: profileData, error: profileError },
        { data: snapshotData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('autopsy_reports')
          .select('id')
          .eq('user_id', user.id)
          .eq('report_type', 'snapshot')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // RLS-class 401 surfaces here when getUser() succeeded with a
      // cached/refreshed session but the row-level access has since
      // been revoked. Drop to anon and clear cache.
      if (profileError && (profileError as { status?: number }).status === 401) {
        clearCache();
        setState({ status: 'anon' });
        return;
      }

      const profile = (profileData as Profile | null) ?? null;
      const snapshotId = (snapshotData?.id as string | undefined) ?? null;
      const hasActiveSnapshot = Boolean(snapshotId);

      writeCache({
        userId: user.id,
        email: user.email ?? '',
        profile,
        snapshotId,
        hasActiveSnapshot,
        cachedAt: Date.now(),
      });

      if (hasActiveSnapshot && snapshotId) {
        setState({ status: 'has-snapshot', user, profile, snapshotId });
      } else {
        setState({ status: 'no-snapshot', user, profile });
      }
    })();

    inFlight.current = promise;
    try {
      await promise;
    } finally {
      inFlight.current = null;
    }
  }, []);

  const signOut = useCallback(async () => {
    // Clear cache + state synchronously *before* hitting the Supabase
    // network call. Any redirect that runs after `signOut()` resolves
    // will see anon state immediately, with no risk of a brief flash
    // of cached "has-snapshot" state on the destination page.
    clearCache();
    setState({ status: 'anon' });
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Network may have failed, but local state is already correct.
      // Supabase tokens persist in localStorage on a failed signOut;
      // they'll be cleared on the next successful one.
    }
  }, []);

  // No mount-time fetch. AuthGuard triggers revalidate() on dashboard
  // mount; login/signup pages trigger it after a successful auth call.
  // Marketing pages have neither — without the flip below, a visitor
  // whose cache is missing or expired (>24h) would be stuck on the
  // 'loading' seed forever, leaving SmartCTALink rendered as
  // <button disabled> and NavBar showing the loading placeholder
  // (no Login/Signup links). Flip 'loading' → 'anon' once on mount;
  // explicit revalidate() callers overwrite this when they fire.
  useEffect(() => {
    setState((prev) => (prev.status === 'loading' ? { status: 'anon' } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ state, revalidate, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
