'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isMobileApp } from '@/lib/platform';
import { getLocally, storeLocally } from '@/lib/native';

const CONSENT_KEY = 'ai-consent-anthropic-v1';

/**
 * First-launch consent modal disclosing Anthropic Claude as the
 * AI service that processes uploaded betting history. Required by
 * App Store Review Guideline 5.1.2(i) (Nov 2025 update) for any
 * app that sends user-generated content to a third-party AI model.
 *
 * Mobile-only by design — web users see the disclosure in the
 * Privacy Policy. The component still self-gates on `isMobileApp()`
 * at runtime as a safety net so a browser preview of the mobile
 * static export doesn't pop the modal.
 *
 * Storage key is versioned (`-v1`). Bump if the disclosure language
 * changes materially, so existing users re-consent under the new
 * wording — App Review treats stale consent as no consent.
 */
export default function AIConsentModal() {
  const [visible, setVisible] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isMobileApp()) {
        setResolved(true);
        return;
      }
      const stored = await getLocally(CONSENT_KEY);
      if (cancelled) return;
      if (!stored) setVisible(true);
      setResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAgree() {
    await storeLocally(CONSENT_KEY, new Date().toISOString());
    setVisible(false);
  }

  if (!resolved || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-base p-4"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
      }}
    >
      <div className="w-full max-w-sm bg-surface-2 border border-border-subtle rounded-md p-6">
        <p className="font-mono text-xs text-fg-muted uppercase tracking-widest mb-2">
          Before you start
        </p>
        <h2
          id="ai-consent-title"
          className="text-fg-bright text-lg font-semibold mb-4"
        >
          AI processing disclosure
        </h2>
        <div className="text-fg-muted text-sm leading-relaxed space-y-3 mb-5">
          <p>
            BetAutopsy uses Anthropic&apos;s Claude to analyze the betting
            history you upload. Claude generates the behavioral autopsy
            you read in this app.
          </p>
          <p>
            Your uploaded transactions are sent to Anthropic for processing.
            Per Anthropic&apos;s API terms, your data is not used to train
            their models.
          </p>
          <p>
            By tapping &quot;I agree,&quot; you consent to this processing.
            Read our{' '}
            <Link href="/privacy" className="text-scalpel underline">
              Privacy Policy
            </Link>{' '}
            for full details.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAgree}
          className="btn-primary w-full min-h-[44px] text-sm"
        >
          I agree
        </button>
      </div>
    </div>
  );
}
