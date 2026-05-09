'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

// TEMPORARY iOS-PR-2 verification affordance. Renders a small fixed
// top-right pill on the landing page that links to /shell-preview,
// only when running inside the Capacitor native webview. Web users
// see nothing (the gate returns null on first paint, and after the
// post-mount `useEffect` runs, the gate stays false because
// `window.Capacitor` is undefined on regular browsers).
//
// Why a runtime check (not `isMobileApp()` / `isMobileBuild()`):
// per Andrew's Phase 2.6 spec — direct `window.Capacitor?.
// isNativePlatform?.()` so the check matches what's verifiable in
// Safari Web Inspector on the actual device. SSR safety via the
// `mounted` state flip; first render returns null, post-hydrate
// the effect reads the global.
//
// Removed in Phase 5 alongside /shell-preview itself. Both this
// component and its mount point in app/page.tsx go.
export default function ShellPreviewLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShow(Boolean(window.Capacitor?.isNativePlatform?.()));
  }, []);

  if (!show) return null;

  return (
    <Link
      href="/shell-preview"
      aria-label="Open shell preview"
      className="fixed z-[60] font-mono text-[10px] tracking-[0.15em] uppercase text-fg-dim/80 hover:text-scalpel border border-border-subtle bg-base/80 px-2.5 py-1.5 rounded-sm"
      style={{
        // Sit just below the floating NavBar pill on the landing
        // page. NavBar wrapper padding-top is `max(safe-area-top,
        // 44px) + 12px`, then the pill itself is `h-14` (56px).
        // Adding ~12px of breathing room past the pill bottom
        // lands the dev affordance inside the page content area
        // without overlapping the avatar/menu/Sign Up CTAs at
        // the top-right of the pill.
        top: 'calc(max(env(safe-area-inset-top, 0px), 44px) + 80px)',
        right: '12px',
      }}
    >
      Shell Preview
    </Link>
  );
}
