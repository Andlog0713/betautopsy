'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isMobileApp } from '@/lib/platform';

/**
 * On native (Capacitor) cold launch, the static export drops the user
 * on `/`, which is the public marketing landing page. Apple Review
 * Guideline 4.2.2 calls this out as an iOS-app-as-website risk — the
 * first thing inside the binary should be product, not a marketing
 * site. We bounce native users to `/login`; the login page already
 * forwards an authenticated session straight to `/dashboard`, so this
 * is the right entry point for both states.
 *
 * Web is unaffected (`isMobileApp()` short-circuits to false outside
 * the Capacitor webview).
 */
export default function NativeRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isMobileApp()) {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
