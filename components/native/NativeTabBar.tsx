'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { LayoutDashboard, Plus, FileText, List, Settings } from 'lucide-react';
import { isMobileApp } from '@/lib/platform';
import { triggerHaptic } from '@/lib/native';
import { useUser, USER_KEY } from '@/hooks/useUser';

const TABS = [
  { href: '/dashboard', label: 'Home', Icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', Icon: FileText },
  { href: '/upload', label: 'Upload', Icon: Plus },
  { href: '/bets', label: 'Bets', Icon: List },
  { href: '/settings', label: 'Settings', Icon: Settings },
] as const;

export default function NativeTabBar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { mutate } = useSWRConfig();

  // Warm the SWR cache for the routes the user is one tap away from. Fires
  // once when user is hydrated (and again whenever userId changes — sign-in
  // flows). Each `mutate(key)` triggers a background revalidation; cached
  // hits short-circuit. <Link prefetch> on the tab links handles the JS
  // chunk prefetch — combined, the destination page renders instantly.
  useEffect(() => {
    if (!user) return;
    mutate(USER_KEY);
    mutate(['bets', user.id, undefined, undefined]);
    mutate(['reports', user.id]);
    mutate(['snapshots', user.id, true, undefined]);
    mutate(['uploads', user.id]);
  }, [user, mutate]);

  if (!isMobileApp()) return null;

  return (
    <nav
      className="flex-shrink-0 flex bg-[#111318] border-t border-border-subtle"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            onClick={() => triggerHaptic('light')}
            className={`flex-1 flex flex-col items-center justify-center h-14 gap-0.5 transition-colors ${
              active ? 'text-scalpel' : 'text-fg-dim'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
            <span className="text-[10px] uppercase">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
