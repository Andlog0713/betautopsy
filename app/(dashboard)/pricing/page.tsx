'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { trackCheckout } from '@/lib/tiktok-events';
import { isLaunchPromoActive } from '@/types';
import type { Profile, SubscriptionTier } from '@/types';
import { TIER_LIMITS, REPORT_PURCHASE_LIMITS } from '@/types';

export default function PricingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'annual'>('annual');

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
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription', interval }),
      });
      const data = await res.json();
      if (data.url) {
        const value = interval === 'annual' ? 149.99 : 19.99;
        trackCheckout('pro', value);
        window.gtag?.('event', 'begin_checkout', { value, currency: 'USD' });
        window.location.href = data.url;
      }
    } catch {
      setLoadingAction(null);
    }
  }

  async function handleManage() {
    try {
      const res = await fetch('/api/billing', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {}
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
          <div className="text-center text-sm text-fg-muted py-2">
            Always free, no credit card
          </div>
        </div>

        {/* Single Report */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-2xl text-fg-bright">Full Report</h2>
            <span className="border border-scalpel/30 px-2 py-0.5 bg-base font-mono text-[9px] text-scalpel tracking-widest font-bold">ONE-TIME</span>
          </div>
          <div className="mt-2 mb-4">
            <span className="font-mono text-3xl font-bold">${REPORT_PURCHASE_LIMITS.price}</span>
            <p className="text-fg-muted text-xs mt-1">Pay once. Keep the report forever.</p>
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
          <div className="text-center text-sm text-fg-muted py-2">
            Pay per report, no subscription
          </div>
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
                <span className="font-mono text-3xl font-bold">
                  ${(proConfig.annualPrice / 12).toFixed(2)}
                </span>
                <span className="text-fg-muted text-sm">/mo</span>
                <p className="text-fg-muted text-xs mt-1">
                  ${proConfig.annualPrice}/year. Save {Math.round((1 - proConfig.annualPrice / (proConfig.price * 12)) * 100)}%
                </p>
              </>
            ) : (
              <>
                <span className="font-mono text-3xl font-bold">${proConfig.price}</span>
                <span className="text-fg-muted text-sm">/mo</span>
              </>
            )}
          </div>

          {/* Billing toggle — pill pattern matches ShareModal format toggle */}
          <div className="mb-4">
            <div className="flex gap-1 bg-surface-1 p-1 rounded-sm max-w-[260px]">
              <button
                onClick={() => setInterval('monthly')}
                className={`flex-1 py-1.5 rounded-sm text-xs font-mono text-center transition-colors ${
                  interval === 'monthly' ? 'bg-surface-2 text-fg-bright' : 'text-fg-muted hover:text-fg'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval('annual')}
                className={`flex-1 py-1.5 rounded-sm text-xs font-mono text-center transition-colors inline-flex items-center justify-center gap-2 ${
                  interval === 'annual' ? 'bg-surface-2 text-fg-bright' : 'text-fg-muted hover:text-fg'
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
              className="w-full btn-primary"
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
