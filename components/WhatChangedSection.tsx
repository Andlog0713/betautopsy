'use client';

import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import type { ReportComparison, ScoreDelta, BiasChange } from '@/types';

function DeltaArrow({ direction, inverted }: { direction: 'up' | 'down' | 'flat'; inverted?: boolean }) {
  // inverted: for Emotion Score, "down" is good (green), "up" is bad (red)
  const isGood = inverted ? direction === 'down' : direction === 'up';
  if (direction === 'flat') return <Minus className="w-3 h-3 text-fg-dim" />;
  if (isGood) return <TrendingUp className="w-3 h-3 text-win" />;
  return <TrendingDown className="w-3 h-3 text-loss" />;
}

function ScoreCard({ label, delta, inverted }: { label: string; delta: ScoreDelta; inverted?: boolean }) {
  const isGood = inverted ? delta.direction === 'down' : delta.direction === 'up';
  const colorClass = delta.direction === 'flat' ? 'text-fg-dim' : isGood ? 'text-win' : 'text-loss';

  return (
    <div className="vitals-cell text-center">
      <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">{label}</span>
      <div className="flex items-center justify-center gap-1.5">
        <DeltaArrow direction={delta.direction} inverted={inverted} />
        <span className={`font-mono text-lg font-bold ${colorClass}`}>
          {delta.delta > 0 ? '+' : ''}{delta.delta}
        </span>
      </div>
      <span className="font-mono text-[10px] text-fg-dim">{delta.previous} → {delta.current}</span>
    </div>
  );
}

function BiasChangeRow({ change }: { change: BiasChange }) {
  if (change.direction === 'resolved') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-win flex-shrink-0" />
        <span className="text-fg">{change.name}: <span className="text-win font-medium">Resolved</span></span>
      </div>
    );
  }
  if (change.direction === 'new') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Plus className="w-3.5 h-3.5 text-loss flex-shrink-0" />
        <span className="text-fg">{change.name}: <span className="text-loss font-medium">New</span></span>
      </div>
    );
  }
  const isImproved = change.direction === 'improved';
  return (
    <div className="flex items-center gap-2 text-xs">
      {isImproved
        ? <TrendingDown className="w-3.5 h-3.5 text-win flex-shrink-0" />
        : <TrendingUp className="w-3.5 h-3.5 text-loss flex-shrink-0" />
      }
      <span className="text-fg">
        {change.name}:{' '}
        <span className="capitalize">{change.previousSeverity}</span>
        {' → '}
        <span className={`capitalize font-medium ${isImproved ? 'text-win' : 'text-loss'}`}>{change.currentSeverity}</span>
      </span>
    </div>
  );
}

export default function WhatChangedSection({ comparison }: { comparison: ReportComparison }) {
  const allImproved = comparison.topRegression === null && comparison.topImprovement !== null;

  const hasScores = comparison.emotionScore || comparison.disciplineScore || comparison.betiqScore;
  const hasBiasChanges = comparison.biasChanges.length > 0;

  return (
    <div className="mb-6">
      <div className="font-mono text-[9px] text-fg-dim tracking-[3px] uppercase mb-3">SINCE YOUR LAST REPORT</div>

      {/* Score deltas */}
      {hasScores && (
        <div className="vitals-strip grid-cols-2 sm:grid-cols-3 mb-3">
          {comparison.emotionScore && (
            <ScoreCard label="EMOTION" delta={comparison.emotionScore} inverted />
          )}
          {comparison.disciplineScore && (
            <ScoreCard label="DISCIPLINE" delta={comparison.disciplineScore} />
          )}
          {comparison.betiqScore && (
            <ScoreCard label="BETIQ" delta={comparison.betiqScore} />
          )}
        </div>
      )}

      {/* Bias changes */}
      {hasBiasChanges && (
        <div className="space-y-1.5 mb-3">
          {comparison.biasChanges.slice(0, 4).map((change, i) => (
            <BiasChangeRow key={i} change={change} />
          ))}
        </div>
      )}

      {/* Summary line */}
      {allImproved ? (
        <div className="pl-3 py-1 border-l border-l-win flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-win flex-shrink-0" />
          <span className="font-mono text-xs text-win">Every tracked metric improved since your last report</span>
        </div>
      ) : (
        <div className="space-y-1">
          {comparison.topImprovement && (
            <div className="flex items-start gap-2 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-win flex-shrink-0 mt-0.5" />
              <span className="text-fg"><span className="text-fg-dim">Biggest improvement:</span> {comparison.topImprovement}</span>
            </div>
          )}
          {comparison.topRegression && (
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-loss flex-shrink-0 mt-0.5" />
              <span className="text-fg"><span className="text-fg-dim">Watch out:</span> {comparison.topRegression}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
