'use client';

import { useState } from 'react';

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
      {/* Blurred content preview */}
      <div className="select-none pointer-events-none" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
        {children}
      </div>

      {/* Paywall overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-base/95 border border-white/[0.08] rounded-sm p-8 max-w-md text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-scalpel/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-scalpel" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="font-bold text-lg text-fg-bright mb-2">Full Report Locked</h3>
          {totalFindings > 0 ? (
            <>
              <p className="text-fg-muted text-sm mb-1">
                We found <span className="text-fg-bright font-medium">{totalFindings} findings</span> in your betting data.
              </p>
              {counts && (
                <div className="flex flex-wrap justify-center gap-3 my-3">
                  {counts.total_biases > 1 && (
                    <span className="text-xs font-mono bg-loss/10 text-loss px-2 py-1 rounded-sm">
                      {counts.total_biases} biases
                    </span>
                  )}
                  {counts.leaks > 0 && (
                    <span className="text-xs font-mono bg-caution/10 text-caution px-2 py-1 rounded-sm">
                      {counts.leaks} strategic leaks
                    </span>
                  )}
                  {counts.patterns > 0 && (
                    <span className="text-xs font-mono bg-scalpel/10 text-scalpel px-2 py-1 rounded-sm">
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
              className="btn-primary w-full"
            >
              {loading ? 'Redirecting...' : isPro ? 'Unlock Report — $4.99' : 'Unlock Report — $9.99'}
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
