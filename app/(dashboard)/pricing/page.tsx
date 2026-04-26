'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { apiPost } from '@/lib/api-client';
import { openCheckoutUrl } from '@/lib/native';
import { toast } from 'sonner';
import { trackCheckout } from '@/lib/tiktok-events';
import { trackCheckout as trackCheckoutMeta } from '@/lib/meta-events';
import { isLaunchPromoActive } from '@/types';
import type { Profile, SubscriptionTier } from '@/types';
import { TIER_LIMITS, REPORT_PURCHASE_LIMITS } from '@/types';

export default function PricingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'annual'>('annual');
  const [latestSnapshotId, setLatestSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPageLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data as Profile);
      // Check for existing unpaid snapshot to enable direct upgrade
      const { data: snapshot } = await supabase
        .from('autopsy_reports')
        .select('id')
        .eq('user_id', user.id)
        .eq('report_type', 'snapshot')
        .eq('is_paid', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (snapshot) setLatestSnapshotId(snapshot.id);
      setPageLoading(false);
    }
    load();
  }, []);

  async function handleSubscribe() {
    if (!profile) {
      window.location.href = '/signup';
      return;
    }
    setLoadingAction('pro');
    try {
      // Forward any ?promo=<slug> query param on the current URL so the
      // /api/checkout route can resolve it against PROMO_CODE_MAP. Only
      // applies to monthly subscriptions (server guards against annual).
      const urlPromoSlug =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('promo')
          : null;
      const res = await apiPost('/api/checkout', {
        type: 'subscription',
        interval,
        ...(urlPromoSlug ? { promoSlug: urlPromoSlug } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Could not start checkout. Please try again.');
        return;
      }
      const value = interval === 'annual' ? 149.99 : 19.99;
      trackCheckout('pro', value);
      trackCheckoutMeta('pro', value);
      window.gtag?.('event', 'begin_checkout', { value, currency: 'USD' });
      await openCheckoutUrl(data.url);
    } catch {
      toast.error('Could not connect. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleBuyReport() {
    if (!profile) {
      window.location.href = '/signup?next=/pricing';
      return;
    }
    if (!latestSnapshotId) {
      // No snapshot yet — send them to run one first
      window.location.href = '/reports?run=true';
      return;
    }
    setLoadingAction('report');
    try {
      const res = await apiPost('/api/checkout', {
        type: 'report',
        snapshotReportId: latestSnapshotId,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Could not start checkout. Please try again.');
        return;
      }
      trackCheckout('report', REPORT_PURCHASE_LIMITS.price);
      trackCheckoutMeta('report', REPORT_PURCHASE_LIMITS.price);
      window.gtag?.('event', 'begin_checkout', { value: REPORT_PURCHASE_LIMITS.price, currency: 'USD' });
      await openCheckoutUrl(data.url);
    } catch {
      toast.error('Could not connect. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleManage() {
    try {
      const res = await apiPost('/api/billing');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Could not open billing portal. Please try again.');
        return;
      }
      await openCheckoutUrl(data.url);
    } catch {
      toast.error('Could not connect. Please try again.');
    }
  }

  const currentTier = profile?.subscription_tier ?? 'free';
  const isPro = currentTier === 'pro';
  const proConfig = TIER_LIMITS.pro;

  if (pageLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="text-center space-y-2">
          <div className="h-8 w-48 bg-surface-1 rounded mx-auto" />
          <div className="h-4 w-64 bg-surface-1 rounded mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[...Array(3)].map((_, i) => <div key={i} className="h-80 bg-surface-1 rounded-sm" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="font-bold text-3xl tracking-tight mb-2 text-fg-bright">Pricing</h1>
        <p className="text-fg-muted">
          Free snapshots forever. Pay only when you want the full analysis.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 bg-scalpel/10 border border-scalpel/20 rounded-sm px-4 py-2 max-w-sm mx-auto">
        <span className="font-mono text-xs text-scalpel font-bold tracking-wider">50% OFF</span>
        <span className="text-fg-muted text-xs font-mono">for the next 100 customers</span>
      </div>

      {isLaunchPromoActive() && (
        <div className="pl-4 border-l border-l-scalpel max-w-lg mx-auto">
          <p className="data-label-sm text-scalpel/80 mb-1">Launch offer</p>
          <p className="text-scalpel text-sm font-medium">
            Your first full report is free. Sign up and run your autopsy.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {/* Free Snapshot */}
        <div className="card p-6 flex flex-col">
          <h2 className="font-bold text-2xl text-fg-bright">Free Snapshot</h2>
          <div className="mt-2 mb-4">
            <span className="font-mono text-3xl font-bold">$0</span>
          </div>
          <ul className="space-y-2 flex-1 mb-6">
            {TIER_LIMITS.free.features.map((f) => (
              <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                <span className="text-win mt-0.5">&#10003;</span>{f}
              </li>
            ))}
          </ul>
          <Link href="/dashboard" className="btn-secondary text-center w-full font-mono text-sm min-h-[44px] flex items-center justify-center mt-auto">
            Start Free
          </Link>
        </div>

        {/* Single Report */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-2xl text-fg-bright">Full Report</h2>
            <span className="border border-scalpel/30 px-2 py-0.5 bg-scalpel/10 font-mono text-[9px] text-scalpel tracking-widest font-bold">ONE-TIME</span>
            <span className="border border-loss/30 px-2 py-0.5 bg-loss/10 font-mono text-[9px] text-loss tracking-widest font-bold">50% OFF</span>
          </div>
          <div className="mt-2 mb-4">
            <div className="flex items-baseline gap-2">
              <span className="line-through text-fg-dim font-mono text-lg">$19.99</span>
              <span className="font-mono text-3xl font-bold">${REPORT_PURCHASE_LIMITS.price}</span>
            </div>
            <p className="text-scalpel text-xs font-medium mt-1">Pay once. No subscription.</p>
          </div>
          <ul className="space-y-2 flex-1 mb-6">
            {[
              `Analyzes up to ${REPORT_PURCHASE_LIMITS.maxBetsPerReport.toLocaleString()} bets`,
              'Every bias with exact dollar cost',
              'Every betting session graded A\u2013F',
              'Emotion + Discipline + BetIQ breakdown',
              'What-If Simulator',
              'Personalized rules + action plan',
            ].map((f) => (
              <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                <span className="text-win mt-0.5">&#10003;</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleBuyReport}
            disabled={loadingAction === 'report'}
            className="btn-primary text-center w-full font-mono text-sm min-h-[44px] flex items-center justify-center mt-auto"
          >
            {loadingAction === 'report' ? 'Loading...' : latestSnapshotId ? 'Get Your Report' : 'Run Free Snapshot First'}
          </button>
          {!latestSnapshotId && (
            <p className="text-fg-dim text-[10px] text-center mt-2">Run a free snapshot, then upgrade to the full report</p>
          )}
        </div>

        {/* Pro */}
        <div className="card p-6 flex flex-col border-scalpel/30">
          <span className="text-xs font-medium text-scalpel bg-scalpel-muted rounded-sm px-3 py-1 self-start mb-4">
            Best Value
          </span>
          <h2 className="font-bold text-2xl text-fg-bright">Pro</h2>
          <div className="mt-2 mb-4">
            {interval === 'annual' && proConfig.annualPrice ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="line-through text-fg-dim font-mono text-lg">${((proConfig.annualPrice / 12) * 2).toFixed(2)}</span>
                  <span className="font-mono text-3xl font-bold">
                    ${(proConfig.annualPrice / 12).toFixed(2)}
                  </span>
                  <span className="text-fg-muted text-sm">/mo</span>
                </div>
                <p className="text-fg-muted text-xs mt-1">
                  <span className="line-through text-fg-dim">${(proConfig.annualPrice * 2).toFixed(2)}</span> <span className="text-fg-bright ml-1">${proConfig.annualPrice}/yr</span>
                  <span className="text-scalpel"> save 37%</span>
                </p>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="line-through text-fg-dim font-mono text-lg">${(proConfig.price * 2).toFixed(2)}</span>
                  <span className="font-mono text-3xl font-bold">${proConfig.price}</span>
                  <span className="text-fg-muted text-sm">/mo</span>
                </div>
              </>
            )}
          </div>

          {/* Billing toggle — pill pattern matches ShareModal format toggle */}
          <div className="mb-4">
            <div className="flex gap-1 bg-surface-1 p-1 rounded-sm max-w-[260px]">
              <button
                onClick={() => setInterval('monthly')}
                className={`flex-1 py-1.5 rounded-sm text-xs font-mono text-center transition-colors ${
                  interval === 'monthly' ? 'bg-scalpel/15 text-fg-bright border border-scalpel/40' : 'text-fg-muted hover:text-fg border border-transparent'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval('annual')}
                className={`flex-1 py-1.5 rounded-sm text-xs font-mono text-center transition-colors inline-flex items-center justify-center gap-2 ${
                  interval === 'annual' ? 'bg-scalpel/15 text-fg-bright border border-scalpel/40' : 'text-fg-muted hover:text-fg border border-transparent'
                }`}
              >
                Annual
                <span className="font-mono text-[9px] tracking-wider text-scalpel bg-scalpel/10 border border-scalpel/30 rounded-sm px-1.5 py-0.5">
                  SAVE 37%
                </span>
              </button>
            </div>
          </div>

          <ul className="space-y-2 flex-1 mb-6">
            {proConfig.features.map((f) => (
              <li key={f} className="text-sm text-fg-muted flex items-start gap-2">
                <span className="text-win mt-0.5">&#10003;</span>{f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div className="text-center">
              <span className="inline-block text-sm font-medium text-win bg-win/10 rounded-sm px-4 py-2">
                &#10003; Active
              </span>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loadingAction !== null}
              className="w-full btn-primary mt-auto font-mono text-sm min-h-[44px]"
            >
              {loadingAction === 'pro' ? 'Redirecting...' : 'Subscribe to Pro'}
            </button>
          )}
        </div>
      </div>

      {isPro && profile?.stripe_customer_id && (
        <div className="text-center">
          <button
            onClick={handleManage}
            className="text-sm text-fg-muted hover:text-scalpel transition-colors"
          >
            Manage Subscription &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
