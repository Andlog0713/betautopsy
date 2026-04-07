'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { PRICING_ENABLED } from '@/lib/feature-flags';

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
  children: React.ReactNode;
}

export default function SnapshotPaywall({ reportId, isPro, counts, children }: SnapshotPaywallProps) {
  const [loading, setLoading] = useState(false);

  if (!PRICING_ENABLED) return <>{children}</>;

  const totalFindings = (counts?.leaks ?? 0) + (counts?.patterns ?? 0) + (counts?.total_biases ?? 0);

  async function handleUnlock() {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'report', snapshotReportId: reportId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* Gradient fade instead of heavy blur */}
      <div className="select-none pointer-events-none relative">
        <div style={{ filter: 'blur(4px)', opacity: 0.3 }}>
          {children}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base/60 to-base" />
      </div>

      {/* Paywall card */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-surface-2 border border-border-subtle rounded-md p-6 max-w-md text-center">
          <div className="w-12 h-12 rounded-xl bg-scalpel/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-scalpel" />
          </div>
          <h3 className="font-semibold text-lg text-fg-bright mb-2">Full Report Locked</h3>
          {totalFindings > 0 ? (
            <>
              <p className="text-fg-muted text-sm mb-1">
                We found <span className="text-fg-bright font-medium font-mono">{totalFindings} findings</span> in your betting data.
              </p>
              {counts && (
                <div className="flex flex-wrap justify-center gap-2 my-3">
                  {counts.total_biases > 1 && (
                    <span className="text-xs font-mono bg-loss/10 text-loss px-2 py-1 rounded-lg">
                      {counts.total_biases} biases
                    </span>
                  )}
                  {counts.leaks > 0 && (
                    <span className="text-xs font-mono bg-caution/10 text-caution px-2 py-1 rounded-lg">
                      {counts.leaks} strategic leaks
                    </span>
                  )}
                  {counts.patterns > 0 && (
                    <span className="text-xs font-mono bg-scalpel/10 text-scalpel px-2 py-1 rounded-lg">
                      {counts.patterns} behavioral patterns
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-fg-muted text-sm mb-1">
              Your full report includes detailed bias analysis, strategic leaks, behavioral patterns, and more.
            </p>
          )}
          <p className="text-fg-muted text-sm mb-5">
            Unlock the complete 5-chapter analysis with dollar costs, action plan, and personal rules.
          </p>

          <div className="space-y-2">
            <button
              onClick={handleUnlock}
              disabled={loading || !reportId}
              className="w-full bg-scalpel text-base text-sm font-semibold rounded-lg px-5 py-2.5 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Redirecting...' : isPro ? 'Unlock Report: $4.99' : 'Unlock Report: $9.99'}
            </button>
            {!isPro && (
              <a href="/pricing" className="block text-xs text-fg-muted hover:text-scalpel transition-colors">
                Or subscribe to Pro for 3 reports/month
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
