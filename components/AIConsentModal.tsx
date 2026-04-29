'use client';

import { useEffect, useState } from 'react';
import { getLocally, storeLocally } from '@/lib/native';
import { isMobileBuild } from '@/lib/platform';

const STORAGE_KEY = 'ai-consent-v1';

/**
 * First-launch generative-AI disclosure required by App Review
 * Guideline 5.1.2(i) (Nov 2025 update): apps that send user data
 * to a third-party model must name the provider explicitly and
 * give the user a chance to opt in before any data leaves the
 * device.
 *
 * Storage uses `storeLocally`, which is `@capacitor/preferences`
 * on native and `localStorage` on web — durable across launches in
 * both environments. The key is versioned (`-v1`) so we can force
 * a re-prompt later if the disclosure text changes materially.
 *
 * Gated to the mobile build only. The web product already shows a
 * full Privacy Policy + Terms gate at signup; the modal exists to
 * satisfy a specific Apple submission requirement.
 */
export default function AIConsentModal() {
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    if (!isMobileBuild()) return;
    let cancelled = false;
    (async () => {
      const stored = await getLocally(STORAGE_KEY);
      if (cancelled) return;
      if (stored !== 'accepted') setNeedsConsent(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAccept() {
    await storeLocally(STORAGE_KEY, 'accepted');
    setNeedsConsent(false);
  }

  async function handleDecline() {
    if (typeof window === 'undefined') return;
    try {
      const { App } = await import('@capacitor/app');
      await App.exitApp();
    } catch {
      // Fall back to closing the webview tab on web / unsupported
      // platforms; declining the AI disclosure means the app is
      // unusable, so there's nothing else to render.
      window.close();
    }
  }

  if (!needsConsent) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-base/90 px-6"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
      }}
    >
      <div className="w-full max-w-md bg-surface-1 border border-border-subtle rounded-md p-6">
        <div className="case-header mb-3">DISCLOSURE // AI PROCESSING</div>
        <h2
          id="ai-consent-title"
          className="font-bold text-lg text-fg-bright mb-3 leading-snug"
        >
          BetAutopsy uses generative AI to analyze your bets.
        </h2>
        <p className="text-fg-muted text-sm leading-relaxed mb-3">
          Bet history you upload is sent to{' '}
          <span className="text-fg-bright">Anthropic</span> (Claude) for
          behavioral analysis. Anthropic processes the data on our
          behalf and does not train on it.
        </p>
        <p className="text-fg-muted text-sm leading-relaxed mb-5">
          AI output is informational, not financial or medical advice.
          You can delete your data anytime from Settings.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAccept}
            className="btn-primary w-full font-mono text-sm min-h-[44px] flex items-center justify-center"
          >
            I understand — continue
          </button>
          <button
            type="button"
            onClick={handleDecline}
            className="btn-secondary w-full font-mono text-sm min-h-[44px] flex items-center justify-center"
          >
            Decline and exit
          </button>
        </div>
      </div>
    </div>
  );
}
