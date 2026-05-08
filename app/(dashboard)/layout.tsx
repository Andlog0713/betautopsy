import { Metadata } from 'next';
import DashboardShell from './DashboardShell';
import SWRProvider from '@/components/SWRProvider';
import AuthBootstrap from '@/components/AuthBootstrap';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Static layout, no server-side fetch. Reverts the server seed introduced in
// PR 2 phase 2: that path made every dashboard route ƒ Dynamic and put a
// Vercel function execution + Supabase auth round-trip on the critical
// render path of every Cmd+R, costing ~5s on warm cache before any client
// JS even ran. The SWR layer below already hydrates user/profile/bets/
// reports synchronously from localStorage on first render, which gets us
// to "instant paint" without paying for the server seed. AuthGuard
// continues to gate auth client-side from useUser() and redirects when
// the cached user resolves to null after revalidation.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <AuthBootstrap>
        <DashboardShell>{children}</DashboardShell>
      </AuthBootstrap>
    </SWRProvider>
  );
}
