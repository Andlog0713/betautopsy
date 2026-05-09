'use client';

import { useEffect, useRef } from 'react';
import { useTabStore } from '@/lib/tab-store';

// Returns a ref to attach to a scroll container. On mount, restores
// the container's scrollTop from the store. On scroll, writes back
// (rAF-throttled) under the supplied cacheKey.
//
// cacheKey convention: tab id alone for a tab's root list
// (e.g. 'bets'), or '<tab>:<screenId>' for a pushed detail screen.
// Caller owns the key — the store treats it as opaque.
//
// Why a ref-based hook instead of a wrapper component: the existing
// dashboard pages render their own scroll containers inline; a ref
// lets a tab body opt in by attaching the ref to its existing root,
// without needing to refactor the layout. Phase 3 attaches this in
// each tab body once.
export function useScrollMemory<T extends HTMLElement = HTMLDivElement>(
  cacheKey: string,
) {
  const ref = useRef<T | null>(null);
  // Snapshot at hook-call time so we restore from the value the
  // store had on mount, not whatever a later setScroll may have
  // written. Using `getState()` (not the hook subscription) so a
  // store update doesn't re-fire the restore effect.
  const initialRef = useRef<number>(
    useTabStore.getState().scrollY[cacheKey] ?? 0,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (initialRef.current > 0) {
      // Defer to the end of the layout pass so the container has
      // been measured before we set scrollTop. Without the rAF,
      // restoring on a tab whose content is still mounting can
      // clamp to 0 because contentHeight is too small.
      requestAnimationFrame(() => {
        if (ref.current) ref.current.scrollTop = initialRef.current;
      });
    }
    // Re-running this effect on cacheKey change would clobber the
    // user's current position with the stored one for the new key,
    // which is the desired behavior when the consumer remounts
    // under a new key (e.g. PageStack swapping screens).
  }, [cacheKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const setScroll = useTabStore.getState().setScroll;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setScroll(cacheKey, el.scrollTop);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [cacheKey]);

  return ref;
}
