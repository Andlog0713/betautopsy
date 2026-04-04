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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
      setLoading(false);
      return;
    }

    trackSignup();
    // Welcome email sent via daily onboarding cron (1hr+ delay so it doesn't compete with the UI)
    router.push(next || '/');
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
    <div className="case-card p-8 animate-fade-in">
      <div className="bg-scalpel-muted border border-scalpel/20 rounded-sm p-3 text-center mb-4">
        <p className="text-scalpel text-sm font-medium">Limited time: your first full report is free. No credit card.</p>
      </div>
      <h2 className="font-bold text-2xl mb-6 text-center text-fg-bright">Create your account</h2>

      <OAuthButtons next={next} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.04]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface px-3 font-mono text-[10px] text-fg-dim tracking-wider">OR</span>
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

        {error && (
          <p className="text-bleed text-sm font-mono">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full font-mono">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-fg-muted text-sm text-center mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-scalpel hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="case-card p-8 h-96 animate-pulse" />}>
      <SignupForm />
    </Suspense>
  );
}
