'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase';
import { triggerHaptic } from '@/lib/native';
import { isMobileApp } from '@/lib/platform';
import { PrivacyProvider, EyeToggle } from '@/components/PrivacyContext';
import FeedbackButton from '@/components/FeedbackButton';
import AuthGuard from '@/components/AuthGuard';
import NativeTabBar from '@/components/native/NativeTabBar';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import type { Profile } from '@/types';
import {
  LayoutDashboard, Upload, Clock, FolderOpen, FileText,
  Settings, Gem, LogOut, Menu, X, ArrowUpRight, Shield, Flame, MessageSquare,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Bets', Icon: Upload },
  { href: '/bets', label: 'Bet History', Icon: Clock },
  { href: '/uploads', label: 'Upload History', Icon: FolderOpen },
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
    // Wrapped in `<AuthGuard>` so unauthenticated mobile users never
    // see this "loading profile" frame — they get redirected to
    // `/login` from inside the guard instead. On web the middleware
    // has already verified the session, so this is a harmless pass-
    // through.
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-fg-muted font-mono text-sm animate-pulse">Loading...</div>
        </div>
      </AuthGuard>
    );
  }

  const tier = profile?.subscription_tier ?? 'free';
  const effectiveTier = PRICING_ENABLED ? tier : 'pro';

  const isActive = (href: string) => pathname === href;

  // Nav-item click handlers. Fire a light impact haptic on mobile
  // so nav feels tactile; on web these are no-ops (see
  // `triggerHaptic`'s `isMobileApp()` guard). The mobile variant
  // also closes the slide-in nav, matching the previous inline
  // `() => setMobileNavOpen(false)` handler we replaced.
  const handleMobileNavClick = () => {
    triggerHaptic('light');
    setMobileNavOpen(false);
  };
  const handleDesktopNavClick = () => {
    triggerHaptic('light');
  };

  const nativeApp = isMobileApp();

  return (
    <AuthGuard>
    <PrivacyProvider>
    <div className={nativeApp ? 'h-screen flex flex-col' : 'min-h-screen flex flex-col md:flex-row'}>
      {/* ── Mobile header (web only, hidden when native tab bar is active) ── */}
      {!nativeApp && (
      <header
        className="md:hidden border-b border-border-subtle bg-base sticky top-0 z-40"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNavOpen}
              className="text-fg-dim hover:text-fg p-1.5 rounded-lg hover:bg-surface-1 transition-colors"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/dashboard">
              <Logo size="xs" variant="horizontal" theme="dark" />
            </Link>
          </div>
          {(profile?.streak_count ?? 0) > 0 && (
            <span className="font-mono text-[10px] text-scalpel flex items-center gap-0.5"><Flame size={10} className="text-orange-400" />{profile?.streak_count}</span>
          )}
        </div>
      </header>
      )}

      {/* ── Mobile slide-in nav (web only) ── */}
      {!nativeApp && mobileNavOpen && (
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
                  onClick={handleMobileNavClick}
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

              {PRICING_ENABLED && (
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
              )}

              {profile?.is_admin && (
                <>
                  <Link
                    href="/admin/reports"
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname === '/admin/reports' || pathname.startsWith('/admin/reports/')
                        ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                        : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
                    }`}
                  >
                    <Shield size={18} />
                    Admin
                  </Link>
                  <Link
                    href="/admin/feedback"
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname === '/admin/feedback'
                        ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                        : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
                    }`}
                  >
                    <MessageSquare size={18} />
                    Feedback
                  </Link>
                </>
              )}

              <div className="my-2 border-t border-border-subtle" />

              {bottomNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleMobileNavClick}
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

      {/* ── Desktop sidebar (hidden in native app) ── */}
      {!nativeApp && (
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
              onClick={handleDesktopNavClick}
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
            <>
              <Link
                href="/admin/reports"
                title="Admin"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/admin/reports' || pathname.startsWith('/admin/reports/')
                    ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                    : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
                }`}
              >
                <span className="shrink-0"><Shield size={18} /></span>
                <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">Admin</span>
              </Link>
              <Link
                href="/admin/feedback"
                title="Feedback"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/admin/feedback'
                    ? 'bg-surface-2 text-fg-bright border-l-2 border-scalpel'
                    : 'text-fg-dim hover:text-fg-muted hover:bg-surface-1 border-l-2 border-transparent'
                }`}
              >
                <span className="shrink-0"><MessageSquare size={18} /></span>
                <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">Feedback</span>
              </Link>
            </>
          )}
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={handleDesktopNavClick}
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
          {effectiveTier === 'free' && (
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
      )}

      {/* ── Main content ── */}
      <main className={nativeApp ? 'flex-1 overflow-y-auto overflow-x-hidden' : 'flex-1 min-h-screen'}>
        <div
          className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10"
          style={nativeApp ? {
            paddingTop: 'calc(var(--safe-area-top, 0px) + 16px)',
            paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)',
          } : undefined}
        >
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
            18+. IF YOU OR SOMEONE YOU KNOW HAS A GAMBLING PROBLEM, CALL 1-800-GAMBLER.
          </p>
          <p className="font-mono text-[9px] text-fg-dim tracking-wider mt-1">
            © {new Date().getFullYear()} DIAGNOSTIC SPORTS, LLC D/B/A BETAUTOPSY
          </p>
        </footer>
      </main>
      {!nativeApp && <FeedbackButton />}
      <NativeTabBar />
    </div>
    </PrivacyProvider>
    </AuthGuard>
  );
}
