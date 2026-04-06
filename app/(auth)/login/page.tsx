'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import OAuthButtons from '@/components/OAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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

      <OAuthButtons />

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
        className="text-sm text-fg-muted hover:text-scalpel transition-colors mt-3 block mx-auto font-mono text-xs"
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
