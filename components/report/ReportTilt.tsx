import type { AutopsyAnalysis } from '@/types';

interface ReportTiltProps {
  analysis: AutopsyAnalysis;
  tier: 'free' | 'pro' | 'sharp';
}

export default function ReportTilt({ analysis, tier }: ReportTiltProps) {
  if (!((tier === 'pro' || tier === 'sharp') && analysis.enhanced_tilt)) return null;

  return (
    <div className="case-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="case-header">TILT SIGNAL BREAKDOWN</div>
        <span className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-sm font-bold ${
          analysis.enhanced_tilt.risk_level === 'critical' ? 'bg-bleed text-base' :
          analysis.enhanced_tilt.risk_level === 'high' ? 'bg-bleed/80 text-base' :
          analysis.enhanced_tilt.risk_level === 'elevated' ? 'bg-caution text-base' :
          analysis.enhanced_tilt.risk_level === 'moderate' ? 'bg-caution/60 text-base' :
          'bg-scalpel text-base'
        }`}>
          {analysis.enhanced_tilt.risk_level}
        </span>
      </div>
      <div className="finding-card border-l-caution mb-4 !p-3">
        <p className="text-fg-muted text-sm">{analysis.enhanced_tilt.worst_trigger}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Bet sizing volatility', value: analysis.enhanced_tilt.signals.bet_sizing_volatility, max: 25 },
          { label: 'Loss reaction', value: analysis.enhanced_tilt.signals.loss_reaction, max: 25 },
          { label: 'Streak behavior', value: analysis.enhanced_tilt.signals.streak_behavior, max: 25 },
          { label: 'Session discipline', value: analysis.enhanced_tilt.signals.session_discipline, max: 25 },
          { label: 'Session acceleration', value: analysis.enhanced_tilt.signals.session_acceleration, max: 25, isNew: true },
          { label: 'Odds drift after loss', value: analysis.enhanced_tilt.signals.odds_drift_after_loss, max: 25, isNew: true },
        ].map(signal => (
          <div key={signal.label} className="bg-surface-raised p-3 border border-white/[0.04] rounded-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px] text-fg-dim">{signal.label}</span>
              {'isNew' in signal && signal.isNew && <span className="font-mono text-[8px] text-scalpel border border-scalpel/20 px-1 rounded-sm">NEW</span>}
            </div>
            <div className="font-mono text-sm font-bold text-fg-bright">{signal.value}<span className="text-fg-dim text-xs">/{signal.max}</span></div>
            <div className="h-1 mt-1.5 bg-base overflow-hidden">
              <div className="h-full" style={{ width: `${(signal.value / signal.max) * 100}%`, backgroundColor: signal.value / signal.max >= 0.7 ? '#F85149' : signal.value / signal.max >= 0.4 ? '#D29922' : '#00C9A7' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
