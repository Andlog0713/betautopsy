'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { PrivacyProvider, EyeToggle } from '@/components/PrivacyContext';
import FeedbackButton from '@/components/FeedbackButton';
import type { Profile } from '@/types';

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconHistory({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconReport({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconPricing({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9z" /><path d="M2 9h20" /><path d="M12 22L6 9" /><path d="M12 22l6-13" />
    </svg>
  );
}

function IconSignOut({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconArrowUpRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const bottomNavItems = [
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

export default function DashboardLayout({
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
        <div className="text-ink-600 animate-pulse">Loading...</div>
      </div>
    );
  }

  const tier = profile?.subscription_tier ?? 'free';

  const tierBadge: Record<string, string> = {
    free: 'bg-ink-700/30 text-ink-500 border border-white/[0.06]',
    pro: 'bg-flame-500/10 text-flame-500 border border-flame-500/20',
    sharp: 'bg-mint-500/10 text-mint-500 border border-mint-500/20',
  };

  return (
    <PrivacyProvider>
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top nav */}
      <header className="md:hidden border-b border-white/[0.06] bg-ink-900/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="font-bold text-lg tracking-tight">
            Bet<span className="text-flame-500">Autopsy</span>
          </Link>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="text-ink-600 hover:text-[#F0F0F0] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            {mobileNavOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        {mobileNavOpen && (
          <nav className="border-t border-white/[0.06] px-3 py-3 space-y-0.5 animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-flame-500/10 text-flame-500'
                    : 'text-ink-600 hover:text-[#F0F0F0] hover:bg-white/[0.04]'
                }`}
              >
                <item.Icon />
                {item.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/pricing'
                  ? 'bg-flame-500/10 text-flame-500'
                  : 'text-ink-600 hover:text-[#F0F0F0] hover:bg-white/[0.04]'
              }`}
            >
              <IconPricing />
              Pricing
            </Link>
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-flame-500/10 text-flame-500'
                    : 'text-ink-600 hover:text-[#F0F0F0] hover:bg-white/[0.04]'
                }`}
              >
                <item.Icon />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/[0.06] pt-3 mt-3 px-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink-500 truncate">{profile?.email}</p>
                  <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 capitalize ${tierBadge[tier]}`}>
                    {tier}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-ink-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                  title="Sign out"
                >
                  <IconSignOut />
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 border-r border-white/[0.06] bg-ink-800/30 sticky top-0 h-screen">
        <div className="px-5 pt-6 pb-4">
          <Link href="/dashboard" className="font-bold text-xl tracking-tight">
            Bet<span className="text-flame-500">Autopsy</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                pathname === item.href
                  ? 'bg-flame-500/10 text-flame-500'
                  : 'text-ink-600 hover:text-[#F0F0F0] hover:bg-white/[0.04]'
              }`}
            >
              <item.Icon />
              {item.label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  pathname === item.href
                    ? 'bg-flame-500/10 text-flame-500'
                    : 'text-ink-600 hover:text-[#F0F0F0] hover:bg-white/[0.04]'
                }`}
              >
                <item.Icon />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-white/[0.06] space-y-3">
          {tier === 'free' && (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1.5 text-[13px] font-medium bg-flame-500/10 text-flame-500 hover:bg-flame-500/20 rounded-lg px-3 py-2 transition-colors"
            >
              Upgrade to Pro
              <IconArrowUpRight />
            </Link>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-ink-700/40 border border-white/[0.08] flex items-center justify-center text-xs font-semibold text-ink-500 shrink-0">
              {(profile?.display_name?.[0] ?? profile?.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#F0F0F0] truncate">{profile?.display_name ?? profile?.email}</p>
              <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 capitalize ${tierBadge[tier]}`}>
                {tier}
              </span>
            </div>
            <EyeToggle />
            <button
              onClick={handleSignOut}
              className="text-ink-700 hover:text-red-400 transition-colors shrink-0 p-1 rounded hover:bg-white/[0.04]"
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
          <Link href="/privacy" className="text-ink-700 text-xs hover:text-ink-500 transition-colors">
            Privacy Policy
          </Link>
          <p className="text-ink-700 text-xs">
            BetAutopsy provides behavioral analysis and educational insights — not
            gambling or financial advice. Past results don&apos;t guarantee future outcomes.
            21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
          </p>
        </footer>
      </main>
      <FeedbackButton />
    </div>
    </PrivacyProvider>
  );
}
