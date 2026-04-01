'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types';
import { Logo } from '@/components/logo';

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
    { href: '/blog', label: 'Blog' },
    { href: '/quiz', label: 'Quiz' },
    { href: '/how-to-upload', label: 'How to Upload' },
    { href: '/#pricing', label: 'Pricing' },
  ];

  return (
    <>
      <nav className={`border-b border-white/[0.04] bg-surface ${isLanding ? '' : 'sticky top-0 z-50'}`}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="shrink-0">
            <Logo size="xs" variant="horizontal" theme="dark" />
          </Link>

          {/* Center links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.href.startsWith('#') || link.href.startsWith('/#') ? (
                <a key={link.href} href={link.href} className="font-mono text-[11px] tracking-wider text-fg-muted hover:text-fg transition-colors">
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} className="font-mono text-[11px] tracking-wider text-fg-muted hover:text-fg transition-colors">
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Auth section */}
          <div className="flex items-center gap-4">
            {!authChecked ? (
              <div className="w-20" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {(profile?.streak_count ?? 0) > 0 && (
                  <span className="font-mono text-[10px] text-scalpel" title={`${profile?.streak_count}-week autopsy streak`}>🔥{profile?.streak_count}</span>
                )}
                <Link href="/dashboard" className="font-mono text-[11px] tracking-wider border border-scalpel/25 text-fg px-4 py-1.5 rounded-sm hover:bg-scalpel-muted transition-colors">
                  Dashboard
                </Link>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="w-7 h-7 rounded-sm bg-surface-raised border border-white/[0.06] flex items-center justify-center text-[10px] font-mono font-medium text-fg-muted hover:border-white/[0.12] transition-colors"
                  >
                    {initial}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-surface border border-white/[0.06] rounded-sm p-1 shadow-2xl shadow-black/40 animate-fade-in z-50">
                      <div className="px-3 py-2 border-b border-white/[0.04] mb-1">
                        <p className="font-mono text-[10px] text-fg-dim truncate">{user.email}</p>
                        <span className="font-mono text-[9px] tracking-wider uppercase text-scalpel">{tier}</span>
                      </div>
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-3 py-2 font-mono text-[11px] text-fg-muted hover:text-fg hover:bg-white/[0.03] rounded-sm transition-colors">Dashboard</Link>
                      <Link href="/settings" onClick={() => setMenuOpen(false)} className="block px-3 py-2 font-mono text-[11px] text-fg-muted hover:text-fg hover:bg-white/[0.03] rounded-sm transition-colors">Settings</Link>
                      <button onClick={handleSignOut} className="w-full text-left px-3 py-2 font-mono text-[11px] text-fg-muted hover:text-loss hover:bg-white/[0.03] rounded-sm transition-colors">Sign out</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link href="/login" className="font-mono text-[11px] tracking-wider text-fg-muted hover:text-fg transition-colors hidden sm:block">Log in</Link>
                <Link href="/signup" className="font-mono text-[11px] tracking-wider border border-scalpel/25 text-fg px-4 py-1.5 rounded-sm hover:bg-scalpel-muted transition-colors">
                  Upload bets
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-fg-muted hover:text-fg p-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-base flex flex-col">
          <div className="flex items-center justify-between px-6 h-14 border-b border-white/[0.04]">
            <Logo size="xs" variant="horizontal" theme="dark" />
            <button onClick={() => setMobileMenuOpen(false)} className="text-fg-muted hover:text-fg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6 space-y-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="font-mono text-lg tracking-wider text-fg-muted hover:text-fg transition-colors">
                {link.label}
              </Link>
            ))}
            <Link href="/faq" onClick={() => setMobileMenuOpen(false)} className="font-mono text-lg tracking-wider text-fg-muted hover:text-fg transition-colors">FAQ</Link>
            <div className="pt-6 border-t border-white/[0.04]">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center block font-mono text-sm">Dashboard</Link>
              ) : (
                <div className="space-y-3">
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center block font-mono text-sm">Upload bets — free</Link>
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
