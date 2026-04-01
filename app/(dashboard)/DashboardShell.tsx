'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase';
import { PrivacyProvider, EyeToggle } from '@/components/PrivacyContext';
import FeedbackButton from '@/components/FeedbackButton';
import type { Profile } from '@/types';

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconHistory({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconReport({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconPricing({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9z" /><path d="M2 9h20" /><path d="M12 22L6 9" /><path d="M12 22l6-13" />
    </svg>
  );
}

function IconSignOut({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconArrowUpRight({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/upload', label: 'Upload Bets', Icon: IconUpload },
  { href: '/bets', label: 'Bet History', Icon: IconHistory },
  { href: '/uploads', label: 'Uploads', Icon: IconFolder },
  { href: '/reports', label: 'Reports', Icon: IconReport },
];

function IconAdmin({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const bottomNavItems = [
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data as Profile);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted font-mono text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  const tier = profile?.subscription_tier ?? 'free';

  const activeClass = 'bg-scalpel-muted text-scalpel border-l-2 border-scalpel';
  const inactiveClass = 'text-fg-muted hover:text-fg hover:bg-white/[0.03] border-l-2 border-transparent';

  return (
    <PrivacyProvider>
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top nav */}
      <header className="md:hidden border-b border-white/[0.04] bg-surface sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Logo size="xs" variant="horizontal" theme="dark" />
            </Link>
            {(profile?.streak_count ?? 0) > 0 && (
              <span className="font-mono text-[10px] text-scalpel">🔥{profile?.streak_count}</span>
            )}
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
            className="text-fg-dim hover:text-fg p-1.5 rounded-sm hover:bg-white/[0.03] transition-colors"
          >
            {mobileNavOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        {mobileNavOpen && (
          <nav className="border-t border-white/[0.04] px-3 py-3 space-y-0.5 animate-fade-in bg-surface">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-[11px] tracking-wider transition-colors ${
                  pathname === item.href
                    ? 'bg-scalpel-muted text-scalpel'
                    : 'text-fg-muted hover:text-fg hover:bg-white/[0.03]'
                }`}
              >
                <item.Icon />
                {item.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-[11px] tracking-wider transition-colors ${
                pathname === '/pricing'
                  ? 'bg-scalpel-muted text-scalpel'
                  : 'text-fg-muted hover:text-fg hover:bg-white/[0.03]'
              }`}
            >
              <IconPricing />
              Pricing
            </Link>
            {profile?.is_admin && (
              <Link
                href="/admin/reports"
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-[11px] tracking-wider transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-scalpel-muted text-scalpel'
                    : 'text-fg-muted hover:text-fg hover:bg-white/[0.03]'
                }`}
              >
                <IconAdmin />
                Admin
              </Link>
            )}
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-[11px] tracking-wider transition-colors ${
                  pathname === item.href
                    ? 'bg-scalpel-muted text-scalpel'
                    : 'text-fg-muted hover:text-fg hover:bg-white/[0.03]'
                }`}
              >
                <item.Icon />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/[0.04] pt-3 mt-3 px-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] text-fg-dim truncate">{profile?.email}</p>
                  <span className="font-mono text-[9px] tracking-wider uppercase text-scalpel">{tier}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-fg-dim hover:text-loss p-1.5 rounded-sm hover:bg-white/[0.03] transition-colors"
                  aria-label="Sign out"
                >
                  <IconSignOut />
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 border-r border-white/[0.04] bg-surface sticky top-0 h-screen">
        <div className="px-5 pt-5 pb-4">
          <Link href="/dashboard">
            <Logo size="xs" variant="horizontal" theme="dark" />
          </Link>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-sm font-mono text-[11px] tracking-wider transition-all duration-150 ${
                pathname === item.href ? activeClass : inactiveClass
              }`}
            >
              <item.Icon />
              {item.label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            {profile?.is_admin && (
              <Link
                href="/admin/reports"
                className={`flex items-center gap-3 px-3 py-2 rounded-sm font-mono text-[11px] tracking-wider transition-all duration-150 ${
                  pathname.startsWith('/admin') ? activeClass : inactiveClass
                }`}
              >
                <IconAdmin />
                Admin
              </Link>
            )}
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-sm font-mono text-[11px] tracking-wider transition-all duration-150 ${
                  pathname === item.href ? activeClass : inactiveClass
                }`}
              >
                <item.Icon />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-white/[0.04] space-y-3">
          {tier === 'free' && (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1.5 font-mono text-[11px] tracking-wider bg-scalpel-muted text-scalpel hover:bg-scalpel/15 rounded-sm px-3 py-2 transition-colors border border-scalpel/20"
            >
              Upgrade to Pro
              <IconArrowUpRight />
            </Link>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-surface-raised border border-white/[0.06] flex items-center justify-center text-[10px] font-mono font-medium text-fg-dim shrink-0">
              {(profile?.display_name?.[0] ?? profile?.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-mono text-[10px] text-fg truncate">{profile?.display_name ?? profile?.email}</p>
                {(profile?.streak_count ?? 0) > 0 && (
                  <span className="font-mono text-[9px] text-scalpel shrink-0" title={`${profile?.streak_count}-week autopsy streak`}>🔥{profile?.streak_count}</span>
                )}
              </div>
              <span className="font-mono text-[9px] tracking-wider uppercase text-scalpel">{tier}</span>
            </div>
            <EyeToggle />
            <button
              onClick={handleSignOut}
              className="text-fg-dim hover:text-loss transition-colors shrink-0 p-1 rounded-sm hover:bg-white/[0.03]"
              title="Sign out"
            >
              <IconSignOut />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {children}
        </div>
        <footer className="text-center py-6 px-4 space-y-2">
          <Link href="/privacy" className="font-mono text-[10px] text-fg-dim hover:text-fg transition-colors tracking-wider">
            Privacy Policy
          </Link>
          <p className="font-mono text-[9px] text-fg-dim tracking-wider max-w-xl mx-auto leading-relaxed">
            BETAUTOPSY PROVIDES BEHAVIORAL ANALYSIS AND EDUCATIONAL INSIGHTS — NOT
            GAMBLING OR FINANCIAL ADVICE. PAST RESULTS DON&apos;T GUARANTEE FUTURE OUTCOMES.
            21+. IF YOU OR SOMEONE YOU KNOW HAS A GAMBLING PROBLEM, CALL 1-800-GAMBLER.
          </p>
        </footer>
      </main>
      <FeedbackButton />
    </div>
    </PrivacyProvider>
  );
}
