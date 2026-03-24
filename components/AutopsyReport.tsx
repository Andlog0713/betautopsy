'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import ShareModal from './ShareModal';
import ReportFeedback from './ReportFeedback';
import type { ShareCardData } from './ShareCard';
import type { AutopsyAnalysis, Bet, PersonalRule, ProgressSnapshot } from '@/types';

// ── Helpers ──

function leakToQuery(category: string): string {
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

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-mint-500/10 text-mint-500 border-mint-500/20',
  medium: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  high: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  critical: 'bg-red-400/10 text-red-400 border-red-400/20',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-mint-500/10 text-mint-500',
  medium: 'bg-amber-400/10 text-amber-400',
  hard: 'bg-red-400/10 text-red-400',
};

function tiltColor(score: number): string {
  if (score <= 25) return 'bg-mint-500';
  if (score <= 50) return 'bg-amber-400';
  if (score <= 75) return 'bg-orange-400';
  return 'bg-red-400';
}

function tiltLabel(score: number): string {
  if (score <= 20) return 'Cool and collected. Your decisions are strategy-driven.';
  if (score <= 40) return 'Mostly disciplined. Minor emotional patterns worth watching.';
  if (score <= 60) return 'Emotions are creeping in. This is costing you real money.';
  if (score <= 80) return 'Significant emotional betting. This is your biggest area for improvement.';
  return 'Your emotions are in the driver\'s seat. Addressing this is priority #1.';
}

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'text-mint-500';
  if (g.startsWith('B')) return 'text-mint-500/70';
  if (g.startsWith('C')) return 'text-amber-400';
  if (g.startsWith('D')) return 'text-orange-400';
  return 'text-red-400';
}

function calcProfit(odds: number, stake: number, result: string): number {
  if (result === 'win') return odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
  if (result === 'loss') return -stake;
  return 0;
}

// ── Chart data builders ──

function buildPnLData(bets: Bet[]) {
  const sorted = [...bets].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  let cum = 0;
  return sorted.map((b) => {
    cum += Number(b.profit);
    return {
      date: new Date(b.placed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: Math.round(cum * 100) / 100,
    };
  });
}

function buildStakeData(bets: Bet[]) {
  const sorted = [...bets].sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  return sorted.map((b, i) => {
    // Check if this bet was placed within 1 hour of a previous loss
    let afterLoss = false;
    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev.result === 'loss') {
        const gap = new Date(b.placed_at).getTime() - new Date(prev.placed_at).getTime();
        if (gap < 3600000) afterLoss = true; // < 1 hour
      }
    }
    return {
      date: new Date(b.placed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      stake: Number(b.stake),
      afterLoss,
    };
  });
}

function buildROIData(bets: Bet[]) {
  const groups = new Map<string, { profit: number; staked: number; count: number }>();

  bets.forEach((b) => {
    if (b.result === 'push' || b.result === 'void' || b.result === 'pending') return;
    // By sport
    const sportKey = b.sport;
    const sg = groups.get(sportKey) ?? { profit: 0, staked: 0, count: 0 };
    sg.profit += Number(b.profit);
    sg.staked += Number(b.stake);
    sg.count++;
    groups.set(sportKey, sg);

    // By bet type
    const typeKey = b.bet_type;
    const tg = groups.get(typeKey) ?? { profit: 0, staked: 0, count: 0 };
    tg.profit += Number(b.profit);
    tg.staked += Number(b.stake);
    tg.count++;
    groups.set(typeKey, tg);
  });

  const data: { category: string; roi: number; count: number }[] = [];
  groups.forEach((v, k) => {
    if (v.count >= 3) {
      data.push({ category: k, roi: Math.round((v.profit / v.staked) * 1000) / 10, count: v.count });
    }
  });
  data.sort((a, b) => b.count - a.count);
  return data;
}

// ── What If calculations ──

