'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay showing the banner so it doesn't become the LCP element.
    // The hero content paints first, then the banner fades in.
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      try {
        if (!window.localStorage.getItem(STORAGE_KEY)) {
          setVisible(true);
        }
      } catch {
        // localStorage disabled (private mode / strict cookie policies) — skip the banner.
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  function handleAccept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      /* ignore */
    }
    window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    setVisible(false);
  }

  function handleDecline() {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'declined');
    } catch {
      /* ignore */
    }
    // No gtag update — the default ('denied') remains in force.
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-surface-2 border border-border-subtle p-4 rounded-sm"
    >
      <p className="font-mono text-xs text-fg-muted leading-relaxed mb-3">
        We use cookies for analytics to understand how people use BetAutopsy. No
        personal data is sold. You can opt out and continue browsing normally.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className="btn-primary flex-1 font-mono text-xs py-2"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={handleDecline}
          className="btn-secondary flex-1 font-mono text-xs py-2"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
