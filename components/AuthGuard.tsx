'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/components/AuthProvider';

/**
 * Client-side auth guard.
 *
 * Consumes the app-wide `AuthProvider` context (single `getUser()` per
 * page load) and:
 *
 *   1. Redirects unauthenticated users to `/login`.
 *   2. Redirects unverified email-signup users to `/signup?verify=true`
 *      (OAuth users like Google are considered auto-verified — they
 *      have `email_confirmed_at` set at signup — so they pass through
 *      even in the edge case where that flag is briefly missing).
 *   3. Renders a neutral loading state until the check completes.
 *   4. Renders `children` once auth is confirmed.
 *
 * Why this exists: `middleware.ts` performs exactly these gates on
 * the web build on every navigation. The mobile (Capacitor)
 * `output: 'export'` build does not run middleware, so a
 * client-side replacement is required. On web this component is a
 * harmless double-check on top of middleware, so it's safe to mount
 * unconditionally.
 *
 * Security posture: this is a UX gate, not a security boundary.
 * Every API route (`app/api/**` on web) and every admin-sensitive
 * query enforces its own `auth.getUser()` + `is_admin` check
 * server-side, so a user who bypasses this guard still can't read
 * any data they aren't entitled to.
 */
export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const auth = useAuthState();

  useEffect(() => {
    if (auth.status === 'anon') {
      router.replace('/login');
      return;
    }
    if (auth.status === 'no-snapshot' || auth.status === 'has-snapshot') {
      // OAuth users (Google) are auto-verified by Supabase at signup,
      // so `email_confirmed_at` is already set. The provider check is
      // a belt-and-suspenders safeguard in case that guarantee ever
      // slips — we'd rather let a Google user through than bounce
      // them to `/signup?verify=true` where they have no path forward.
      const provider = auth.user.app_metadata?.provider;
      const isOAuth = provider === 'google';
      if (!auth.user.email_confirmed_at && !isOAuth) {
        router.replace('/signup?verify=true');
      }
    }
  }, [auth, router]);

  const verified =
    (auth.status === 'no-snapshot' || auth.status === 'has-snapshot') &&
    (!!auth.user.email_confirmed_at || auth.user.app_metadata?.provider === 'google');

  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted font-mono text-sm animate-pulse">
          Checking auth…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
