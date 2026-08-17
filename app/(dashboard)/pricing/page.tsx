'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createBrowserSupabaseClient as createClient } from '@/lib/supabase-browser';
import { apiPost } from '@/lib/api-client';
import { openCheckoutUrl } from '@/lib/native';
import { trackCheckout as trackCheckoutMeta } from '@/lib/meta-events';
import { isLaunchPromoActive } from '@/types';
import type { Profile } from '@/types';
import { TIER_LIMITS, REPORT_PURCHASE_LIMITS } from '@/types';

export default function PricingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  // We track the full snapshot row (not just the id) so the "Get Your
  // Report" CTA can stamp the bet count + date that the buyer is paying
  // to upgrade. Without this, the user clicks Get Your Report with no
  // indication of which dataset they're getting deep analysis on.
  type LatestSnapshot = {
    id: string;
    bet_count_analyzed: number | null;
    date_range_start: string | null;
    date_range_end: string | null;
    created_at: string | null;
    analyzed_upload_ids: string[] | null;
  };
  const [latestSnapshot, setLatestSnapshot] = useState<LatestSnapshot | null>(null);
  const latestSnapshotId = latestSnapshot?.id ?? null;

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
      // Check for existing unpaid snapshot to enable direct upgrade.
      // Pull the metadata too so the CTA can show what's being purchased.
      const { data: snapshot } = await supabase
        .from('autopsy_reports')
        .select('id, bet_count_analyzed, date_range_start, date_range_end, created_at, analyzed_upload_ids')
        .eq('user_id', user.id)
        .eq('report_type', 'snapshot')
        .eq('is_paid', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (snapshot) setLatestSnapshot(snapshot as LatestSnapshot);
      setPageLoading(false);
    }
    load();
  }, []);

  // Pro is not marketed on web (2026-08-17, D1) - no public CTA links here
  // with ?intent=pro anymore, and no new-subscription flow is offered from
  // this page. handleManage below still lets an existing Pro subscriber
  // manage/cancel their subscription; that's account management for a
  // subscription that already exists, not marketing a new one.

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
      const data = await res.json();
      if (data.url) {
        trackCheckoutMeta('report', REPORT_PURCHASE_LIMITS.price);
        window.gtag?.('event', 'begin_checkout', { value: REPORT_PURCHASE_LIMITS.price, currency: 'USD' });
        await openCheckoutUrl(data.url);
      } else {
        toast.error(data.error || 'Could not start checkout. Please try again.');
        setLoadingAction(null);
      }
    } catch {
      toast.error('Could not start checkout. Please try again.');
      setLoadingAction(null);
    }
  }

  async function handleManage() {
    try {
      const res = await apiPost('/api/billing');
      const data = await res.json();
      if (data.url) {
        await openCheckoutUrl(data.url);
      }
    } catch {}
  }

  const currentTier = profile?.subscription_tier ?? 'free';
  const isPro = currentTier === 'pro';

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

      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
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
          </div>
          <div className="mt-2 mb-4">
            <div className="flex items-baseline gap-2">
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
          {/*
            Stamp the snapshot's bet count + date directly under the CTA so
            the user knows which dataset they're paying $9.99 to upgrade.
            Without this, "Get Your Report" gives no signal about which
            snapshot is about to be unlocked — which matters because the
            full report is now locked to that snapshot's exact bets.
            Filtered snapshots (analyzed_upload_ids non-empty) get a
            "from N upload" suffix so the user sees the focus they ran with.
          */}
          {latestSnapshot && (
            <p className="text-fg-dim text-[10px] text-center mt-2 font-mono">
              {(latestSnapshot.bet_count_analyzed ?? 0).toLocaleString()} bets
              {latestSnapshot.created_at && (
                <> · {new Date(latestSnapshot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
              )}
              {latestSnapshot.analyzed_upload_ids && latestSnapshot.analyzed_upload_ids.length > 0 && (
                <> · {latestSnapshot.analyzed_upload_ids.length} upload{latestSnapshot.analyzed_upload_ids.length === 1 ? '' : 's'}</>
              )}
            </p>
          )}
          {!latestSnapshotId && (
            <p className="text-fg-dim text-[10px] text-center mt-2">Run a free snapshot, then upgrade to the full report</p>
          )}
        </div>
      </div>

      {/* Pro is not marketed here (2026-08-17, D1) - no new-subscription
          card, no pricing, no CTA. Existing Pro subscribers keep their
          active plan and can still manage/cancel it below; this is the
          only Pro-related UI left on this page, and it is account
          management for a subscription that already exists, not a sales
          surface for a new one. profile?.stripe_customer_id already
          correctly excludes comped accounts with no Stripe customer
          (e.g. family accounts granted Pro manually) from seeing a
          Manage Subscription button they can't use - do not "fix" that
          by assuming every pro account has a stripe_customer_id. */}
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
