'use client';
import { useState, useMemo } from 'react';
import type { Bet } from '@/types';

interface EvidencePanelProps {
  bets: Bet[];
  evidenceBetIds: string[];
  biasName: string;
}

export default function EvidencePanel({ bets, evidenceBetIds, biasName }: EvidencePanelProps) {
  const [open, setOpen] = useState(false);

  const evidenceBets = useMemo(() => {
    const idSet = new Set(evidenceBetIds);
    return bets.filter(b => idSet.has(b.id));
  }, [bets, evidenceBetIds]);

  const medianStake = useMemo(() => {
    const allStakes = bets.map(b => Math.abs(Number(b.stake))).sort((a, b) => a - b);
    return allStakes[Math.floor(allStakes.length / 2)] || 0;
  }, [bets]);

  if (evidenceBets.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border-subtle">
      <button onClick={() => setOpen(!open)} className="font-mono text-[10px] text-scalpel tracking-[1.5px] hover:text-scalpel/80 transition-colors">
        {open ? 'HIDE' : 'VIEW'} EVIDENCE ({evidenceBets.length} bets)
      </button>

      <div style={{ maxHeight: open ? '600px' : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
        {/* Evidence bet table */}
        <div className="mt-3 space-y-0.5">
          {evidenceBets.slice(0, 8).map((bet, i) => {
            const stake = Math.abs(Number(bet.stake));
            const profit = Number(bet.profit);
            const isLoss = bet.result === 'loss';
            return (
              <div key={bet.id || i} className="flex items-center gap-3 py-1.5 font-mono text-[11px]">
                <span className="text-fg-dim w-[72px] shrink-0">
                  {new Date(bet.placed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-fg truncate flex-1 min-w-0">{bet.description}</span>
                <span className="text-fg-bright w-[52px] text-right shrink-0">${stake.toFixed(0)}</span>
                <span className={`w-[60px] text-right shrink-0 font-semibold ${isLoss ? 'text-loss' : 'text-win'}`}>
                  {profit >= 0 ? '+' : ''}{profit < 0 ? '-' : ''}${Math.abs(profit).toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mini stake bar chart */}
        <div className="mt-4 mb-2">
          <p className="font-mono text-[9px] text-fg-dim tracking-[2px] mb-2">STAKE SIZE vs MEDIAN (${medianStake.toFixed(0)})</p>
          <div className="flex items-end gap-[2px] h-[40px]">
            {evidenceBets.slice(0, 8).map((bet, i) => {
              const stake = Math.abs(Number(bet.stake));
              const ratio = medianStake > 0 ? stake / medianStake : 1;
              const heightPct = Math.min(100, (ratio / 3) * 100);
              const isLoss = bet.result === 'loss';
              return (
                <div key={bet.id || i} className="flex-1 flex flex-col justify-end">
                  <div
                    className={isLoss ? 'bg-loss' : 'bg-win'}
                    style={{ height: `${heightPct}%`, minHeight: '2px', opacity: 0.7 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="relative h-0 -mt-[14px]">
            <div className="absolute w-full border-t border-dashed border-fg-dim/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
