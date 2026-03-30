// ── Report Helper Functions ──
// Pure helpers shared across report sub-components.

import React from 'react';

export function leakToQuery(category: string): string {
  const lower = category.toLowerCase().trim();
  const params = new URLSearchParams();
  const sportMap: Record<string, string> = {
    nba: 'NBA', nfl: 'NFL', mlb: 'MLB', nhl: 'NHL', ncaab: 'NCAAB', ncaaf: 'NCAAF',
    soccer: 'Soccer', tennis: 'Tennis', mma: 'MMA',
  };
  const typeMap: Record<string, string> = {
    spread: 'spread', spreads: 'spread', moneyline: 'moneyline', ml: 'moneyline',
    total: 'total', totals: 'total', prop: 'prop', props: 'prop',
    parlay: 'parlay', parlays: 'parlay', futures: 'futures', live: 'live',
  };
  for (const [key, val] of Object.entries(sportMap)) {
    if (lower.includes(key)) { params.set('sport', val); break; }
  }
  for (const [key, val] of Object.entries(typeMap)) {
    if (lower.includes(key)) { params.set('bet_type', val); break; }
  }
  const qs = params.toString();
  return qs ? `/bets?${qs}` : '/bets';
}

export const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-win/10 text-win border-win/20',
  medium: 'bg-caution/10 text-caution border-caution/20',
  high: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  critical: 'bg-loss/10 text-loss border-loss/20',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-win/10 text-win',
  medium: 'bg-caution/10 text-caution',
  hard: 'bg-loss/10 text-loss',
};

export function emotionColor(score: number): string {
  if (score <= 25) return 'bg-win';
  if (score <= 50) return 'bg-caution';
  if (score <= 75) return 'bg-orange-400';
  return 'bg-loss';
}

export function emotionLabel(score: number): string {
  if (score <= 20) return 'Cool and collected. Your decisions are strategy-driven.';
  if (score <= 40) return 'Mostly disciplined. Minor emotional patterns worth watching.';
  if (score <= 60) return 'Emotions are creeping in. This is costing you real money.';
  if (score <= 80) return 'Significant emotional betting. This is your biggest area for improvement.';
  return 'Your emotions are in the driver\'s seat. Addressing this is priority #1.';
}

export function formatCategoryLabel(cat: string): string {
  const upper: Record<string, string> = { nba: 'NBA', nfl: 'NFL', nhl: 'NHL', mlb: 'MLB', ncaab: 'NCAAB', ncaaf: 'NCAAF', mma: 'MMA', ufc: 'UFC' };
  return cat.split(' ').map((word) => {
    const low = word.toLowerCase();
    if (upper[low]) return upper[low];
    // Replace underscores and capitalize
    return word.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }).join(' ');
}

export function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'text-win';
  if (g.startsWith('B')) return 'text-win/70';
  if (g.startsWith('C')) return 'text-caution';
  if (g.startsWith('D')) return 'text-orange-400';
  return 'text-loss';
}

export function calcProfit(odds: number, stake: number, result: string): number {
  if (result === 'win') return odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
  if (result === 'loss') return -stake;
  return 0;
}

export function SkeletonSection({ label }: { label: string }) {
  return React.createElement('div', { className: 'card p-6 space-y-3' },
    React.createElement('div', { className: 'flex items-center gap-2 text-fg-muted text-sm' },
      React.createElement('span', { className: 'inline-block w-4 h-4 border-2 border-fg-muted border-t-scalpel rounded-full animate-spin' }),
      label
    ),
    React.createElement('div', { className: 'h-4 bg-surface rounded animate-pulse w-full' }),
    React.createElement('div', { className: 'h-4 bg-surface rounded animate-pulse w-2/3' }),
    React.createElement('div', { className: 'h-4 bg-surface rounded animate-pulse w-4/5' })
  );
}

export function SummaryItem({ label, value, color, small, hint }: { label: string; value: string; color?: string; small?: boolean; hint?: string }) {
  return React.createElement('div', null,
    React.createElement('p', { className: 'text-fg-muted text-xs mb-0.5' },
      label,
      hint && React.createElement('span', { className: 'text-fg-dim normal-case' }, ` (${hint})`)
    ),
    React.createElement('p', { className: `font-mono font-semibold ${small ? 'text-sm' : 'text-lg'} ${color ?? 'text-fg-bright'}` }, value)
  );
}
