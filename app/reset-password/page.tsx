'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';
import { Suspense } from 'react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if URL has an explicit error from Supabase (truly expired link)
  const urlError = searchParams.get('error_description');
  const hasHashToken = typeof window !== 'undefined' && window.location.hash.includes('access_token');

  useEffect(() => {
    const supabase = createClient();

    // Listen for PASSWORD_RECOVERY event — this fires when Supabase
    // processes the recovery token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Give Supabase a moment to process the hash token, then check session
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      }
      setChecking(false);
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
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

  // Only show expired if there's a URL error AND no valid session was established
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <Logo size="md" variant="stacked" theme="dark" />
          <h1 className="font-bold text-2xl text-fg-bright mt-6">Reset link expired</h1>
          <p className="text-fg-muted text-sm">
            This password reset link is invalid or has expired. Please request a new one from the login page.
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-fg-muted font-mono text-sm animate-pulse">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
