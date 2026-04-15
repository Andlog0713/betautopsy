'use client';

import { useEffect } from 'react';
import { hideSplashScreen } from '@/lib/native';

/**
 * Fires `hideSplashScreen()` exactly once on first mount.
 *
 * Why a dedicated component: `app/layout.tsx` is a Server Component
 * (it exports `metadata`), so it can't host a `useEffect` directly.
 * A tiny client child is the cleanest way to run a single
 * side-effect after React has hydrated.
 *
 * On web, `hideSplashScreen()` is a no-op (guarded by
 * `isMobileApp()` inside `lib/native.ts`), so mounting this
 * component in the root layout has zero effect on the web build.
 *
 * On Capacitor, this guarantees the splash disappears the instant
 * React is ready — no flash of unstyled content from
 * `launchAutoHide: true` firing before hydration, and no stuck
 * splash from `launchAutoHide: false` with nothing to turn it off.
 */
export default function SplashHider() {
  useEffect(() => {
    hideSplashScreen();
  }, []);
  return null;
}