function buildWhatIfs(bets: Bet[]) {
  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
  if (settled.length === 0) return [];

  const actualPnL = settled.reduce((s, b) => s + Number(b.profit), 0);
  const stakes = settled.map((b) => Number(b.stake)).sort((a, b) => a - b);
  const medianStake = stakes[Math.floor(stakes.length / 2)];

  const whatIfs: { label: string; actual: number; hypothetical: number }[] = [];

  // 1. Flat stake at median
  const flatPnL = settled.reduce((s, b) => {
    return s + calcProfit(b.odds, medianStake, b.result);
  }, 0);
  whatIfs.push({ label: `Flat-staked at $${Math.round(medianStake)} on every bet`, actual: actualPnL, hypothetical: flatPnL });

  // 2. No parlays over 3 legs
  const noBigParlays = settled.filter((b) => !(b.parlay_legs && b.parlay_legs > 3));
  if (noBigParlays.length < settled.length) {
    const noParlayPnL = noBigParlays.reduce((s, b) => s + Number(b.profit), 0);
    whatIfs.push({ label: 'Eliminated all parlays over 3 legs', actual: actualPnL, hypothetical: noParlayPnL });
  }

  // 3. Only profitable categories
  const catStats = new Map<string, { profit: number; staked: number }>();
  settled.forEach((b) => {
    const key = `${b.sport}-${b.bet_type}`;
    const c = catStats.get(key) ?? { profit: 0, staked: 0 };
    c.profit += Number(b.profit);
    c.staked += Number(b.stake);
    catStats.set(key, c);
  });
  const profitableCats = new Set<string>();
  catStats.forEach((v, k) => { if (v.staked > 0 && v.profit / v.staked > 0) profitableCats.add(k); });
  if (profitableCats.size > 0 && profitableCats.size < catStats.size) {
    const onlyProfitable = settled.filter((b) => profitableCats.has(`${b.sport}-${b.bet_type}`));
    const profitablePnL = onlyProfitable.reduce((s, b) => s + Number(b.profit), 0);
    whatIfs.push({ label: 'Only bet your profitable sports/types', actual: actualPnL, hypothetical: profitablePnL });
  }

  return whatIfs;
}

