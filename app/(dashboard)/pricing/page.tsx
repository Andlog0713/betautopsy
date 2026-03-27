'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Profile, SubscriptionTier } from '@/types';
import { TIER_LIMITS } from '@/types';

const tiers: { key: SubscriptionTier; highlight?: boolean }[] = [
  { key: 'free' },
  { key: 'pro', highlight: true },
  { key: 'sharp' },
];

export default function PricingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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

  async function handleUpgrade(tier: 'pro' | 'sharp') {
    setLoadingTier(tier);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoadingTier(null);
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
  const isPaid = currentTier === 'pro' || currentTier === 'sharp';

  if (pageLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="text-center space-y-2">
          <div className="h-8 w-48 bg-ink-800 rounded mx-auto" />
          <div className="h-4 w-64 bg-ink-800 rounded mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[...Array(3)].map((_, i) => <div key={i} className="h-80 bg-ink-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="font-bold text-3xl mb-2">Choose Your Plan</h1>
        <p className="text-ink-600">
          Unlock deeper insights into your betting behavior.
        </p>
      </div>

      {/* Billing interval toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${interval === 'monthly' ? 'text-[#F0F0F0]' : 'text-ink-600'}`}>Monthly</span>
        <button
          onClick={() => setInterval(interval === 'monthly' ? 'annual' : 'monthly')}
          className="relative w-14 h-7 rounded-full bg-ink-800 border border-white/[0.08] transition-colors"
        >
          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-flame-500 transition-transform ${interval === 'annual' ? 'translate-x-7' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm ${interval === 'annual' ? 'text-[#F0F0F0]' : 'text-ink-600'}`}>
          Annual
          <span className="text-mint-500 text-xs ml-1.5">Save up to 34%</span>
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {tiers.map(({ key, highlight }) => {
          const config = TIER_LIMITS[key];
          const isActive = currentTier === key;

          return (
            <div
              key={key}
              className={`card p-6 flex flex-col ${
                highlight
                  ? 'border-flame-500/50 shadow-lg shadow-flame-500/10'
                  : ''
              } ${isActive ? 'ring-2 ring-flame-500/30' : ''}`}
            >
              {highlight && (
                <span className="text-xs font-medium text-flame-500 bg-flame-500/10 rounded-full px-3 py-1 self-start mb-4">
                  Most Popular
                </span>
              )}

              <h2 className="font-bold text-2xl">{config.name}</h2>
              <div className="mt-2 mb-4">
                {config.price > 0 && config.annualPrice && interval === 'annual' ? (
                  <>
                    <span className="font-mono text-3xl font-bold">
                      ${(config.annualPrice / 12).toFixed(2)}
                    </span>
                    <span className="text-ink-600 text-sm">/mo</span>
                    <p className="text-ink-700 text-xs mt-1">
                      ${config.annualPrice}/year — save {Math.round((1 - config.annualPrice / (config.price * 12)) * 100)}%
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-3xl font-bold">
                      ${config.price}
                    </span>
                    {config.price > 0 && (
                      <span className="text-ink-600 text-sm">/mo</span>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                <li className="text-sm text-ink-600 flex items-start gap-2">
                  <span className="text-mint-500 mt-0.5">✓</span>
                  {config.maxBets === null ? 'Unlimited bets' : `Up to ${config.maxBets} bets`}
                </li>
                <li className="text-sm text-ink-600 flex items-start gap-2">
                  <span className="text-mint-500 mt-0.5">✓</span>
                  {config.maxReports === null
                    ? 'Unlimited reports'
                    : `${config.maxReports} report`}
                </li>
                {config.features.map((f) => (
                  <li key={f} className="text-sm text-ink-600 flex items-start gap-2">
                    <span className="text-mint-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isActive ? (
                <div className="text-center">
                  <span className="inline-block text-sm font-medium text-mint-500 bg-mint-500/10 rounded-lg px-4 py-2">
                    ✓ Active
                  </span>
                </div>
              ) : key === 'free' ? (
                <div className="text-center text-sm text-ink-600 py-2">
                  Free forever
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(key as 'pro' | 'sharp')}
                  disabled={loadingTier !== null}
                  className={`w-full ${highlight ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {loadingTier === key ? 'Redirecting...' : `Upgrade to ${config.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isPaid && profile?.stripe_customer_id && (
        <div className="text-center">
          <button
            onClick={handleManage}
            className="text-sm text-ink-600 hover:text-flame-500 transition-colors"
          >
            Manage Subscription →
          </button>
        </div>
      )}
    </div>
  );
}
