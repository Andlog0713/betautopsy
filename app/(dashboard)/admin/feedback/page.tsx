'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient as createClient } from '@/lib/supabase-browser';
import type { Profile } from '@/types';
import FeedbackStream from './FeedbackStream';

/**
 * Admin feedback page.
 *
 * Previously a Server Component that called `createServerSupabaseClient()`
 * and redirected unauthenticated / non-admin users server-side. That
 * pattern uses `cookies()` from `next/headers`, which the mobile
 * (`output: 'export'`) build can't run.
 *
 * Now the auth + admin check runs client-side via the browser
 * Supabase client. Security is unchanged: the underlying
 * `/api/admin/feedback` route still performs its own server-side
 * `is_admin` check against the session, so a non-admin who bypasses
 * this gate client-side still can't read any feedback rows.
 */
type AuthState = 'checking' | 'admin' | 'forbidden';

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (cancelled) return;

      if (!profile || !(profile as Profile).is_admin) {
        router.replace('/dashboard');
        setState('forbidden');
        return;
      }

      setState('admin');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state !== 'admin') {
    // Neutral placeholder while the auth check resolves. Avoids
    // flashing the admin UI before we know the user is an admin.
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg-bright">Feedback Stream</h1>
          <p className="text-fg-muted text-sm mt-1">Checking permissions…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg-bright">Feedback Stream</h1>
        <p className="text-fg-muted text-sm mt-1">All user feedback, sorted by recency</p>
      </div>
      <FeedbackStream />
    </div>
  );
}
