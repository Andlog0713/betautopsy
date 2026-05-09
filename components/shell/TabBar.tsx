'use client';

import { LayoutDashboard, FileText, Plus, List, Settings } from 'lucide-react';
import { m } from 'framer-motion';
import { useTabStore, TAB_IDS, type TabId } from '@/lib/tab-store';
import { triggerHaptic } from '@/lib/native';

// Icon set + label per tab. Order is enforced by TAB_IDS (the
// shared tab union from the store), so this dict only needs to
// define the visual mapping. Matches the existing NativeTabBar
// glyph + label set so the visual jump from PR-1 → PR-2 is zero.
//
// Type uses `typeof LayoutDashboard` instead of a hand-rolled
// ComponentType because lucide-react's icons are ForwardRefExotic-
// Components whose `strokeWidth` Validator only accepts `number`,
// while React's SVGProps allows `string | number` — the variances
// disagree under strict mode.
const TABS: Record<TabId, { label: string; Icon: typeof LayoutDashboard }> = {
  dashboard: { label: 'Home', Icon: LayoutDashboard },
  reports: { label: 'Reports', Icon: FileText },
  upload: { label: 'Upload', Icon: Plus },
  bets: { label: 'Bets', Icon: List },
  settings: { label: 'Settings', Icon: Settings },
};

// Bottom tab bar for the AppShell. Reads `active` + `setActive` from
// the zustand store; consumer must mount this inside a `<LazyMotion>`
// ancestor (AppShell provides one) so the `m.span` hairline indicator
// can animate via `layoutId`.
//
// Active state: lucide stroke 2.25 (vs 1.75 inactive) + scalpel color.
// Lucide is outline-only so a true filled-icon swap isn't free; this
// matches the existing NativeTabBar treatment that Andrew already
// signed off on for iOS-PR-1. PR-5 visual polish can revisit if a
// hand-rolled filled SVG glyph is wanted.
export default function TabBar() {
  const active = useTabStore((s) => s.active);
  const setActive = useTabStore((s) => s.setActive);

  return (
    <nav
      role="tablist"
      className="flex-shrink-0 flex bg-[#111318] border-t border-border-subtle"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TAB_IDS.map((id) => {
        const isActive = active === id;
        const { label, Icon } = TABS[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            onClick={() => {
              triggerHaptic('light');
              // Same-tab tap is a no-op for setActive but stays a haptic
              // event so it feels responsive. PR-4 wires it to a
              // 'tab:reselect' CustomEvent for scroll-to-top.
              if (!isActive) setActive(id);
            }}
            className={`relative flex-1 flex flex-col items-center justify-center h-14 gap-0.5 transition-colors ${
              isActive ? 'text-scalpel' : 'text-fg-dim'
            }`}
          >
            {isActive && (
              <m.span
                layoutId="tabbar-active-hairline"
                className="absolute top-0 left-3 right-3 h-px bg-scalpel"
                transition={{ type: 'spring', stiffness: 700, damping: 35 }}
              />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
            <span className="text-[10px] uppercase">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
