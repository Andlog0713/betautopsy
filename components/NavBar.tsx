'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Flame } from 'lucide-react';
import type { Profile } from '@/types';
import { Logo } from '@/components/logo';
import { PRICING_ENABLED } from '@/lib/feature-flags';

export default function NavBar() {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ email: authUser.email ?? '' });
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (data) setProfile(data as Profile);
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const initial = (profile?.display_name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();
  const tier = profile?.subscription_tier ?? 'free';

  const navLinks = [
    { href: '/whats-inside', label: 'The Report' },
    { href: '/blog', label: 'Blog' },
    { href: '/faq', label: 'FAQ' },
    ...(PRICING_ENABLED ? [{ href: '/#pricing', label: 'Pricing' }] : []),
  ];

  return (
    <>
      <div className={`w-full ${isLanding ? 'absolute top-0 left-0 z-50' : 'sticky top-0 z-50'}`}>
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <nav className="bg-white/[0.07] backdrop-blur-xl border border-white/[0.08] rounded-full px-6 h-14 flex items-center justify-between">
            {/* Logo */}
            <Link href={user ? '/dashboard' : '/'} className="shrink-0">
              <Logo size="xs" variant="horizontal" theme="dark" />
            </Link>

            {/* Center links — desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                if (link.href.startsWith('#') || link.href.startsWith('/#')) {
                  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (isLanding) {
                      e.preventDefault();
                      const id = link.href.replace('/#', '').replace('#', '');
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                    }
                    // On other pages, let the browser do a full navigation
                  };
                  return (
                    <a key={link.href} href={link.href} onClick={handleClick} className="text-sm font-medium text-[#f6f0ff] hover:text-scalpel transition-colors">
                      {link.label}
                    </a>
                  );
                }
                return (
                  <Link key={link.href} href={link.href} className="text-sm font-medium text-[#f6f0ff] hover:text-scalpel transition-colors">
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Auth section */}
            <div className="flex items-center gap-3">
              {!authChecked ? (
                <div className="w-20" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  {(profile?.streak_count ?? 0) > 0 && (
                    <span className="font-mono text-[10px] text-scalpel flex items-center gap-0.5" title={`${profile?.streak_count}-week autopsy streak`}><Flame size={10} className="text-orange-400" />{profile?.streak_count}</span>
                  )}
                  <Link href="/dashboard" className="text-sm font-medium text-[#f6f0ff] hover:text-scalpel transition-colors hidden sm:block">
                    Dashboard
                  </Link>
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="w-8 h-8 rounded-full bg-scalpel/15 border border-scalpel/30 flex items-center justify-center text-[11px] font-mono font-semibold text-scalpel hover:bg-scalpel/25 transition-colors"
                    >
                      {initial}
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-surface-2 border border-border-subtle rounded-lg p-1 animate-fade-in z-50">
                        <div className="px-3 py-2 border-b border-border-subtle mb-1">
                          <p className="font-mono text-xs text-fg-muted truncate">{user.email}</p>
                          <span className="font-mono text-[9px] tracking-wider uppercase text-scalpel">{tier}</span>
                        </div>
                        <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-3 py-2 font-mono text-xs text-fg-muted hover:text-fg hover:bg-white/[0.03] rounded-sm transition-colors">Dashboard</Link>
                        <Link href="/settings" onClick={() => setMenuOpen(false)} className="block px-3 py-2 font-mono text-xs text-fg-muted hover:text-fg hover:bg-white/[0.03] rounded-sm transition-colors">Settings</Link>
                        <button onClick={handleSignOut} className="w-full text-left px-3 py-2 font-mono text-xs text-fg-muted hover:text-loss hover:bg-white/[0.03] rounded-sm transition-colors">Sign out</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-[#f6f0ff] hover:text-scalpel transition-colors hidden sm:block">
                    Log in
                  </Link>
                  <Link href="/signup" className="text-sm font-semibold bg-scalpel text-[#0a0a12] px-5 py-2 rounded-full hover:brightness-110 transition-all">
                    Sign Up
                  </Link>
                </>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden text-[#f6f0ff] hover:text-scalpel p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile full-screen overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-base flex flex-col">
          <div className="flex items-center justify-between px-6 h-14 border-b border-border-subtle">
            <Logo size="xs" variant="horizontal" theme="dark" />
            <button onClick={() => setMobileMenuOpen(false)} className="text-fg-muted hover:text-fg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6 space-y-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-xl font-medium text-fg-muted hover:text-fg transition-colors">
                {link.label}
              </Link>
            ))}
            <div className="pt-6 border-t border-border-subtle">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center block font-mono text-sm">Dashboard</Link>
              ) : (
                <div className="space-y-3">
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center block font-mono text-sm">Get Started</Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary text-center block font-mono text-sm">Log in</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
