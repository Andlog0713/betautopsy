import { Metadata } from 'next';
import type { User } from '@supabase/supabase-js';
import DashboardShell from './DashboardShell';
import SWRProvider from '@/components/SWRProvider';
import AuthBootstrap from '@/components/AuthBootstrap';
import { isMobileBuild } from '@/lib/platform';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Profile } from '@/types';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser: User | null = null;
  let initialProfile: Profile | null = null;

  // Mobile (Capacitor) builds run as `output: 'export'` — every dashboard
  // page is prerendered at build time with no real request context.
  // `getUser()` would return null on every prerender and the seed would be
  // useless. Skip the server fetch; the existing client-side <AuthGuard>
  // in DashboardShell handles auth in the native webview.
  //
  // Web: fetch user + profile to seed AuthBootstrap. We do NOT redirect on
  // missing user here — auth gating for the actually-protected dashboard
  // routes is owned by middleware.ts (`protectedRoutes`), which already
  // redirects anon users from /dashboard/upload/uploads/bets/reports/
  // settings/admin to /login. /pricing intentionally lives in this group
  // but is publicly visitable by anon users (marketing CTAs land there);
  // a layout-level redirect would break that flow.
  if (!isMobileBuild()) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      initialUser = user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      initialProfile = (profile as Profile | null) ?? null;
    }
  }

  return (
    <SWRProvider>
      <AuthBootstrap initialUser={initialUser} initialProfile={initialProfile}>
        <DashboardShell>{children}</DashboardShell>
      </AuthBootstrap>
    </SWRProvider>
  );
}
