'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { isMobileApp } from '@/lib/platform';
import {
  SCREEN_HREF,
  useTabStore,
  type ScreenComponent,
  type TabId,
} from '@/lib/tab-store';

// In-shell navigation primitive. Used by every cross-tab CTA inside
// the migrated tab bodies (Phase 3.2-3.6). Replaces the existing
// `<Link>` and `useRouter().push` patterns for navigation that stays
// inside the 5-tab AppShell.
//
// Branching pattern: a single `isMobileApp()` check at hook entry.
// On native, navigate flips the zustand store's `active` + writes
// `pendingParams` so the destination tab body's `useTabSearchParams`
// reads the right values. On web, navigate calls Next's
// `router.push(href)` and the existing Next routing handles it —
// `useSearchParams` in the destination tab body works as before.
//
// Out-of-shell destinations (`/pricing`, `/login`, `/signup`,
// `/api/export`) are NOT in the TabId union and so are rejected at
// the type level. Those keep their existing `<a>` / `<Link>` /
// `router.push` patterns at the call site — they leave the AppShell
// anyway. PR-6 audit comment markers added at each `<a href="/pricing">`
// site in 3.2-3.6 will queue them for migration to a PageStack push
// or sheet in PR-6 (cross-shell-nav UX regression documented under
// iOS-PR-2 Risks).
//
// pushDetail/popDetail are SCAFFOLDED in Phase 3.1 and currently
// fall through to `router.push` / `router.back` on both branches.
// Phase 4 will replace the native impl with store-driven PageStack
// push/pop. Tab body migrations in 3.2-3.6 don't call pushDetail
// directly — only `navigate` is consumed by tab bodies. pushDetail
// is consumed by Phase 4's PageStack rewiring of /uploads/[id] and
// /admin/reports/[id].

interface ShellNav {
  /**
   * Navigate to another tab in the AppShell, optionally carrying
   * query-string-style params. Native: setActive(tab, params).
   * Web: router.push(buildHref(tab, params)).
   */
  navigate: (tab: TabId, params?: Record<string, string>) => void;

  /**
   * Push a detail screen (Phase 4 wires native to PageStack;
   * Phase 3.1 falls through to router.push on both branches).
   */
  pushDetail: (component: ScreenComponent, params: Record<string, string>) => void;

  /**
   * Pop the top of the active tab's PageStack (Phase 4).
   * Phase 3.1: router.back() on both branches.
   */
  popDetail: () => void;

  /**
   * Clear pending params for a tab after the consumer has processed
   * them. Mirrors the existing `window.history.replaceState`
   * cleanup pattern used on web. No-op on web (URL is the source
   * of truth, not the store).
   */
  clearParams: (tab: TabId) => void;
}

function buildHref(tab: TabId, params?: Record<string, string>): string {
  // The 5 tabs map 1:1 to top-level routes: /dashboard, /reports,
  // /upload, /bets, /settings. TabId === path segment.
  const path = `/${tab}`;
  if (!params || Object.keys(params).length === 0) return path;
  const search = new URLSearchParams(params).toString();
  return `${path}?${search}`;
}

export function useShellNav(): ShellNav {
  const router = useRouter();
  const setActive = useTabStore((s) => s.setActive);
  const clearPendingParams = useTabStore((s) => s.clearPendingParams);

  const navigate = useCallback(
    (tab: TabId, params?: Record<string, string>) => {
      if (isMobileApp()) {
        setActive(tab, params);
        return;
      }
      router.push(buildHref(tab, params));
    },
    [router, setActive],
  );

  const pushDetail = useCallback(
    (component: ScreenComponent, params: Record<string, string>) => {
      if (isMobileApp()) {
        // Phase 3.1.5 safety net (Andrew-requested). Phase 3.1 stub
        // falls through to router.push on both branches; on native
        // that unmounts the AppShell and loses tab/scroll/stack
        // state — same failure mode as cross-shell navigation to
        // /pricing. This warn fires loud if anything in 3.2-3.6
        // accidentally wires a detail push before Phase 4 lands the
        // real PageStack push semantics. Drop the warn in Phase 4
        // when native-branch implementation replaces this fallthrough.
        // eslint-disable-next-line no-console
        console.warn(
          '[useShellNav] pushDetail() called on native before Phase 4 PageStack wiring. ' +
            'Falling through to router.push, which on Capacitor static export will unmount ' +
            'the AppShell and lose tab/scroll/stack state. Phase 4 will replace this with ' +
            'store-driven PageStack push.',
        );
      }
      router.push(SCREEN_HREF[component](params));
    },
    [router],
  );

  const popDetail = useCallback(() => {
    if (isMobileApp()) {
      // Phase 3.1.5 safety net (paired with pushDetail's warn).
      // router.back() on Capacitor with no real navigation history
      // can navigate out of the app entirely; once Phase 4 wires
      // store pop, the warn goes too.
      // eslint-disable-next-line no-console
      console.warn(
        '[useShellNav] popDetail() called on native before Phase 4 PageStack wiring. ' +
          'Falling through to router.back(); on Capacitor this can navigate out of the ' +
          'AppShell. Phase 4 will replace with store-driven PageStack pop.',
      );
    }
    router.back();
  }, [router]);

  const clearParams = useCallback(
    (tab: TabId) => {
      // No-op on web. clearPendingParams only writes to the zustand
      // store; web uses URL params and replaceState for cleanup.
      // Calling on web is safe (just a wasted state write that no
      // consumer reads) but conventionally tab bodies branch on
      // isMobileApp() before invoking — see the migration recipe in
      // Phase 3.2's commit.
      if (!isMobileApp()) return;
      clearPendingParams(tab);
    },
    [clearPendingParams],
  );

  return { navigate, pushDetail, popDetail, clearParams };
}
