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
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

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
    }
    load();
  }, []);

  async function handleUpgrade(tier: 'pro' | 'sharp') {
    setLoadingTier(tier);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
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

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="font-serif text-3xl mb-2">Choose Your Plan</h1>
        <p className="text-ink-600">
          Unlock deeper insights into your betting behavior.
        </p>
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

              <h2 className="font-serif text-2xl">{config.name}</h2>
              <div className="mt-2 mb-4">
                <span className="font-mono text-3xl font-bold">
                  ${config.price}
                </span>
                {config.price > 0 && (
                  <span className="text-ink-600 text-sm">/mo</span>
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
