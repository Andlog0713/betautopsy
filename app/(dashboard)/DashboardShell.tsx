'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase';
import { PrivacyProvider, EyeToggle } from '@/components/PrivacyContext';
import FeedbackButton from '@/components/FeedbackButton';
import type { Profile } from '@/types';
import {
  LayoutDashboard, Upload, Clock, FolderOpen, FileText,
  Settings, Gem, LogOut, Menu, X, ArrowUpRight, Shield, Flame,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Bets', Icon: Upload },
  { href: '/bets', label: 'Bet History', Icon: Clock },
  { href: '/uploads', label: 'Uploads', Icon: FolderOpen },
  { href: '/reports', label: 'Reports', Icon: FileText },
];

const bottomNavItems = [
  { href: '/settings', label: 'Settings', Icon: Settings },
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

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-muted font-mono text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  const tier = profile?.subscription_tier ?? 'free';

  const isActive = (href: string) => pathname === href;
  const isAdminActive = pathname.startsWith('/admin');

  return (
    <PrivacyProvider>
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Mobile header ── */}
      <header className="md:hidden border-b border-border-subtle bg-base sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Logo size="xs" variant="horizontal" theme="dark" />
            </Link>
            {(profile?.streak_count ?? 0) > 0 && (
              <span className="font-mono text-[10px] text-scalpel flex items-center gap-0.5"><Flame size={10} className="text-orange-400" />{profile?.streak_count}</span>
            )}
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
            className="text-fg-dim hover:text-fg p-1.5 rounded-lg hover:bg-surface-1 transition-colors"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── Mobile slide-in nav ── */}
      {mobileNavOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          {/* Panel */}
          <nav className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[80vw] bg-base border-r border-border-subtle flex flex-col md:hidden animate-slide-in-left">
            <div className="px-5 pt-5 pb-4 flex items-center justify-between">
              <Link href="/dashboard" onClick={() => setMobileNavOpen(false)}>
                <Logo size="xs" variant="horizontal" theme="dark" />
              </Link>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="text-fg-dim hover:text-fg p-1 rounded-lg hover:bg-surface-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                      : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
                  }`}
                >
                  <item.Icon size={18} />
                  {item.label}
                </Link>
              ))}

              <div className="my-2 border-t border-border-subtle" />

              <Link
                href="/pricing"
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/pricing')
                    ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                    : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
                }`}
              >
                <Gem size={18} />
                Pricing
              </Link>

              {profile?.is_admin && (
                <Link
                  href="/admin/reports"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isAdminActive
                      ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                      : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
                  }`}
                >
                  <Shield size={18} />
                  Admin
                </Link>
              )}

              <div className="my-2 border-t border-border-subtle" />

              {bottomNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                      : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
                  }`}
                >
                  <item.Icon size={18} />
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="p-4 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-fg-dim truncate">{profile?.email}</p>
                  <span className="font-mono text-[9px] tracking-wider uppercase text-scalpel">{tier}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-fg-dim hover:text-loss p-1.5 rounded-lg hover:bg-surface-1 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </nav>
        </>
      )}

      {/* ── Desktop sidebar — collapsed by default, expands on hover ── */}
      <aside className="hidden md:flex md:flex-col md:w-14 hover:md:w-56 border-r border-border-subtle bg-base sticky top-0 h-screen transition-all duration-200 overflow-hidden group/sidebar">
        <div className="px-3 pt-5 pb-4 flex items-center justify-center group-hover/sidebar:px-5 group-hover/sidebar:justify-start transition-all duration-200">
          <Link href="/dashboard">
            <span className="group-hover/sidebar:hidden"><Logo size="xs" variant="mark" theme="dark" /></span>
            <span className="hidden group-hover/sidebar:block"><Logo size="xs" variant="horizontal" theme="dark" /></span>
          </Link>
        </div>

        <nav className="flex-1 px-1 group-hover/sidebar:px-2 space-y-0.5 transition-all duration-200">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                  : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
              }`}
            >
              <span className="shrink-0"><item.Icon size={18} /></span>
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">{item.label}</span>
            </Link>
          ))}

          <div className="my-2 border-t border-border-subtle" />

          {profile?.is_admin && (
            <Link
              href="/admin/reports"
              title="Admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isAdminActive
                  ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                  : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
              }`}
            >
              <span className="shrink-0"><Shield size={18} /></span>
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">Admin</span>
            </Link>
          )}
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                  : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
              }`}
            >
              <span className="shrink-0"><item.Icon size={18} /></span>
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-2 group-hover/sidebar:p-4 border-t border-border-subtle space-y-3 transition-all duration-200">
          {tier === 'free' && (
            <Link
              href="/pricing"
              title="Upgrade to Pro"
              className="flex items-center justify-center gap-1.5 text-[11px] bg-scalpel-muted text-scalpel hover:bg-scalpel/15 rounded-lg px-2 py-2 transition-colors border border-scalpel/20"
            >
              <ArrowUpRight size={14} />
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap font-mono tracking-wider">Upgrade to Pro</span>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-[10px] font-mono font-medium text-fg-muted shrink-0">
              {(profile?.display_name?.[0] ?? profile?.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <p className="font-mono text-[10px] text-fg truncate">{profile?.display_name ?? profile?.email}</p>
                {(profile?.streak_count ?? 0) > 0 && (
                  <span className="font-mono text-[9px] text-scalpel shrink-0 flex items-center gap-0.5" title={`${profile?.streak_count}-week autopsy streak`}><Flame size={10} className="text-orange-400" />{profile?.streak_count}</span>
                )}
              </div>
              <span className="font-mono text-[9px] tracking-wider uppercase text-scalpel">{tier}</span>
            </div>
            <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 flex items-center gap-1">
              <EyeToggle />
              <button
                onClick={handleSignOut}
                className="text-fg-dim hover:text-loss transition-colors shrink-0 p-1 rounded-lg hover:bg-surface-1"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {children}
        </div>
        <footer className="text-center py-6 px-4 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Link href="/privacy" className="font-mono text-[10px] text-fg-dim hover:text-fg transition-colors tracking-wider">
              Privacy Policy
            </Link>
            <span className="text-fg-dim text-[10px]">·</span>
            <Link href="/terms" className="font-mono text-[10px] text-fg-dim hover:text-fg transition-colors tracking-wider">
              Terms of Use
            </Link>
          </div>
          <p className="font-mono text-[9px] text-fg-dim tracking-wider max-w-xl mx-auto leading-relaxed">
            BETAUTOPSY PROVIDES BEHAVIORAL ANALYSIS AND EDUCATIONAL INSIGHTS. NOT
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
