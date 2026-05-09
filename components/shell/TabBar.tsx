'use client';

import { LayoutDashboard, FileText, Plus, List, Settings } from 'lucide-react';
import { m } from 'framer-motion';
import type { CSSProperties } from 'react';
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

// Per-button selection-blocking style. Phase 2 iPhone test surfaced
// that long-pressing a tab label triggered iOS's text-selection
// "copy" menu. globals.css PR-1 sets these on body, but inheritance
// doesn't reach button text content on iOS WKWebView — the rules
// have to land on the actual long-pressable element. Both `-webkit-`
// prefixed and unprefixed variants for older WKWebView coverage.
const NO_SELECT_STYLE: CSSProperties = {
  WebkitUserSelect: 'none',
  userSelect: 'none',
  WebkitTouchCallout: 'none',
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
      // 10px above safe-area-inset-bottom for Pikkit-style breathing
      // room between tab labels and the home-indicator white line.
      // Phase 2 iPhone test had labels visually touching the line
      // even though the safe-area inset was respected — the OS-
      // reserved zone is for the indicator's tap region, not for
      // visual breathing room.
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
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
            // Haptic on touch-down (`onTouchStart`), not touch-up
            // (`onClick`). iOS WKWebView fires the sequence
            // `touchstart → touchend → click`, so this lands on
            // first finger contact — matches the Robinhood/iOS
            // native tab-bar feel where the buzz precedes the
            // visual transition. PR-4 will extend this pattern
            // to every primary CTA via <PressableButton>; pulling
            // the TabBar piece forward here so the Phase 2 iPhone
            // test isn't biased by misleading touch-up timing.
            //
            // setActive stays on `onClick` so a touch that drags
            // off (touchcancel — no `click` fires) doesn't switch
            // tabs. Haptic fired but no nav happened, which is
            // also iOS-native behavior.
            onTouchStart={() => triggerHaptic('light')}
            onClick={() => {
              // Same-tab tap is a no-op for setActive; the
              // touch-down haptic already fired. PR-4 will wire
              // this case to a 'tab:reselect' CustomEvent for
              // scroll-to-top.
              if (!isActive) setActive(id);
            }}
            // NO_SELECT_STYLE blocks the long-press selection menu
            // (Phase 2 iPhone test caught the "copy" callout on a
            // long-pressed label). Has to live on the button itself
            // — globals.css's body-level rules don't propagate.
            style={NO_SELECT_STYLE}
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
