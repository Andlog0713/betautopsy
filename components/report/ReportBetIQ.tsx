import type { AutopsyAnalysis } from '@/types';

interface ReportBetIQProps {
  analysis: AutopsyAnalysis;
  tier: 'free' | 'pro' | 'sharp';
}

export default function ReportBetIQ({ analysis, tier }: ReportBetIQProps) {
  return (
    <>
      {/* ── BetIQ Score — Pro/Sharp only ── */}
      {(tier === 'pro' || tier === 'sharp') && analysis.betiq && !analysis.betiq.insufficient_data && (
        <div className="case-card p-6">
          <div className="case-header mb-4">BETIQ — SKILL ASSESSMENT</div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-2">
            <span className="font-mono text-4xl font-bold text-fg-bright">{analysis.betiq.score}</span>
            <span className="font-mono text-sm text-fg-dim">/100</span>
            <span className="font-mono text-xs text-scalpel">better than {analysis.betiq.percentile}% of bettors</span>
          </div>
          <p className="text-fg-muted text-sm mb-6 leading-relaxed">{analysis.betiq.interpretation}</p>
          <div className="vitals-strip grid-cols-2 md:grid-cols-3">
            {[
              { label: 'Line value', val: analysis.betiq.components.line_value, max: 25 },
              { label: 'Calibration', val: analysis.betiq.components.calibration, max: 20 },
              { label: 'Sophistication', val: analysis.betiq.components.sophistication, max: 15 },
              { label: 'Specialization', val: analysis.betiq.components.specialization, max: 15 },
              { label: 'Timing', val: analysis.betiq.components.timing, max: 10 },
              { label: 'Sample size', val: analysis.betiq.components.confidence, max: 15 },
            ].map(c => (
              <div key={c.label} className="vitals-cell">
                <div className="data-label mb-1">{c.label}</div>
                <div className="font-mono text-lg font-bold text-fg-bright">{c.val}<span className="text-fg-dim text-xs">/{c.max}</span></div>
                <div className="h-1 mt-2 bg-surface-raised overflow-hidden">
                  <div className="h-full bg-scalpel/40" style={{ width: `${(c.val / c.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(tier === 'pro' || tier === 'sharp') && analysis.betiq && analysis.betiq.insufficient_data && (
        <div className="case-card p-6">
          <div className="case-header mb-3">BETIQ — SKILL ASSESSMENT</div>
          <p className="text-fg-dim text-sm font-mono">{analysis.betiq.interpretation}</p>
        </div>
      )}
      {/* BetIQ — free tier teaser */}
      {tier === 'free' && analysis.betiq && (
        <div className="case-card p-6 relative overflow-hidden">
          <div className="case-header mb-2">BETIQ — SKILL ASSESSMENT</div>
          <div className="blur-sm pointer-events-none">
            <div className="font-mono text-4xl font-bold text-fg-bright">{analysis.betiq.score}/100</div>
            <div className="vitals-strip grid-cols-3 mt-4">
              <div className="vitals-cell"><div className="h-4 bg-surface-raised rounded-sm" /></div>
              <div className="vitals-cell"><div className="h-4 bg-surface-raised rounded-sm" /></div>
              <div className="vitals-cell"><div className="h-4 bg-surface-raised rounded-sm" /></div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl mb-1">🔒</p>
              <p className="text-fg-muted text-sm font-mono">Upgrade to Pro to unlock BetIQ</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
