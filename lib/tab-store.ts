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

const emptyStacks = (): TabStacks => ({
  dashboard: [],
  reports: [],
  upload: [],
  bets: [],
  settings: [],
});

const allFalse = (): Record<TabId, boolean> => ({
  dashboard: false,
  reports: false,
  upload: false,
  bets: false,
  settings: false,
});

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

  setActive: (tab: TabId) => void;
  push: (tab: TabId, screen: Screen) => void;
  pop: (tab: TabId) => void;
  popAll: (tab: TabId) => void;
  setScroll: (cacheKey: string, y: number) => void;
};

export const useTabStore = create<TabStore>()((set) => ({
  active: 'dashboard',
  stacks: emptyStacks(),
  scrollY: {},
  wasEverActive: { ...allFalse(), dashboard: true },

  setActive: (tab) =>
    set((s) => ({
      active: tab,
      wasEverActive: s.wasEverActive[tab]
        ? s.wasEverActive
        : { ...s.wasEverActive, [tab]: true },
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
}));

// Read-only helper for non-React contexts that need the active tab
// (e.g. screen-prefetch deciding which routes to warm). Avoids the
// hook-only `useTabStore()` call.
export function getActiveTab(): TabId {
  return useTabStore.getState().active;
}
