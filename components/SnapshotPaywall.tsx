'use client';

import { useState } from 'react';
import { Lock, ChevronRight } from 'lucide-react';
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
  children?: React.ReactNode;
}

export default function SnapshotPaywall({ reportId, isPro, counts }: SnapshotPaywallProps) {
  const [loading, setLoading] = useState(false);

  if (!PRICING_ENABLED) return null;

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
    <div data-paywall-cta className="my-6 border border-scalpel/20 bg-scalpel/[0.04] rounded-md p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-scalpel/10 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={16} className="text-scalpel" />
          </div>
          <div>
            <p className="text-fg-bright text-sm font-medium mb-0.5">
              {totalFindings > 0
                ? `We found ${totalFindings} findings in your data`
                : 'Your full analysis is ready'}
            </p>
            <p className="text-fg-muted text-xs">
              See every dollar cost, fix, and personal rule.
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
              See your full dollar costs {isPro ? '$4.99' : '$9.99'}
              <ChevronRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
