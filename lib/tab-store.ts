import { createContext } from 'react';
import { create } from 'zustand';

// The 5 tabs that mount inside the AppShell on native. Order in this
// union is the order they appear in the bottom tab bar (Phase 2's
// TabBar reads it).
export type TabId = 'dashboard' | 'reports' | 'upload' | 'bets' | 'settings';

export const TAB_IDS: readonly TabId[] = [
  'dashboard',
  'reports',
  'upload',
  'bets',
  'settings',
] as const;

// Identifiers for the lazy-loaded screens that PageStack can push.
// Phase 1 limits this to the two existing pushable detail routes
// (`/uploads/[id]` and `/admin/reports/[id]`) per the PR-2 scope
// decision logged 2026-05-09. Adding a new pushable screen later
// means adding the id here, the lazy import in screen-prefetch.ts,
// and the render branch in PageStack (Phase 4).
export type ScreenComponent = 'UploadDetail' | 'AdminReportDetail';

export type Screen = {
  // Stable identifier for this push. Used as the React key for
  // mount/unmount and as the suffix on cacheKey for scroll memory.
  // Caller-supplied so the same logical screen (same id) re-pushed
  // at the same level is treated as identity.
  id: string;
  component: ScreenComponent;
  params: Record<string, string>;
};

type TabStacks = Record<TabId, Screen[]>;

// Per-tab pending query params. iOS-PR-2 Phase 3.1: this is what
// `useShellNav.navigate(tab, params)` writes into when a cross-tab
// CTA carries args (e.g. Dashboard's "Run Autopsy" → reports tab
// with `{ run: 'true' }`). The destination tab body reads via
// `useTabSearchParams()`, processes the param, then calls
// `clearPendingParams(tab)` to prevent re-trigger on remount —
// equivalent to the `window.history.replaceState` cleanup pattern
// the existing tab bodies already do for URL params on web.
type TabParams = Record<TabId, Record<string, string>>;

const emptyStacks = (): TabStacks => ({
  dashboard: [],
  reports: [],
  upload: [],
  bets: [],
  settings: [],
});

const emptyParams = (): TabParams => ({
  dashboard: {},
  reports: {},
  upload: {},
  bets: {},
  settings: {},
});

const allFalse = (): Record<TabId, boolean> => ({
  dashboard: false,
  reports: false,
  upload: false,
  bets: false,
  settings: false,
});

// URL builders for the two pushable detail screens. Used by
// `useShellNav.pushDetail` (Phase 3.1 stub: calls router.push;
// Phase 4 will replace with store-driven PageStack push on native)
// and by `lib/screen-prefetch.ts` indirectly. Keeping the map here
// next to ScreenComponent so adding a new pushable screen is a
// single-file edit.
export const SCREEN_HREF: Record<
  ScreenComponent,
  (params: Record<string, string>) => string
> = {
  UploadDetail: (p) => `/uploads/${encodeURIComponent(p.id ?? '')}`,
  AdminReportDetail: (p) => `/admin/reports/${encodeURIComponent(p.id ?? '')}`,
};

export type TabStore = {
  active: TabId;
  stacks: TabStacks;

  // Per-cacheKey scroll position. cacheKey is consumer-supplied and
  // typically encodes both tab and pushed-screen depth, e.g.
  // 'bets' for the root list, 'uploads:<id>' for a pushed detail.
  // Stored as a flat dictionary so the consumer doesn't need to
  // reach into the stacks tree to read its own position.
  scrollY: Record<string, number>;

  // Set true the first time a tab is activated. Phase 3 reads this
  // for the `wasEverActive` lazy-init pattern on Bets and Reports
  // (heaviest first-launch surfaces; defer their mounts until
  // first activation so cold-open touches Dashboard only).
  wasEverActive: Record<TabId, boolean>;

  // Per-tab pending query params (iOS-PR-2 Phase 3.1). See TabParams
  // type doc above for the consume-then-clear pattern.
  pendingParams: TabParams;

  // setActive: when `params` is supplied, also writes into pendingParams[tab].
  // When omitted, leaves pendingParams[tab] untouched — that's so a
  // bare TabBar tap (no params) doesn't clobber pending params from
  // an earlier in-app navigate. Pass `{}` explicitly to clear.
  setActive: (tab: TabId, params?: Record<string, string>) => void;
  push: (tab: TabId, screen: Screen) => void;
  pop: (tab: TabId) => void;
  popAll: (tab: TabId) => void;
  setScroll: (cacheKey: string, y: number) => void;
  // Tab body calls this after consuming params to prevent re-trigger
  // on remount (mirrors the existing `window.history.replaceState`
  // pattern used on web for URL-param cleanup).
  clearPendingParams: (tab: TabId) => void;
};

export const useTabStore = create<TabStore>()((set) => ({
  active: 'dashboard',
  stacks: emptyStacks(),
  scrollY: {},
  wasEverActive: { ...allFalse(), dashboard: true },
  pendingParams: emptyParams(),

  setActive: (tab, params) =>
    set((s) => ({
      active: tab,
      wasEverActive: s.wasEverActive[tab]
        ? s.wasEverActive
        : { ...s.wasEverActive, [tab]: true },
      // `params !== undefined` distinguishes "no arg" (don't touch)
      // from "empty object" (explicit clear). Don't conflate via
      // truthy check — `{}` is truthy but means "clear".
      pendingParams:
        params !== undefined
          ? { ...s.pendingParams, [tab]: params }
          : s.pendingParams,
    })),

  push: (tab, screen) =>
    set((s) => ({
      stacks: { ...s.stacks, [tab]: [...s.stacks[tab], screen] },
    })),

  pop: (tab) =>
    set((s) => {
      const next = s.stacks[tab].slice(0, -1);
      return { stacks: { ...s.stacks, [tab]: next } };
    }),

  popAll: (tab) =>
    set((s) => ({ stacks: { ...s.stacks, [tab]: [] } })),

  // Writes are unconditional; the useScrollMemory hook (Phase 1)
  // already throttles via requestAnimationFrame, so we don't
  // need to dedupe here.
  setScroll: (cacheKey, y) =>
    set((s) => ({ scrollY: { ...s.scrollY, [cacheKey]: y } })),

  clearPendingParams: (tab) =>
    set((s) => ({ pendingParams: { ...s.pendingParams, [tab]: {} } })),
}));

// Context that tells `useTabSearchParams()` which tab the calling
// component represents. AppShell's tab-rendering loop wraps each
// section in `<ShellTabContext.Provider value={tabId}>` (Phase 3.2
// onward) so a tab body can call `useTabSearchParams()` with no
// arguments and get the right slice of pendingParams. On web the
// context is unused (consumers fall back to next/navigation's
// `useSearchParams`), so no Provider is mounted on web.
//
// createContext is callable in non-`'use client'` modules — only
// the Provider/Consumer JSX requires the client boundary, and that
// lives in AppShell which is already a client component.
export const ShellTabContext = createContext<TabId | null>(null);

// Read-only helper for non-React contexts that need the active tab
// (e.g. screen-prefetch deciding which routes to warm). Avoids the
// hook-only `useTabStore()` call.
export function getActiveTab(): TabId {
  return useTabStore.getState().active;
}
