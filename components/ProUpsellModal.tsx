'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { apiPost } from '@/lib/api-client';
import { openCheckoutUrl } from '@/lib/native';
import { trackCheckout } from '@/lib/tiktok-events';
import { trackCheckout as trackCheckoutMeta } from '@/lib/meta-events';
import type { AutopsyAnalysis } from '@/types';

interface ProUpsellModalProps {
  analysis: AutopsyAnalysis;
  reportId: string;
  onDismiss: () => void;
}

/**
 * Post-$9.99 upsell modal. Fires on the /reports page when a user has
 * just unlocked a full report and is staring at their own grade + top
 * bias + quarterly leak for the first time. The warmest lead moment
 * the funnel produces.
 *
 * Mount conditions (enforced by the parent, not here):
 *   - Report was just paid for (paidSnapshotId was set)
 *   - User is not already Pro
 *   - Top bias exists and estimated_cost >= $100 (below that the
 *     pitch economics don't land)
 *   - No dismissal in localStorage for this report id
 *
 * This component is intentionally stateless on persistence — the
 * parent writes the dismissal key in its onDismiss handler so the
 * modal itself stays easy to test and reason about.
 */
export default function ProUpsellModal({
  analysis,
  reportId,
  onDismiss,
}: ProUpsellModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [ctaState, setCtaState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useFocusTrap(modalRef, true);

  const topBias = analysis.biases_detected?.[0];
  const quarterlyCost = topBias ? Math.round(topBias.estimated_cost) : 0;
  const grade = analysis.summary?.overall_grade ?? '?';

  // Fire GA4 + TikTok view events on mount. Runs exactly once per
  // mount because deps are empty.
  useEffect(() => {
    window.gtag?.('event', 'pro_upsell_view', { report_id: reportId });
    (window as unknown as { ttq?: { track: (name: string, data: unknown) => void } }).ttq?.track(
      'ViewContent',
      {
        contents: [{ content_id: 'pro_upsell', content_type: 'product', content_name: 'Pro Upsell Modal' }],
        value: 0,
        currency: 'USD',
      }
    );
    // Lock body scroll while the modal is up
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [reportId]);

  // Escape key dismisses
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  // Safety net: if for some reason the modal mounts without a pitch-able
  // top bias, render nothing. The parent should have prevented this but
  // we don't want to crash on a degraded report.
  if (!topBias || quarterlyCost < 100) return null;

  async function handleUpgrade() {
    setCtaState('loading');
    setErrorMessage('');

    // Fire conversion events BEFORE the redirect so they survive the
    // page unload (gtag uses sendBeacon).
    window.gtag?.('event', 'pro_upsell_click', { report_id: reportId });
    window.gtag?.('event', 'begin_checkout', { value: 19.99, currency: 'USD' });
    trackCheckout('pro', 19.99);
    trackCheckoutMeta('pro', 19.99);

    try {
      const res = await apiPost('/api/checkout', {
        type: 'subscription',
        interval: 'monthly',
      });
      const data = await res.json();
      if (data.url) {
        await openCheckoutUrl(data.url);
        return;
      }
      setCtaState('error');
      setErrorMessage(data.error || 'Could not start checkout. Please try again.');
    } catch {
      setCtaState('error');
      setErrorMessage('Could not start checkout. Please try again.');
    }
  }

  function handleDismiss() {
    window.gtag?.('event', 'pro_upsell_dismiss', { report_id: reportId });
    onDismiss();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-upsell-heading"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-base/90" onClick={handleDismiss} />

      {/* Modal card */}
      <div
        ref={modalRef}
        className="relative bg-surface-1 border border-border-subtle rounded-sm w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <p className="font-mono text-[10px] text-scalpel tracking-[2px] uppercase">
            UPSELL // PRO TIER
          </p>
          <button
            onClick={handleDismiss}
            className="text-fg-dim hover:text-fg transition-colors text-xl leading-none -mt-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Headline */}
        <div className="px-5 pb-5">
          <h2
            id="pro-upsell-heading"
            className="font-extrabold text-2xl text-fg-bright leading-tight mb-1"
          >
            Your autopsy is done.
          </h2>
          <p className="text-fg-muted text-base font-light">
            Now watch it change.
          </p>
        </div>

        {/* Mini vitals strip — 3 cells */}
        <div className="px-5 pb-5">
          <div className="vitals-strip grid-cols-3">
            <div className="vitals-cell">
              <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">
                GRADE
              </span>
              <span className="font-mono text-2xl font-extrabold text-caution">
                {grade}
              </span>
            </div>
            <div className="vitals-cell">
              <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">
                TOP BIAS
              </span>
              <span className="font-mono text-sm font-bold text-bleed leading-tight block">
                {topBias.bias_name}
              </span>
            </div>
            <div className="vitals-cell">
              <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">
                EST. / QTR
              </span>
              <span className="font-mono text-lg font-bold text-bleed">
                -${quarterlyCost.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Body copy */}
        <div className="px-5 pb-5">
          <p className="text-fg-bright text-sm leading-relaxed">
            Pro gives you 3 full reports a month plus a weekly digest so you
            can track whether your{' '}
            <strong className="text-bleed">{topBias.bias_name}</strong>{' '}
            leak shrinks over your next 3 reports.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="px-5 pb-3">
          <button
            onClick={handleUpgrade}
            disabled={ctaState === 'loading'}
            className="btn-primary w-full text-base disabled:opacity-60"
          >
            {ctaState === 'loading' ? 'Opening checkout...' : 'Upgrade to Pro for $19.99/mo'}
          </button>
        </div>

        {/* Error state */}
        {ctaState === 'error' && errorMessage && (
          <div className="px-5 pb-3">
            <p className="text-loss text-xs text-center">{errorMessage}</p>
          </div>
        )}

        {/* Secondary dismiss */}
        <div className="px-5 pb-4 text-center">
          <button
            onClick={handleDismiss}
            className="text-fg-muted text-xs hover:text-fg transition-colors underline"
          >
            Maybe later
          </button>
        </div>

        {/* Fine print */}
        <div className="border-t border-border-subtle px-5 py-3">
          <p className="font-mono text-[10px] text-fg-dim text-center leading-relaxed">
            Cancel anytime. Your $9.99 report stays unlocked forever.{' '}
            <Link href="/pricing" className="text-fg-muted hover:text-fg underline">
              See all plans
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
