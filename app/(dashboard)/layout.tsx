'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { PrivacyProvider, EyeToggle } from '@/components/PrivacyContext';
import type { Profile } from '@/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/upload', label: 'Upload Bets', icon: '📤' },
  { href: '/bets', label: 'Bet History', icon: '🎯' },
  { href: '/uploads', label: 'Uploads', icon: '📁' },
  { href: '/reports', label: 'Reports', icon: '🔬' },
];

const bottomNavItems = [
  { href: '/settings', label: 'Settings', icon: '⚙️' },
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

  return (
    <PrivacyProvider>
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top nav */}
      <header className="md:hidden border-b border-ink-700/30 bg-ink-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="font-serif text-lg">
            Bet<span className="text-flame-500">Autopsy</span>
          </Link>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="text-ink-600 hover:text-[#e7e6e1] p-1"
          >
            {mobileNavOpen ? '✕' : '☰'}
          </button>
        </div>
        {mobileNavOpen && (
          <nav className="border-t border-ink-700/30 px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-flame-500/10 text-flame-500'
                    : 'text-ink-600 hover:text-[#e7e6e1] hover:bg-ink-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/pricing'
                  ? 'bg-flame-500/10 text-flame-500'
                  : 'text-ink-600 hover:text-[#e7e6e1] hover:bg-ink-800'
              }`}
            >
              <span>💎</span>
              Pricing
            </Link>
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-flame-500/10 text-flame-500'
                    : 'text-ink-600 hover:text-[#e7e6e1] hover:bg-ink-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <div className="border-t border-ink-700/30 pt-3 mt-3">
              <p className="text-xs text-ink-600 truncate px-3">{profile?.email}</p>
              <button
                onClick={handleSignOut}
                className="text-sm text-ink-600 hover:text-red-400 px-3 py-2 transition-colors"
              >
                Sign out
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r border-ink-700/30 bg-ink-800/40 backdrop-blur-sm">
        <div className="p-6">
          <Link href="/dashboard" className="font-serif text-xl">
            Bet<span className="text-flame-500">Autopsy</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-flame-500/10 text-flame-500'
                  : 'text-ink-600 hover:text-[#e7e6e1] hover:bg-ink-800'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div className="mt-4 pt-3 border-t border-ink-700/20">
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-flame-500/10 text-flame-500'
                    : 'text-ink-600 hover:text-[#e7e6e1] hover:bg-ink-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-ink-700/30 space-y-3">
          {tier === 'free' && (
            <Link
              href="/pricing"
              className="block text-center text-sm bg-flame-500/10 text-flame-500 hover:bg-flame-500/20 rounded-lg px-3 py-2 transition-colors"
            >
              ✦ Upgrade to Pro
            </Link>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#e7e6e1] truncate">{profile?.email}</p>
              <p className="text-xs text-ink-600 capitalize">{tier} tier</p>
            </div>
            <EyeToggle />
            <button
              onClick={handleSignOut}
              className="text-xs text-ink-600 hover:text-red-400 transition-colors shrink-0"
              title="Sign out"
            >
              ↪ Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {children}
        </div>
        <footer className="text-center py-6 px-4">
          <p className="text-ink-700 text-xs">
            BetAutopsy provides behavioral analysis and educational insights — not
            gambling or financial advice. Past results don&apos;t guarantee future outcomes.
            21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
          </p>
        </footer>
      </main>
    </div>
    </PrivacyProvider>
  );
}
