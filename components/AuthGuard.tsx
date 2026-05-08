'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useAuthRevalidate } from '@/components/AuthProvider';

/**
 * Client-side auth guard.
 *
 * Sources auth state from `useUser()` (the SWR layer with localStorage
 * cache + AuthBootstrap fallback seed) instead of the legacy `AuthProvider`
 * context. The cache hydrates synchronously on mount, so on every cold
 * load / Cmd+R the user object is already present and we render children
 * without blocking on a network round-trip.
 *
 * Three render branches:
 *
 *   1. We have a user (cached, seeded, or freshly fetched) → render children
 *      optimistically. Background revalidation continues; if it returns
 *      `user: null` (stale-cache + revoked session), the effect below
 *      redirects to /login.
 *   2. No user yet AND a fetch is in flight (first-ever visit, no cache,
 *      no seed) → show the neutral "Checking auth…" gate.
 *   3. No user, fetch resolved → confirmed unauth. The effect redirects;
 *      we render null while the navigation runs.
 *
 * Why this exists: `middleware.ts` performs the same gates on the web
 * build. The mobile (Capacitor) `output: 'export'` build does not run
 * middleware, so a client-side replacement is required. On web this
 * component is a harmless double-check on top of middleware.
 *
 * Security posture: this is a UX gate, not a security boundary. Every
 * API route enforces its own auth check server-side, so a user who
 * bypasses this guard still can't read any data they aren't entitled to.
 */
export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, error } = useUser();
  const revalidateAuthCache = useAuthRevalidate();

  // AuthGuard owns AuthProvider's revalidate trigger: marketing pages
  // never fire one (they only read cached state synchronously), so
  // entering the dashboard is when AuthProvider's cache gets refreshed
  // against the server. Fires once per AuthGuard mount; AuthProvider
  // dedupes if a post-login revalidate is already in flight.
  useEffect(() => {
    void revalidateAuthCache();
  }, [revalidateAuthCache]);

  // OAuth (Google) users are auto-verified by Supabase at signup, so
  // `email_confirmed_at` is already set. The provider check is a
  // belt-and-suspenders safeguard in case that guarantee ever slips —
  // we'd rather let a Google user through than bounce them to
  // `/signup?verify=true` where they have no path forward.
  const provider = user?.app_metadata?.provider;
  const isOAuth = provider === 'google';
  const verifiedEmail = !!user?.email_confirmed_at || isOAuth;

  useEffect(() => {
    // Confirmed unauth: SWR finished revalidating and returned no user.
    // Covers both first-time visitors and the stale-cache case where the
    // cached value was a real user but the session has since been revoked
    // (revalidation overwrites the stale entry with `user: null`).
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    // Fetcher threw — network failure, invalid token surfacing as an
    // exception, etc. Treat as auth failure, send to /login.
    if (error) {
      router.replace('/login');
      return;
    }
    // Email-verification gate, only meaningful once a user is present.
    if (user && !verifiedEmail) {
      router.replace('/signup?verify=true');
    }
  }, [user, isLoading, error, verifiedEmail, router]);

  // Render optimistically the moment we have a user — cached, seeded, or
  // fresh. Don't gate on isLoading or background revalidation.
  if (user && verifiedEmail) {
    return <>{children}</>;
  }

  // No user yet AND a fetch is in flight. Truly-first-time visit, no
  // cache, no seed. Show the neutral gate so we don't render an empty
  // shell that'll snap into shape a moment later.
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted font-mono text-sm animate-pulse">
          Checking auth…
        </div>
      </div>
    );
  }

  // No user, fetch resolved → effect above is redirecting. Render nothing
  // during the navigation.
  return null;
}
