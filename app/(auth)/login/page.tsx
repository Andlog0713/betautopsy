'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { isMobileApp } from '@/lib/platform';
import OAuthButtons from '@/components/OAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Reverse auth gate: if the user is already signed in and their
  // email is verified (or they're an OAuth user), bounce to the
  // dashboard. This replaces the auth-route redirect that
  // `middleware.ts` performs on web, for the mobile (static export)
  // build where middleware doesn't run. On web this is a harmless
  // double-check on top of middleware.
  //
  // We deliberately do NOT redirect unverified email-signup users —
  // they need to be able to hit /login to resend confirmation /
  // recover their password without being bounced back to
  // /signup?verify=true in a loop.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const isOAuth = user.app_metadata?.provider === 'google';
      if (user.email_confirmed_at || isOAuth) {
        router.replace('/dashboard');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    // Verbose logging for the Capacitor bring-up: we want a log
    // line before AND after the call so we can tell the
    // difference between "never fired" and "fired but hung". Also
    // wrap in try/catch so any thrown error surfaces in the
    // Xcode console instead of being swallowed by the await.
    // Promise.race against a 15s timeout means a hung SDK call
    // eventually surfaces a readable error instead of leaving
    // the button stuck on "Signing in..." forever.
    // eslint-disable-next-line no-console
    console.log('[auth] calling signInWithPassword...');

    let signInError: Error | null = null;
    try {
      const AUTH_TIMEOUT_MS = 15_000;
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      const timeoutPromise = new Promise<{
        data: null;
        error: Error;
      }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              data: null,
              error: new Error(
                `[auth] timeout after ${AUTH_TIMEOUT_MS}ms — the Supabase auth endpoint did not respond`
              ),
            }),
          AUTH_TIMEOUT_MS
        )
      );
      const { data, error } = await Promise.race([authPromise, timeoutPromise]);
      // eslint-disable-next-line no-console
      console.log(
        '[auth] signInWithPassword result:',
        error ? error.message : 'success',
        data?.user?.email ?? ''
      );
      signInError = error as Error | null;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[auth] EXCEPTION:', e);
      signInError =
        e instanceof Error ? e : new Error('Unknown auth exception');
    }

    if (signInError) {
      const msg = signInError.message.toLowerCase().includes('email not confirmed')
        ? 'Please confirm your email first. Check your inbox for the confirmation link.'
        : signInError.message;
      setError(msg);
      setLoading(false);
      return;
    }

    // Increment login count for returning-user redirect
    await supabase.rpc('increment_login_count');

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="case-card p-8 animate-fade-in">
      <p className="text-fg-muted text-sm text-center mb-2">Your betting behavior doesn&apos;t lie. Let&apos;s see what&apos;s changed.</p>
      <h2 className="font-bold text-2xl mb-6 text-center text-fg-bright">Welcome back</h2>

      {/*
       * OAuth flow (Google / Discord) is hidden in the Capacitor
       * native app. The redirect lands on `/auth/callback`, which
       * is excluded from the mobile build entirely by
       * `scripts/build-mobile.sh`, so there would be nowhere for
       * the OAuth provider to send the user back to. We'll wire
       * this up properly later via Capacitor's App plugin deep-
       * link listener + a native URL scheme redirect. Until then,
       * email/password is the only supported path on mobile.
       */}
      {!isMobileApp() && (
        <>
          <OAuthButtons />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-1 px-3 font-mono text-[10px] text-fg-dim tracking-wider">OR</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p className="text-bleed text-sm font-mono">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full font-mono">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <button
        onClick={async () => {
          if (!email) { setError('Enter your email above first.'); return; }
          setError('');
          const supabase = createClient();
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          setResetSent(true);
        }}
        className="text-fg-muted hover:text-scalpel transition-colors mt-3 block mx-auto font-mono text-xs py-2 px-3"
      >
        Forgot your password?
      </button>
      {resetSent && (
        <p className="text-scalpel text-sm text-center mt-2 font-mono">Check your email for a reset link. Check spam if you don&apos;t see it.</p>
      )}

      <p className="text-fg-muted text-sm text-center mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-scalpel hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
