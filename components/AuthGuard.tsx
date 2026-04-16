'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

/**
 * Client-side auth guard.
 *
 * Runs `supabase.auth.getUser()` on mount and:
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
 * harmless double-check on top of middleware and the existing
 * shell-level profile fetch, so it's safe to mount unconditionally.
 *
 * Security posture: this is a UX gate, not a security boundary.
 * Every API route (`app/api/**` on web) and every admin-sensitive
 * query enforces its own `auth.getUser()` + `is_admin` check
 * server-side, so a user who bypasses this guard still can't read
 * any data they aren't entitled to.
 */
type AuthState = 'checking' | 'authenticated';

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>('checking');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      // OAuth users (Google) are auto-verified by Supabase at signup,
      // so `email_confirmed_at` is already set. The provider check is
      // a belt-and-suspenders safeguard in case that guarantee ever
      // slips — we'd rather let a Google user through than bounce
      // them to `/signup?verify=true` where they have no path
      // forward.
      const provider = user.app_metadata?.provider;
      const isOAuth = provider === 'google';

      if (!user.email_confirmed_at && !isOAuth) {
        router.replace('/signup?verify=true');
        return;
      }

      setState('authenticated');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state !== 'authenticated') {
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
