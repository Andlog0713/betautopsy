'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, FileText, List, Settings } from 'lucide-react';
import { isMobileApp } from '@/lib/platform';
import { triggerHaptic } from '@/lib/native';

const TABS = [
  { href: '/dashboard', label: 'Home', Icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', Icon: FileText },
  { href: '/upload', label: 'Upload', Icon: Plus },
  { href: '/bets', label: 'Bets', Icon: List },
  { href: '/settings', label: 'Settings', Icon: Settings },
] as const;

export default function NativeTabBar() {
  const pathname = usePathname();

  if (!isMobileApp()) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex bg-[#111318] border-t border-border-subtle"
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
            <span className="text-[10px] uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
