'use client';

import { useEffect } from 'react';

/**
 * iOS-only pinch-zoom suppression.
 *
 * The viewport <meta> tag in app/layout.tsx includes
 * `maximum-scale=1.0, user-scalable=no`, but WKWebView has
 * deliberately ignored those tokens since iOS 10 (Apple's a11y
 * stance — assistive users can always zoom regardless of site
 * preference). The `touch-action: pan-x pan-y` rules in
 * globals.css cover most pinch attempts, but WKWebView still
 * dispatches Apple's proprietary `gesturestart`/`gesturechange`/
 * `gestureend` events on multi-touch, and those bypass touch-action
 * in some webview contexts. Calling preventDefault on `gesturestart`
 * is the documented escape hatch.
 *
 * On other browsers (Safari macOS doesn't fire gesturestart on
 * trackpad pinch; Chrome/Firefox have never implemented these
 * proprietary events) the listener is a no-op — adding it costs
 * nothing.
 *
 * Why a dedicated component: app/layout.tsx is a Server Component
 * (it exports `metadata`), so it can't host a useEffect directly.
 * Pattern matches SplashHider and ScrollToTop.
 *
 * Native iOS pinch-to-zoom Accessibility setting (Settings →
 * Accessibility → Zoom) operates above the webview layer and is
 * not affected by this listener. Users who require zoom retain it.
 */
export default function ZoomGate() {
  useEffect(() => {
    function preventGesture(e: Event) {
      e.preventDefault();
    }
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);
    return () => {
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
    };
  }, []);
  return null;
}
