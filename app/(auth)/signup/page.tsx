'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import OAuthButtons from '@/components/OAuthButtons';

export default function SignupPage() {
  const router = useRouter();
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

    // If email confirmation is required, show the check-email screen
    // Supabase returns a user with identities=[] when email needs confirmation
    if (data.user && (!data.user.identities || data.user.identities.length === 0 || !data.session)) {
      setEmailSent(true);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (emailSent) {
    return (
      <div className="card p-8 animate-fade-in text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-flame-500/10 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-flame-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="font-bold text-2xl">Check your email</h2>
        <p className="text-ink-600 text-sm max-w-xs mx-auto">
          We sent a confirmation link to <span className="text-[#F0F0F0] font-medium">{email}</span>. Click it to activate your account.
        </p>
        <p className="text-ink-700 text-xs">
          Didn&apos;t get it? Check your spam folder, or{' '}
          <button onClick={() => setEmailSent(false)} className="text-flame-500 hover:underline">try again</button>.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-8 animate-fade-in">
      <p className="text-ink-600 text-sm text-center mb-2">Your behavioral analysis is one upload away.</p>
      <h2 className="font-bold text-2xl mb-6 text-center">Create your account</h2>

      <OAuthButtons />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-ink-950 px-3 text-ink-600">or</span>
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
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-ink-600 text-sm text-center mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-flame-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
