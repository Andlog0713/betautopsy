'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types';

export default function NavBar() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
    }
    checkAuth();
  }, []);

  // Close dropdown on outside click
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

  const tierBadge: Record<string, string> = {
    free: 'bg-ink-700/30 text-ink-500 border border-white/[0.06]',
    pro: 'bg-flame-500/10 text-flame-500 border border-flame-500/20',
    sharp: 'bg-mint-500/10 text-mint-500 border border-mint-500/20',
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-ink-900/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          Bet<span className="text-flame-500">Autopsy</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/how-to-upload" className="text-[13px] font-medium text-ink-600 hover:text-[#F0F0F0] transition-colors hidden sm:block">
            How to Upload
          </Link>
          <a href="#pricing" className="text-[13px] font-medium text-ink-600 hover:text-[#F0F0F0] transition-colors hidden sm:block">
            Pricing
          </a>

          {user ? (
            /* Logged in */
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="btn-primary text-sm !px-4 !py-2">
                Dashboard
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-8 h-8 rounded-full bg-ink-800 border border-white/[0.1] flex items-center justify-center text-sm font-medium text-[#F0F0F0] hover:border-white/[0.2] transition-colors"
                >
                  {initial}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-ink-800 border border-white/[0.08] rounded-xl p-1.5 shadow-2xl shadow-black/40 animate-fade-in">
                    <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
                      <p className="text-xs text-ink-500 truncate">{user.email}</p>
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-1.5 capitalize ${tierBadge[tier]}`}>
                        {tier}
                      </span>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-ink-600 hover:text-[#F0F0F0] hover:bg-white/[0.04] rounded-lg transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-ink-600 hover:text-[#F0F0F0] hover:bg-white/[0.04] rounded-lg transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:text-red-400 hover:bg-white/[0.04] rounded-lg transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Logged out */
            <>
              <Link href="/login" className="text-[13px] font-medium text-ink-600 hover:text-[#F0F0F0] transition-colors">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary text-sm !px-4 !py-2">
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
