'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trackSignup } from '@/lib/tiktok-events';
import { createClient } from '@/lib/supabase';
import OAuthButtons from '@/components/OAuthButtons';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const showVerifyNotice = searchParams.get('verify') === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user && (!data.user.identities || data.user.identities.length === 0 || !data.session)) {
      setEmailSent(true);
      window.gtag?.('event', 'sign_up', { method: 'email' });
      setLoading(false);
      return;
    }

    trackSignup();
    // Welcome email sent via daily onboarding cron (1hr+ delay so it doesn't compete with the UI)
    router.push(next || '/dashboard?welcome=true');
    router.refresh();
  }

  if (emailSent) {
    return (
      <div className="case-card p-8 animate-fade-in text-center space-y-4">
        <div className="w-14 h-14 rounded-sm bg-scalpel-muted flex items-center justify-center mx-auto border border-scalpel/20">
          <svg className="w-7 h-7 text-scalpel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="font-bold text-2xl text-fg-bright">Check your email</h2>
        <p className="text-fg-muted text-sm max-w-xs mx-auto">
          We sent a confirmation link to <span className="text-fg-bright font-medium">{email}</span>. Click it to activate your account.
        </p>
        <p className="font-mono text-xs text-fg-muted tracking-wider">
          DIDN&apos;T GET IT? CHECK YOUR SPAM FOLDER, OR{' '}
          <button onClick={() => setEmailSent(false)} className="text-scalpel hover:underline">TRY AGAIN</button>.
        </p>
      </div>
    );
  }

  return (
    <>
      {showVerifyNotice && (
        <div className="bg-scalpel-muted border border-scalpel/20 rounded-sm p-4 mb-6">
          <p className="text-scalpel text-sm font-medium text-center">
            Check your inbox — you need to verify your email before accessing your dashboard. Didn&apos;t get it? Check your spam folder or sign up again below.
          </p>
        </div>
      )}
      <div className="case-card p-8 animate-fade-in">
      <div className="pl-3 border-l border-l-scalpel mb-4">
        <p className="text-scalpel text-sm font-medium">Full behavioral analysis from $9.99.</p>
      </div>
      <h2 className="font-bold text-2xl mb-6 text-center text-fg-bright">Create your account</h2>

      <OAuthButtons next={next} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-subtle" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface-1 px-3 font-mono text-[10px] text-fg-dim tracking-wider">OR</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">
            Display Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full"
            placeholder="Your name"
            required
          />
        </div>

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
            minLength={6}
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Re-enter Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field w-full"
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        {error && (
          <p className="text-bleed text-sm font-mono">{error}</p>
        )}

        <p className="text-fg-dim text-xs text-center">
          By signing up, you agree to our{' '}
          <a href="/terms" className="text-fg-muted hover:text-scalpel transition-colors underline">Terms of Use</a>
          {' '}and{' '}
          <a href="/privacy" className="text-fg-muted hover:text-scalpel transition-colors underline">Privacy Policy</a>.
        </p>

        <button type="submit" disabled={loading} className="btn-primary w-full font-mono">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="flex items-center justify-center gap-3 flex-wrap mt-4">
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-fg-dim">
          <svg className="w-3 h-3 text-scalpel" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7V4.5a3 3 0 0 1 6 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Never sold
        </span>
        <span className="text-fg-dim text-[10px]">·</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-fg-dim">
          <svg className="w-3 h-3 text-scalpel" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 7 3-1.5 5.5-3.5 5.5-7V4L8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          Not stored by AI
        </span>
        <span className="text-fg-dim text-[10px]">·</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-fg-dim">
          <svg className="w-3 h-3 text-scalpel" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M4 4l.7 9.1a1.5 1.5 0 0 0 1.5 1.4h3.6a1.5 1.5 0 0 0 1.5-1.4L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Delete anytime
        </span>
      </div>

      <p className="text-fg-muted text-sm text-center mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-scalpel hover:underline">
          Sign in
        </Link>
      </p>
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="case-card p-8 h-96 animate-pulse" />}>
      <SignupForm />
    </Suspense>
  );
}