// ── Custom Tooltip ──

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-600">{label}</p>
      <p className={`font-mono font-medium ${payload[0].value >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

// ── Main Component ──

export default function AutopsyReport({ analysis, bets = [], previousSnapshot, reportId }: { analysis: AutopsyAnalysis; bets?: Bet[]; previousSnapshot?: ProgressSnapshot | null; reportId?: string }) {
  const { summary, biases_detected, strategic_leaks, behavioral_patterns, recommendations } = analysis;

  const pnlData = useMemo(() => buildPnLData(bets), [bets]);
  const stakeData = useMemo(() => buildStakeData(bets), [bets]);
  const roiData = useMemo(() => buildROIData(bets), [bets]);
  const whatIfs = useMemo(() => buildWhatIfs(bets), [bets]);

  const hasBets = bets.length > 0;

  // Comparison data
  const compItems = previousSnapshot ? [
    { label: 'Emotion Score', from: previousSnapshot.tilt_score, to: analysis.tilt_score, lowerBetter: true },
    { label: 'Grade', from: previousSnapshot.overall_grade, to: analysis.summary.overall_grade, isGrade: true },
    { label: 'Loss Chase Ratio', from: previousSnapshot.loss_chase_ratio, to: null, lowerBetter: true, suffix: 'x' },
    { label: 'Parlay %', from: previousSnapshot.parlay_percent, to: null, lowerBetter: true, suffix: '%' },
    { label: 'ROI', from: previousSnapshot.roi_percent, to: analysis.summary.roi_percent, suffix: '%' },
  ] : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Bet DNA */}
      {analysis.betting_archetype && (
        <div className="card p-6 border-flame-500/20 bg-gradient-to-r from-flame-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧬</span>
            <div>
              <p className="text-ink-600 text-xs uppercase tracking-wider">Your Bet DNA</p>
              <h2 className="font-serif text-2xl text-flame-500">{analysis.betting_archetype.name}</h2>
            </div>
          </div>
          <p className="text-[#e7e6e1] text-sm">{analysis.betting_archetype.description}</p>
        </div>
      )}

      {/* Share */}
      <ShareSection analysis={analysis} summary={summary} reportId={reportId} bets={bets} />

      {/* vs. Last Report */}
      {previousSnapshot && (
        <div className="card p-6">
          <h2 className="font-serif text-lg mb-3">
            vs. Last Report <span className="text-ink-600 text-sm font-normal">({new Date(previousSnapshot.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {compItems.map((item) => {
              const fromVal = item.from;
              const toVal = item.to;
              if (fromVal === null || fromVal === undefined) return null;

              let improved = false;
              let fromStr = '', toStr = '';

              if (item.isGrade && typeof fromVal === 'string' && typeof toVal === 'string') {
                fromStr = fromVal;
                toStr = toVal;
                const gOrder = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
                improved = gOrder.indexOf(toStr) > gOrder.indexOf(fromStr);
              } else if (typeof fromVal === 'number' && typeof toVal === 'number') {
                fromStr = `${fromVal.toFixed(1)}${item.suffix ?? ''}`;
                toStr = `${toVal.toFixed(1)}${item.suffix ?? ''}`;
                improved = item.lowerBetter ? toVal < fromVal : toVal > fromVal;
              } else {
                return null;
              }

              const same = fromStr === toStr;
              return (
                <div key={item.label}>
                  <p className="text-ink-600 text-xs mb-0.5">{item.label}</p>
                  <p className={`font-mono text-sm font-medium ${same ? 'text-ink-500' : improved ? 'text-mint-500' : 'text-red-400'}`}>
                    {fromStr} → {toStr}
                  </p>
                  {!same && <p className={`text-xs ${improved ? 'text-mint-500' : 'text-red-400'}`}>{improved ? 'improved' : 'regressed'}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-serif text-2xl">Autopsy Summary</h2>
          <div className="flex items-center gap-2">
            <span className="text-ink-600 text-sm">Overall Grade:</span>
            <span className={`font-serif text-4xl font-bold ${gradeColor(summary.overall_grade)}`}>
              {summary.overall_grade}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryItem label="Record" value={summary.record} />
          <SummaryItem
            label="Net P&L"
            value={`${summary.total_profit >= 0 ? '+' : ''}$${summary.total_profit.toFixed(2)}`}
            color={summary.total_profit >= 0 ? 'text-mint-500' : 'text-red-400'}
          />
          <SummaryItem
            label="ROI"
            value={`${summary.roi_percent.toFixed(1)}%`}
            color={summary.roi_percent >= 0 ? 'text-mint-500' : 'text-red-400'}
          />
          <SummaryItem label="Avg Stake" value={`$${summary.avg_stake.toFixed(0)}`} />
          <SummaryItem label="Total Bets" value={summary.total_bets.toString()} />
          <SummaryItem label="Date Range" value={summary.date_range} small />
        </div>
      </div>

      {/* P&L Over Time Chart */}
      {hasBets && pnlData.length > 1 && (
        <div className="card p-6">
          <h2 className="font-serif text-xl mb-4">P&L Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5f594f20" />
                <XAxis dataKey="date" tick={{ fill: '#9a9483', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5f594f30' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#9a9483', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5f594f30' }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="#5f594f50" />
                <Line type="monotone" dataKey="pnl" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Emotion Score */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl">Emotion Score</h2>
          <span className={`font-mono text-2xl font-bold ${
            analysis.tilt_score <= 25 ? 'text-mint-500' :
            analysis.tilt_score <= 50 ? 'text-amber-400' :
            analysis.tilt_score <= 75 ? 'text-orange-400' : 'text-red-400'
          }`}>
            {analysis.tilt_score}/100
          </span>
        </div>
        <div className="w-full h-3 bg-ink-900 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${tiltColor(analysis.tilt_score)}`}
            style={{ width: `${analysis.tilt_score}%` }}
          />
        </div>
        <p className="text-ink-600 text-sm mb-3">{tiltLabel(analysis.tilt_score)}</p>
        {analysis.tilt_breakdown && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-ink-700/20">
            {([
              { label: 'Bet Sizing Consistency', key: 'stake_volatility' as const },
              { label: 'Reaction to Losses', key: 'loss_chasing' as const },
              { label: 'During Losing Streaks', key: 'streak_behavior' as const },
              { label: 'Knowing When to Stop', key: 'session_discipline' as const },
            ]).map(({ label, key }) => {
              const val = analysis.tilt_breakdown![key];
              return (
                <div key={key}>
                  <p className="text-ink-700 text-xs mb-1">{label}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-ink-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          val <= 5 ? 'bg-mint-500' : val <= 12 ? 'bg-amber-400' : val <= 18 ? 'bg-orange-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${(val / 25) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-ink-600">{val}/25</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stake Size Timeline */}
      {hasBets && stakeData.length > 1 && (
        <div className="card p-6">
          <h2 className="font-serif text-xl mb-1">Stake Size Timeline</h2>
          <p className="text-ink-600 text-xs mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-[#5f594f] mr-1 align-middle" /> Normal
            <span className="inline-block w-2 h-2 rounded-full bg-[#f97316] mr-1 ml-3 align-middle" /> Within 1hr of a loss
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5f594f20" />
                <XAxis dataKey="date" tick={{ fill: '#9a9483', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#5f594f30' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#9a9483', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5f594f30' }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="stake" radius={[2, 2, 0, 0]}>
                  {stakeData.map((entry, i) => (
                    <Cell key={i} fill={entry.afterLoss ? '#f97316' : '#5f594f'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bankroll Health Warning */}
      {analysis.bankroll_health !== 'healthy' && (
        <div
          className={`rounded-xl p-5 border ${
            analysis.bankroll_health === 'danger'
              ? 'bg-red-400/5 border-red-400/30'
              : 'bg-amber-400/5 border-amber-400/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{analysis.bankroll_health === 'danger' ? '🚨' : '⚠️'}</span>
            <div>
              <h3 className={`font-medium ${
                analysis.bankroll_health === 'danger' ? 'text-red-400' : 'text-amber-400'
              }`}>
                Bankroll Health: {analysis.bankroll_health === 'danger' ? 'At Risk' : 'Monitor'}
              </h3>
              <p className="text-ink-600 text-sm mt-1">
                {analysis.bankroll_health === 'danger'
                  ? 'Your stake sizing relative to your bankroll is aggressive. Consider setting hard limits on max bet size to protect your long-term position.'
                  : 'Your bankroll trajectory could use some adjustments. The recommendations below can help stabilize it.'}
              </p>
              {analysis.bankroll_health === 'danger' && (
                <p className="text-ink-700 text-xs mt-3">
                  If you feel your gambling is out of control, call <span className="text-[#e7e6e1]">1-800-GAMBLER</span> or visit <span className="text-[#e7e6e1]">ncpgambling.org</span> for self-exclusion resources.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Biases Detected */}
      {biases_detected.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Biases Detected</h2>
          <div className="grid gap-4">
            {biases_detected.map((bias, i) => (
              <div key={i} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                  <h3 className="font-medium text-lg">{bias.bias_name}</h3>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border self-start ${SEVERITY_COLORS[bias.severity] ?? SEVERITY_COLORS.medium}`}>
                    {bias.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-[#e7e6e1] text-sm mb-4">{bias.description}</p>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div className="bg-ink-900/50 rounded-lg p-3">
                    <p className="text-ink-600 text-xs mb-1">Evidence</p>
                    <p className="text-[#e7e6e1]">{bias.evidence}</p>
                  </div>
                  <div className="bg-ink-900/50 rounded-lg p-3">
                    <p className="text-ink-600 text-xs mb-1">Estimated Cost</p>
                    <p className="text-red-400 font-mono font-medium">-${Math.abs(bias.estimated_cost).toFixed(0)}</p>
                  </div>
                  <div className="bg-ink-900/50 rounded-lg p-3">
                    <p className="text-ink-600 text-xs mb-1">How to Fix</p>
                    <p className="text-[#e7e6e1]">{bias.fix}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategic Leaks */}
      {strategic_leaks.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Strategic Leaks</h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-700/30">
                    <th className="text-left text-ink-600 font-medium px-4 py-3">Category</th>
                    <th className="text-left text-ink-600 font-medium px-4 py-3">Issue</th>
                    <th className="text-right text-ink-600 font-medium px-4 py-3">ROI</th>
                    <th className="text-right text-ink-600 font-medium px-4 py-3 hidden sm:table-cell">Sample</th>
                    <th className="text-left text-ink-600 font-medium px-4 py-3 hidden md:table-cell">Suggestion</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {strategic_leaks.map((leak, i) => (
                    <tr key={i} className="border-b border-ink-700/15">
                      <td className="px-4 py-3 font-medium">{leak.category}</td>
                      <td className="px-4 py-3 text-ink-600">{leak.detail}</td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${leak.roi_impact >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                        {leak.roi_impact >= 0 ? '+' : ''}{leak.roi_impact.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink-600 hidden sm:table-cell">{leak.sample_size}</td>
                      <td className="px-4 py-3 text-ink-600 hidden md:table-cell">{leak.suggestion}</td>
                      <td className="px-4 py-3">
                        <Link href={leakToQuery(leak.category)} className="text-xs text-flame-500 hover:underline whitespace-nowrap">
                          View bets →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROI by Category Chart */}
      {hasBets && roiData.length > 0 && (
        <div className="card p-6">
          <h2 className="font-serif text-xl mb-4">ROI by Category</h2>
          <div style={{ height: Math.max(200, roiData.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5f594f20" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9a9483', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5f594f30' }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis type="category" dataKey="category" tick={{ fill: '#e7e6e1', fontSize: 12 }} tickLine={false} axisLine={false} width={55} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { category: string; roi: number; count: number };
                    return (
                      <div className="bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-xs shadow-lg">
                        <p className="text-[#e7e6e1] font-medium">{d.category}</p>
                        <p className={`font-mono ${d.roi >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.roi}% ROI</p>
                        <p className="text-ink-600">{d.count} bets</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={0} stroke="#5f594f50" />
                <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                  {roiData.map((entry, i) => (
                    <Cell key={i} fill={entry.roi >= 0 ? '#4ade80' : '#f87171'} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Edge Profile */}
      {analysis.edge_profile && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Edge Profile</h2>
          {/* Sharp Score */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-ink-600 text-sm">Sharp Score</span>
              <span className="font-mono text-2xl font-bold text-cyan-400">
                {analysis.edge_profile.sharp_score}/100
              </span>
            </div>
            <div className="w-full h-3 bg-ink-900 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-1000 ease-out"
                style={{ width: `${analysis.edge_profile.sharp_score}%` }}
              />
            </div>
            <p className="text-ink-600 text-xs">
              {analysis.edge_profile.sharp_score >= 60
                ? 'You have genuine edges in some areas. Focus your volume there.'
                : analysis.edge_profile.sharp_score >= 30
                ? 'Some promising spots, but more data needed to confirm real edges.'
                : 'No strong edges detected yet. Focus on reducing leaks first.'}
            </p>
          </div>
          {/* Profitable / Unprofitable areas */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-mint-500">Profitable Areas</h3>
              {(analysis.edge_profile.profitable_areas ?? []).length === 0 ? (
                <p className="text-ink-600 text-sm card p-4">No profitable areas with sufficient sample size.</p>
              ) : (
                analysis.edge_profile.profitable_areas.map((area, i) => (
                  <div key={i} className="card border-mint-500/20 bg-mint-500/5 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{area.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        area.confidence === 'high' ? 'bg-mint-500/10 text-mint-500' :
                        area.confidence === 'medium' ? 'bg-amber-400/10 text-amber-400' :
                        'bg-ink-700/50 text-ink-500'
                      }`}>{area.confidence}</span>
                    </div>
                    <p className="font-mono text-mint-500 font-semibold">+{area.roi.toFixed(1)}% ROI</p>
                    <p className="text-ink-600 text-xs">{area.sample_size} bets</p>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-red-400">Unprofitable Areas</h3>
              {(analysis.edge_profile.unprofitable_areas ?? []).length === 0 ? (
                <p className="text-ink-600 text-sm card p-4">No major unprofitable areas detected.</p>
              ) : (
                analysis.edge_profile.unprofitable_areas.map((area, i) => (
                  <div key={i} className="card border-red-400/20 bg-red-400/5 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{area.category}</span>
                      <span className="text-xs text-red-400 font-mono">-${Math.abs(area.estimated_loss).toLocaleString()}</span>
                    </div>
                    <p className="font-mono text-red-400 font-semibold">{area.roi.toFixed(1)}% ROI</p>
                    <p className="text-ink-600 text-xs">{area.sample_size} bets</p>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Reallocation advice */}
          {analysis.edge_profile.reallocation_advice && (
            <div className="card border-flame-500/20 bg-flame-500/5 p-5">
              <p className="text-sm text-[#e7e6e1]">{analysis.edge_profile.reallocation_advice}</p>
            </div>
          )}
        </div>
      )}

      {/* Behavioral Patterns */}
      {behavioral_patterns.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Behavioral Patterns</h2>
          <div className="grid gap-3">
            {behavioral_patterns.map((pat, i) => (
              <div key={i} className="card p-5 flex gap-4">
                <span className="text-2xl mt-0.5 shrink-0">
                  {pat.impact === 'positive' ? '✅' : pat.impact === 'negative' ? '❌' : '➖'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{pat.pattern_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      pat.impact === 'positive' ? 'bg-mint-500/10 text-mint-500'
                        : pat.impact === 'negative' ? 'bg-red-400/10 text-red-400'
                        : 'bg-ink-700/50 text-ink-500'
                    }`}>
                      {pat.impact}
                    </span>
                  </div>
                  <p className="text-[#e7e6e1] text-sm">{pat.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-ink-600">
                    <span>Frequency: {pat.frequency}</span>
                    <span>Evidence: {pat.data_points}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Analysis */}
      {analysis.session_analysis && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Session Analysis</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Worst session */}
            {analysis.session_analysis.worst_session && (
              <div className="card border-red-400/20 bg-red-400/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-red-400">Worst Session</h3>
                  <span className="text-xs text-ink-600">{analysis.session_analysis.worst_session.date}</span>
                </div>
                <p className="font-mono text-2xl font-bold text-red-400 mb-2">
                  {analysis.session_analysis.worst_session.net >= 0 ? '+' : ''}${Math.round(analysis.session_analysis.worst_session.net).toLocaleString()}
                </p>
                <div className="flex gap-4 text-xs text-ink-600 mb-3">
                  <span>{analysis.session_analysis.worst_session.bets} bets</span>
                  <span>{analysis.session_analysis.worst_session.duration}</span>
                </div>
                <p className="text-sm text-[#e7e6e1]">{analysis.session_analysis.worst_session.description}</p>
              </div>
            )}
            {/* Best session */}
            {analysis.session_analysis.best_session && (
              <div className="card border-mint-500/20 bg-mint-500/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-mint-500">Best Session</h3>
                  <span className="text-xs text-ink-600">{analysis.session_analysis.best_session.date}</span>
                </div>
                <p className="font-mono text-2xl font-bold text-mint-500 mb-2">
                  +${Math.round(analysis.session_analysis.best_session.net).toLocaleString()}
                </p>
                <div className="flex gap-4 text-xs text-ink-600 mb-3">
                  <span>{analysis.session_analysis.best_session.bets} bets</span>
                  <span>{analysis.session_analysis.best_session.duration}</span>
                </div>
                <p className="text-sm text-[#e7e6e1]">{analysis.session_analysis.best_session.description}</p>
              </div>
            )}
          </div>
          <div className="card p-5">
            <p className="text-sm text-[#e7e6e1]">
              Your winning sessions average{' '}
              <span className="font-mono font-medium text-mint-500">{analysis.session_analysis.avg_bets_per_winning_session}</span> bets.
              Your losing sessions average{' '}
              <span className="font-mono font-medium text-red-400">{analysis.session_analysis.avg_bets_per_losing_session}</span> bets.
            </p>
            <p className="text-ink-600 text-sm mt-2">{analysis.session_analysis.insight}</p>
            <p className="text-ink-700 text-xs mt-2">
              {analysis.session_analysis.total_sessions} sessions analyzed (3+ hour gap = new session)
            </p>
          </div>
        </div>
      )}

      {/* Action Plan */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">Action Plan</h2>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-xl font-bold text-flame-500 mt-0.5 shrink-0">{rec.priority}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <h3 className="font-medium">{rec.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${DIFFICULTY_COLORS[rec.difficulty] ?? DIFFICULTY_COLORS.medium}`}>
                        {rec.difficulty}
                      </span>
                    </div>
                    <p className="text-[#e7e6e1] text-sm">{rec.description}</p>
                    <p className="text-ink-600 text-xs mt-2">
                      Expected improvement: <span className="text-mint-500">{rec.expected_improvement}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Rules */}
      {(analysis.personal_rules ?? []).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Your Rules</h2>
            <button
              onClick={() => {
                const text = (analysis.personal_rules ?? [])
                  .map((r: PersonalRule, i: number) => `${i + 1}. ${r.rule}\n   Why: ${r.reason}`)
                  .join('\n\n');
                navigator.clipboard.writeText(text);
              }}
              className="text-xs text-ink-600 hover:text-flame-500 transition-colors"
            >
              Copy Rules
            </button>
          </div>
          <div className="space-y-3">
            {(analysis.personal_rules ?? []).map((rule: PersonalRule, i: number) => (
              <div key={i} className="card border-l-4 border-l-flame-500 bg-ink-800/60 p-5">
                <p className="text-[#e7e6e1] font-medium mb-2">{rule.rule}</p>
                <p className="text-ink-600 text-sm mb-2">{rule.reason}</p>
                <p className="text-ink-700 text-xs">Based on: {rule.based_on}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What If Analysis */}
      {whatIfs.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-2xl">What If?</h2>
          <p className="text-ink-600 text-sm">Counterfactual scenarios calculated from your actual bet data.</p>
          <div className="grid gap-3">
            {whatIfs.map((wi, i) => {
              const diff = wi.hypothetical - wi.actual;
              const better = diff > 0;
              return (
                <div key={i} className="card p-5">
                  <p className="text-[#e7e6e1] text-sm mb-3">{wi.label}</p>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-ink-600 text-xs">Actual P&L</p>
                      <p className={`font-mono font-semibold ${wi.actual >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                        {wi.actual >= 0 ? '+' : ''}${Math.round(wi.actual).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-ink-700">→</span>
                    <div>
                      <p className="text-ink-600 text-xs">Hypothetical P&L</p>
                      <p className={`font-mono font-semibold ${wi.hypothetical >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                        {wi.hypothetical >= 0 ? '+' : ''}${Math.round(wi.hypothetical).toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <p className="text-ink-600 text-xs">Difference</p>
                      <p className={`font-mono font-semibold ${better ? 'text-mint-500' : 'text-red-400'}`}>
                        {better ? '+' : ''}${Math.round(diff).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discipline Score */}
      {analysis.discipline_score && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Discipline Score</h2>
            <span className={`font-mono text-3xl font-bold ${
              analysis.discipline_score.total >= 71 ? 'text-mint-500' :
              analysis.discipline_score.total >= 51 ? 'text-amber-400' :
              analysis.discipline_score.total >= 31 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {analysis.discipline_score.total}/100
            </span>
          </div>
          <p className="text-ink-600 text-xs">
            Measures how consistently you&apos;re building better betting habits — tracking, sizing, emotional control, and strategic focus.
          </p>
          <div className="w-full h-3 bg-ink-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                analysis.discipline_score.total >= 71 ? 'bg-mint-500' :
                analysis.discipline_score.total >= 51 ? 'bg-amber-400' :
                analysis.discipline_score.total >= 31 ? 'bg-orange-400' : 'bg-red-400'
              }`}
              style={{ width: `${analysis.discipline_score.total}%` }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { label: 'Tracking', val: analysis.discipline_score.tracking },
              { label: 'Sizing', val: analysis.discipline_score.sizing },
              { label: 'Control', val: analysis.discipline_score.control },
              { label: 'Strategy', val: analysis.discipline_score.strategy },
            ]).map(({ label, val }) => (
              <div key={label}>
                <p className="text-ink-700 text-xs mb-1">{label}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-ink-900 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${val >= 18 ? 'bg-mint-500' : val >= 12 ? 'bg-amber-400' : val >= 6 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${(val / 25) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-ink-600">{val}/25</span>
                </div>
              </div>
            ))}
          </div>
          {(() => {
            const scores = [
              { name: 'Tracking', val: analysis.discipline_score!.tracking },
              { name: 'Sizing', val: analysis.discipline_score!.sizing },
              { name: 'Control', val: analysis.discipline_score!.control },
              { name: 'Strategy', val: analysis.discipline_score!.strategy },
            ];
            const weakest = scores.sort((a, b) => a.val - b.val)[0];
            const tips: Record<string, string> = {
              Tracking: 'Set your bankroll, upload bets regularly, and keep your autopsy streak alive.',
              Sizing: 'Flatten your bet sizing. Big swings in stake amounts signal emotional decisions.',
              Control: 'Your emotion score is high. Focus on the post-loss escalation pattern.',
              Strategy: 'Too much volume in losing categories. Check your Edge Profile and shift bets to what works.',
            };
            return (
              <p className="text-ink-600 text-xs">
                Weakest area: <span className="text-[#e7e6e1]">{weakest.name} ({weakest.val}/25)</span> — {tips[weakest.name]}
              </p>
            );
          })()}
        </div>
      )}

      {/* Feedback */}
      <ReportFeedback reportId={reportId} />
    </div>
  );
}

function SummaryItem({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <div>
      <p className="text-ink-600 text-xs mb-0.5">{label}</p>
      <p className={`font-mono font-semibold ${small ? 'text-sm' : 'text-lg'} ${color ?? 'text-[#e7e6e1]'}`}>{value}</p>
    </div>
  );
}

// ── Share Section ──

function ShareSection({ analysis, summary, reportId, bets }: { analysis: AutopsyAnalysis; summary: AutopsyAnalysis['summary']; reportId?: string; bets?: Bet[] }) {
  const [showModal, setShowModal] = useState(false);

  // Calculate best edge and biggest leak from strategic leaks OR from bets directly
  const leaks = analysis.strategic_leaks ?? [];
  let bestEdgeData: { category: string; roi: number } | null = null;
  let biggestLeakData: { category: string; roi: number } | null = null;

  const bestLeakEdge = leaks.filter((l) => l.roi_impact > 0).sort((a, b) => b.roi_impact - a.roi_impact)[0];
  const worstLeak = leaks.filter((l) => l.roi_impact < 0).sort((a, b) => a.roi_impact - b.roi_impact)[0];

  if (bestLeakEdge) bestEdgeData = { category: bestLeakEdge.category, roi: bestLeakEdge.roi_impact };
  if (worstLeak) biggestLeakData = { category: worstLeak.category, roi: worstLeak.roi_impact };

  // Fallback: calculate from bets if no leaks data
  if ((!bestEdgeData || !biggestLeakData) && bets && bets.length > 0) {
    const catMap = new Map<string, { profit: number; staked: number; count: number }>();
    bets.filter((b) => b.result === 'win' || b.result === 'loss').forEach((b) => {
      const key = `${b.sport} ${b.bet_type}`;
      const c = catMap.get(key) ?? { profit: 0, staked: 0, count: 0 };
      c.profit += Number(b.profit); c.staked += Number(b.stake); c.count++;
      catMap.set(key, c);
    });
    const cats = Array.from(catMap.entries())
      .filter(([, v]) => v.count >= 3 && v.staked > 0)
      .map(([k, v]) => ({ category: k, roi: (v.profit / v.staked) * 100 }));
    if (!bestEdgeData) {
      const best = cats.filter((c) => c.roi > 0).sort((a, b) => b.roi - a.roi)[0];
      if (best) bestEdgeData = best;
    }
    if (!biggestLeakData) {
      const worst = cats.filter((c) => c.roi < 0).sort((a, b) => a.roi - b.roi)[0];
      if (worst) biggestLeakData = worst;
    }
  }

  // Calculate win rate from summary
  const parts = summary.record.match(/(\d+)W-(\d+)L-(\d+)P/);
  const winRate = parts ? (parseInt(parts[1]) / (parseInt(parts[1]) + parseInt(parts[2]) + parseInt(parts[3]))) * 100 : 0;

  // Calculate parlay percent from bets
  const parlayPct = bets && bets.length > 0
    ? (bets.filter((b) => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1)).length / bets.length) * 100
    : 0;

  const shareData: ShareCardData = {
    grade: summary.overall_grade,
    emotion_score: analysis.tilt_score,
    roi_percent: summary.roi_percent,
    win_rate: winRate,
    total_bets: summary.total_bets,
    record: summary.record,
    best_edge: bestEdgeData,
    biggest_leak: biggestLeakData,
    parlay_percent: parlayPct,
    sharp_score: analysis.edge_profile?.sharp_score ?? null,
    archetype: analysis.betting_archetype ?? null,
    discipline_score: analysis.discipline_score?.total ?? null,
    date_range: summary.date_range,
    bets,
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm !py-2">
          Share Card
        </button>
      </div>
      {showModal && (
        <ShareModal data={shareData} reportId={reportId} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
