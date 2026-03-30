'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Supabase automatically picks up the recovery token from the URL hash
    // when the client is initialized. We just need to wait for it.
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Also check if already in a session (e.g., page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/dashboard'), 2000);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-fg-muted font-mono text-sm animate-pulse">Verifying reset link...</div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <Logo size="md" variant="stacked" theme="dark" />
          <h1 className="font-bold text-2xl text-fg-bright mt-6">Reset link expired</h1>
          <p className="text-fg-muted text-sm">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/login" className="btn-primary inline-block font-mono text-sm">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h1 className="font-bold text-2xl text-fg-bright">Password updated</h1>
          <p className="text-fg-muted text-sm">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="md" variant="stacked" theme="dark" />
        </div>
        <div className="case-card p-6">
          <div className="case-header mb-4">SET NEW PASSWORD</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="label">New Password</label>
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
              <label htmlFor="confirmPassword" className="label">Confirm Password</label>
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
            {error && <p className="text-bleed text-sm font-mono">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full font-mono">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
        <p className="text-fg-dim text-[10px] font-mono text-center mt-8 tracking-wider">
          <Link href="/login" className="text-scalpel hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
