'use client';

import { useState } from 'react';
import { Lock, ChevronRight } from 'lucide-react';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import { apiPost } from '@/lib/api-client';
import { openCheckoutUrl } from '@/lib/native';
import type { SufficiencyState } from '@/types';

// Same window.Sentry?.captureException pattern as components/ErrorBoundary.tsx
// - the already-initialized browser SDK, not a fresh @sentry/nextjs import.
interface SentryWindow {
  Sentry?: {
    captureException: (err: unknown, context?: Record<string, unknown>) => void;
  };
}

interface SnapshotPaywallProps {
  reportId?: string;
  isPro: boolean;
  counts?: {
    leaks: number;
    patterns: number;
    sessions: number;
    sport_findings: number;
    total_biases: number;
  };
  // Sufficiency state (schema_version 4): lets the zero-findings paywall say
  // "your profile is building" instead of the generic line. Optional —
  // absent on pre-v4 reports, copy falls back to today's behavior.
  sufficiency?: SufficiencyState;
  children?: React.ReactNode;
}

export default function SnapshotPaywall({ reportId, isPro, counts, sufficiency }: SnapshotPaywallProps) {
  const [loading, setLoading] = useState(false);
  // Distinct from render-blocking errors elsewhere in this file — this one
  // is user-visible and specifically about the checkout call failing, not
  // a missing reportId or PRICING_ENABLED being off.
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!PRICING_ENABLED) return null;

  const totalFindings = (counts?.leaks ?? 0) + (counts?.patterns ?? 0) + (counts?.total_biases ?? 0);

  // Previously: a failed checkout (no url in the response, or the fetch
  // itself throwing) only hit console.error and silently reverted the
  // button - the exact path that threw coupon_applies_to_nothing three
  // times in thirteen seconds in August, with nothing visible to the user
  // who clicked buy three times and nothing telling us it happened until
  // someone went looking in runtime logs. Now shows a real error with a
  // support contact, and reports to Sentry so this surfaces the first time
  // it happens instead of being discovered after the fact.
  async function handleUnlock() {
    if (!reportId) return;
    setLoading(true);
    setCheckoutError(null);
    try {
      const res = await apiPost('/api/checkout', {
        type: 'report',
        snapshotReportId: reportId,
      });
      const data = await res.json();
      if (data.url) {
        await openCheckoutUrl(data.url);
      } else {
        const err = new Error(`Checkout failed: ${data.error ?? 'no checkout URL returned'}`);
        console.error(err.message);
        if (typeof window !== 'undefined') {
          (window as unknown as SentryWindow).Sentry?.captureException(err, { extra: { reportId, isPro } });
        }
        setCheckoutError("Checkout didn't start. Try again, or email us if it keeps happening.");
        setLoading(false);
      }
    } catch (err) {
      console.error('Checkout request failed:', err);
      if (typeof window !== 'undefined') {
        (window as unknown as SentryWindow).Sentry?.captureException(err, { extra: { reportId, isPro } });
      }
      setCheckoutError("Checkout didn't start. Try again, or email us if it keeps happening.");
      setLoading(false);
    }
  }

  return (
    <div data-paywall-cta className="my-6 card-tier-1 border-l border-l-scalpel pl-5 pr-5 py-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={16} className="text-scalpel" />
          </div>
          <div>
            <p className="text-fg-bright text-sm font-medium mb-0.5">
              {totalFindings > 0
                ? `We found ${totalFindings} findings in your data`
                : sufficiency && sufficiency.tier !== 'full'
                  ? 'Your profile is building'
                  : 'Your full analysis is ready'}
            </p>
            <p className="text-fg-muted text-xs">
              {totalFindings === 0 && sufficiency && sufficiency.tier !== 'full'
                ? `${sufficiency.settledBets} settled bets analyzed so far. Findings sharpen as your history grows.`
                : 'See every dollar cost, fix, and personal rule.'}
            </p>
            {counts && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {counts.total_biases > 1 && (
                  <span className="text-[10px] font-mono bg-loss/10 text-loss px-1.5 py-0.5 rounded-sm">
                    {counts.total_biases} biases
                  </span>
                )}
                {counts.leaks > 0 && (
                  <span className="text-[10px] font-mono bg-caution/10 text-caution px-1.5 py-0.5 rounded-sm">
                    {counts.leaks} leaks
                  </span>
                )}
                {counts.patterns > 0 && (
                  <span className="text-[10px] font-mono bg-scalpel/10 text-scalpel px-1.5 py-0.5 rounded-sm">
                    {counts.patterns} patterns
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleUnlock}
          disabled={loading || !reportId}
          className="btn-primary text-sm font-semibold !py-2.5 !px-5 flex items-center gap-1.5 shrink-0"
        >
          {loading ? 'Redirecting...' : (
            <>
              See your full dollar costs {isPro ? '$4.99' : '$19.99'}
              <ChevronRight size={14} />
            </>
          )}
        </button>
      </div>
      {checkoutError && (
        <div className="mt-3 pt-3 border-t border-border-subtle space-y-1">
          <p className="text-loss text-xs">{checkoutError}</p>
          <a
            href="mailto:support@betautopsy.com?subject=Checkout%20didn%27t%20start"
            className="text-scalpel text-xs hover:underline"
          >
            Email us and we&apos;ll help →
          </a>
        </div>
      )}
    </div>
  );
}
