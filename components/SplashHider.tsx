'use client';

import { useEffect } from 'react';
import { hideSplashScreen } from '@/lib/native';

/**
 * Fires `hideSplashScreen()` after the browser has committed and
 * painted React's first frame.
 *
 * Why double `requestAnimationFrame`: a single `useEffect` (or a
 * single rAF) fires before the browser has actually painted, which
 * means `SplashScreen.hide()` can run while the WKWebView is still
 * showing the previous frame (the splash itself). The window
 * between hide-call and first paint shows up as a flash of white
 * — the "capacitor#960" symptom. Wrapping in a second rAF guarantees
 * we wait until *after* the frame containing real content has been
 * committed; only then do we ask the splash to go away.
 *
 * Why a dedicated component: `app/layout.tsx` is a Server Component
 * (it exports `metadata`), so it can't host a `useEffect` directly.
 * A tiny client child is the cleanest way to run a single
 * side-effect after React has hydrated.
 *
 * On web, `hideSplashScreen()` is a no-op (guarded by
 * `isMobileApp()` inside `lib/native.ts`), so mounting this
 * component in the root layout has zero effect on the web build —
 * the rAF chain still runs but its callback is a no-op.
 *
 * On Capacitor, this guarantees the splash disappears the instant
 * React has actually painted — no flash of unstyled content from
 * `launchAutoHide: true` firing before hydration, no stuck splash
 * from `launchAutoHide: false` with nothing to turn it off, and no
 * white flash from hiding too eagerly.
 */
export default function SplashHider() {
  useEffect(() => {
    let nestedHandle = 0;
    const outerHandle = requestAnimationFrame(() => {
      // Second rAF: now we're inside the frame that React committed
      // in the first rAF callback. Browser will paint this frame
      // imminently; after that paint completes the splash can hide
      // over real content instead of over an empty webview.
      nestedHandle = requestAnimationFrame(() => {
        hideSplashScreen();
      });
    });
    return () => {
      cancelAnimationFrame(outerHandle);
      if (nestedHandle) cancelAnimationFrame(nestedHandle);
    };
  }, []);
  return null;
}
