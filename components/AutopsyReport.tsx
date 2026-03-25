'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import ReportFeedback from './ReportFeedback';
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
    <div className="bg-ink-800 border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-600">{label}</p>
      <p className={`font-mono font-medium ${payload[0].value >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

// ── Main Component ──

export default function AutopsyReport({ analysis, bets = [], previousSnapshot, reportId, tier = 'free', readOnly = false }: { analysis: AutopsyAnalysis; bets?: Bet[]; previousSnapshot?: ProgressSnapshot | null; reportId?: string; tier?: 'free' | 'pro' | 'sharp'; readOnly?: boolean }) {
  const { summary, biases_detected, strategic_leaks, behavioral_patterns, recommendations } = analysis;

  const pnlData = useMemo(() => buildPnLData(bets), [bets]);
  const stakeData = useMemo(() => buildStakeData(bets), [bets]);
  const roiData = useMemo(() => buildROIData(bets), [bets]);
  const whatIfs = useMemo(() => buildWhatIfs(bets), [bets]);

  const isSharp = tier === 'sharp';

  // Leak Prioritizer: combine biases + strategic leaks, rank by $ impact
  const prioritizedLeaks = useMemo(() => {
    const items: { name: string; type: 'bias' | 'leak'; cost: number; severity?: string; fix: string; detail?: string }[] = [];

    biases_detected.forEach((b) => {
      if (b.estimated_cost > 0) {
        items.push({ name: b.bias_name, type: 'bias', cost: Math.abs(b.estimated_cost), severity: b.severity, fix: b.fix });
      }
    });

    // Estimate $ cost for strategic leaks from bets data
    const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
    strategic_leaks.forEach((leak) => {
      if (leak.roi_impact < 0) {
        // Find matching bets to compute actual dollar loss
        const lower = leak.category.toLowerCase();
        const matching = settled.filter((b) => {
          const key = `${b.sport} ${b.bet_type}`.toLowerCase();
          return key.includes(lower) || lower.includes(b.sport.toLowerCase()) || lower.includes(b.bet_type.toLowerCase());
        });
        const totalLoss = matching.reduce((s, b) => s + Number(b.profit), 0);
        const cost = Math.abs(totalLoss);
        if (cost > 0) {
          items.push({ name: leak.category, type: 'leak', cost, fix: leak.suggestion, detail: leak.detail });
        }
      }
    });

    items.sort((a, b) => b.cost - a.cost);
    return items;
  }, [biases_detected, strategic_leaks, bets]);

  const totalRecoverable = prioritizedLeaks.reduce((s, l) => s + l.cost, 0);

  const hasBets = bets.length > 0;

  const [activeTab, setActiveTab] = useState<'report' | 'sharp'>('report');
  const hasSharpContent = whatIfs.length > 0 || prioritizedLeaks.length > 0;

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
      {/* Tab Bar */}
      {hasSharpContent && (
        <div className="flex gap-1 bg-ink-900 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'report'
                ? 'bg-ink-800 text-[#F0F0F0] shadow-sm'
                : 'text-ink-600 hover:text-ink-500'
            }`}
          >
            Report
          </button>
          <button
            onClick={() => setActiveTab('sharp')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'sharp'
                ? 'bg-cyan-400/10 text-cyan-400 shadow-sm border border-cyan-400/20'
                : 'text-cyan-400/60 hover:text-cyan-400'
            }`}
          >
            Sharp
            {!isSharp && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* ═══ Report Tab ═══ */}
      {activeTab === 'report' && <>
      {/* Bet DNA */}
      {analysis.betting_archetype && (
        <div className="card p-6 border-flame-500/20 bg-gradient-to-r from-flame-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧬</span>
            <div>
              <p className="text-ink-600 text-xs uppercase tracking-wider">Your Bet DNA <span className="normal-case text-ink-700">(your betting personality based on patterns in your data)</span></p>
              <h2 className="font-bold text-2xl text-flame-500">{analysis.betting_archetype.name}</h2>
            </div>
          </div>
          <p className="text-[#F0F0F0] text-sm">{analysis.betting_archetype.description}</p>
        </div>
      )}

      {/* Share */}
      {!readOnly && <ShareSection analysis={analysis} summary={summary} reportId={reportId} />}

      {/* vs. Last Report */}
      {previousSnapshot && (
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-3">
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
          <h2 className="font-bold text-2xl">Autopsy Summary</h2>
          <div className="flex items-center gap-2" title="Combines ROI, win rate, discipline, and emotional control into a single letter grade">
            <span className="text-ink-600 text-sm">Overall Grade:</span>
            <span className={`font-bold text-4xl font-bold ${gradeColor(summary.overall_grade)}`}>
              {summary.overall_grade}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryItem label="Record" value={summary.record} />
          <SummaryItem
            label="Net Profit/Loss"
            value={`${summary.total_profit >= 0 ? '+' : ''}$${summary.total_profit.toFixed(2)}`}
            color={summary.total_profit >= 0 ? 'text-mint-500' : 'text-red-400'}
          />
          <SummaryItem
            label="ROI"
            hint="return on investment"
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
          <h2 className="font-bold text-xl mb-4">Profit/Loss Over Time</h2>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5A5C6F20" />
                <XAxis dataKey="date" tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5A5C6F30' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5A5C6F30' }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="#5A5C6F50" />
                <Line type="monotone" dataKey="pnl" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Emotion Score */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-xl">Emotion Score</h2>
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
        <p className="text-ink-600 text-sm mb-2">{tiltLabel(analysis.tilt_score)}</p>
        <p className="text-ink-700 text-xs mb-3 italic">
          Measures how much emotions drive your betting decisions — chasing losses, erratic bet sizing, and tilt betting. Lower is better. Calculated from four behavioral signals in your bet history, adjusted for odds and timing.
        </p>
        {analysis.tilt_breakdown && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/[0.06]">
            {([
              { label: 'Bet Sizing Consistency', key: 'stake_volatility' as const, hint: 'How much your bet sizes vary after accounting for odds differences' },
              { label: 'Reaction to Losses', key: 'loss_chasing' as const, hint: 'Whether your stakes increase after losing bets compared to after wins' },
              { label: 'During Losing Streaks', key: 'streak_behavior' as const, hint: 'How your betting speed and sizing change during consecutive losses' },
              { label: 'Knowing When to Stop', key: 'session_discipline' as const, hint: 'Whether you tend to over-bet in long sessions or chase back losses late at night' },
            ]).map(({ label, key, hint }) => {
              const val = analysis.tilt_breakdown![key];
              return (
                <div key={key}>
                  <p className="text-ink-700 text-xs mb-1" title={hint}>{label}</p>
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
                  <p className="text-ink-800 text-[10px] mt-0.5 leading-tight">{hint}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stake Size Timeline */}
      {hasBets && stakeData.length > 1 && (
        <div className="card p-6">
          <h2 className="font-bold text-xl mb-1">Stake Size Timeline</h2>
          <p className="text-ink-700 text-xs italic mb-1">How much you wagered on each bet over time. Spikes after losses can signal emotional betting.</p>
          <p className="text-ink-600 text-xs mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-[#5f594f] mr-1 align-middle" /> Normal
            <span className="inline-block w-2 h-2 rounded-full bg-[#f97316] mr-1 ml-3 align-middle" /> Within 1hr of a loss
          </p>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5A5C6F20" />
                <XAxis dataKey="date" tick={{ fill: '#A0A3B1', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#5A5C6F30' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5A5C6F30' }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="stake" radius={[2, 2, 0, 0]}>
                  {stakeData.map((entry, i) => (
                    <Cell key={i} fill={entry.afterLoss ? '#f97316' : '#5A5C6F'} />
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
                  If you feel your gambling is out of control, call <span className="text-[#F0F0F0]">1-800-GAMBLER</span> or visit <span className="text-[#F0F0F0]">ncpgambling.org</span> for self-exclusion resources.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Biases Detected */}
      {biases_detected.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl">Biases Detected</h2>
          <p className="text-ink-700 text-xs italic -mt-2">Unconscious habits that are hurting your results — patterns you probably don&apos;t notice in the moment.</p>
          <div className="grid gap-4">
            {biases_detected.map((bias, i) => (
              <div key={i} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                  <h3 className="font-medium text-lg">{bias.bias_name}</h3>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border self-start ${SEVERITY_COLORS[bias.severity] ?? SEVERITY_COLORS.medium}`}>
                    {bias.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-[#F0F0F0] text-sm mb-4">{bias.description}</p>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div className="bg-ink-900/50 rounded-lg p-3">
                    <p className="text-ink-600 text-xs mb-1">Evidence</p>
                    <p className="text-[#F0F0F0]">{bias.evidence}</p>
                  </div>
                  <div className="bg-ink-900/50 rounded-lg p-3">
                    <p className="text-ink-600 text-xs mb-1">Estimated Cost</p>
                    <p className="text-red-400 font-mono font-medium">-${Math.abs(bias.estimated_cost).toFixed(0)}</p>
                  </div>
                  <div className="bg-ink-900/50 rounded-lg p-3">
                    <p className="text-ink-600 text-xs mb-1">How to Fix</p>
                    <p className="text-[#F0F0F0]">{bias.fix}</p>
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
          <h2 className="font-bold text-2xl">Strategic Leaks</h2>
          <p className="text-ink-700 text-xs italic -mt-2">Specific bet types or sports where you&apos;re consistently losing money.</p>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
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
                    <tr key={i} className="border-b border-white/[0.04]">
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
          <h2 className="font-bold text-xl mb-4">ROI by Category</h2>
          <div style={{ height: Math.max(200, roiData.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5A5C6F20" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5A5C6F30' }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis type="category" dataKey="category" tick={{ fill: '#F0F0F0', fontSize: 12 }} tickLine={false} axisLine={false} width={55} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { category: string; roi: number; count: number };
                    return (
                      <div className="bg-ink-800 border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-lg">
                        <p className="text-[#F0F0F0] font-medium">{d.category}</p>
                        <p className={`font-mono ${d.roi >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.roi}% ROI</p>
                        <p className="text-ink-600">{d.count} bets</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={0} stroke="#5A5C6F50" />
                <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                  {roiData.map((entry, i) => (
                    <Cell key={i} fill={entry.roi >= 0 ? '#00C853' : '#f87171'} fillOpacity={0.7} />
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
          <h2 className="font-bold text-2xl">Edge Profile</h2>
          <p className="text-ink-700 text-xs italic -mt-2">Where you have a statistical advantage (edges) vs where you&apos;re losing money (leaks).</p>
          {/* Sharp Score */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-ink-600 text-sm">Sharp Score <span className="text-ink-700 italic">(how skilled your betting is overall)</span></span>
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
            <p className="text-ink-800 text-[10px] mt-1 italic">Based on closing line value, category-level ROI consistency, and sample size confidence.</p>
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
              <p className="text-sm text-[#F0F0F0]">{analysis.edge_profile.reallocation_advice}</p>
            </div>
          )}
        </div>
      )}

      {/* Behavioral Patterns */}
      {behavioral_patterns.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl">Behavioral Patterns</h2>
          <p className="text-ink-700 text-xs italic -mt-2">Recurring habits we found in your betting — some help you, some hurt you.</p>
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
                  <p className="text-[#F0F0F0] text-sm">{pat.description}</p>
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
          <h2 className="font-bold text-2xl">Session Analysis</h2>
          <p className="text-ink-700 text-xs italic -mt-2">A &quot;session&quot; is a group of bets placed close together in time — like a single night of betting.</p>
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
                <p className="text-sm text-[#F0F0F0]">{analysis.session_analysis.worst_session.description}</p>
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
                <p className="text-sm text-[#F0F0F0]">{analysis.session_analysis.best_session.description}</p>
              </div>
            )}
          </div>
          <div className="card p-5">
            <p className="text-sm text-[#F0F0F0]">
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
          <h2 className="font-bold text-2xl">Action Plan</h2>
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
                    <p className="text-[#F0F0F0] text-sm">{rec.description}</p>
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
            <h2 className="font-bold text-2xl">Your Rules</h2>
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
                <p className="text-[#F0F0F0] font-medium mb-2">{rule.rule}</p>
                <p className="text-ink-600 text-sm mb-2">{rule.reason}</p>
                <p className="text-ink-700 text-xs">Based on: {rule.based_on}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discipline Score */}
      {analysis.discipline_score && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-2xl">Discipline Score</h2>
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
              { label: 'Tracking', val: analysis.discipline_score.tracking, hint: 'Consistency of uploading and reviewing your bets' },
              { label: 'Sizing', val: analysis.discipline_score.sizing, hint: 'How flat and controlled your bet sizing is' },
              { label: 'Control', val: analysis.discipline_score.control, hint: 'Tied to your emotion score — lower tilt means more control' },
              { label: 'Strategy', val: analysis.discipline_score.strategy, hint: 'Whether you focus volume on your profitable categories' },
            ]).map(({ label, val, hint }) => (
              <div key={label}>
                <p className="text-ink-700 text-xs mb-1" title={hint}>{label}</p>
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
                Weakest area: <span className="text-[#F0F0F0]">{weakest.name} ({weakest.val}/25)</span> — {tips[weakest.name]}
              </p>
            );
          })()}
        </div>
      )}

      {/* Sharp tab nudge */}
      {hasSharpContent && !readOnly && (
        isSharp ? (
          <button
            onClick={() => { setActiveTab('sharp'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="w-full card p-5 text-left hover:border-cyan-400/20 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-400/10 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm text-[#F0F0F0] group-hover:text-cyan-400 transition-colors">View Sharp Analysis</p>
                  <p className="text-ink-600 text-xs mt-0.5">Your Sharp tools are ready for this report.</p>
                </div>
              </div>
              <span className="text-ink-700 group-hover:text-cyan-400 transition-colors text-sm shrink-0 ml-3">Sharp →</span>
            </div>
          </button>
        ) : (
          <a
            href="/pricing"
            className="block w-full card p-5 text-left hover:border-cyan-400/20 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-400/10 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm text-[#F0F0F0] group-hover:text-cyan-400 transition-colors">Unlock Sharp Analysis</p>
                  <p className="text-ink-600 text-xs mt-0.5">Get deeper insights from your report data.</p>
                </div>
              </div>
              <span className="text-ink-700 group-hover:text-cyan-400 transition-colors text-sm shrink-0 ml-3">See plans →</span>
            </div>
          </a>
        )
      )}

      {/* Feedback */}
      {!readOnly && <ReportFeedback reportId={reportId} />}
      </>}

      {/* ═══ Sharp Tab ═══ */}
      {activeTab === 'sharp' && (
        isSharp ? (
          <div className="space-y-8">
            {/* What If Simulator */}
            {whatIfs.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-bold text-2xl">What-If Simulator</h2>
                <p className="text-ink-600 text-sm">Counterfactual scenarios calculated from your actual bet data.</p>
                <div className="grid gap-3">
                  {whatIfs.map((wi, i) => {
                    const diff = wi.hypothetical - wi.actual;
                    const better = diff > 0;
                    const maxVal = Math.max(Math.abs(wi.actual), Math.abs(wi.hypothetical));
                    const actualPct = maxVal > 0 ? (Math.abs(wi.actual) / maxVal) * 100 : 0;
                    const hypoPct = maxVal > 0 ? (Math.abs(wi.hypothetical) / maxVal) * 100 : 0;
                    return (
                      <div key={i} className="card p-5">
                        <p className="text-[#F0F0F0] text-sm mb-4">{wi.label}</p>
                        <div className="space-y-3 mb-4">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-ink-600">Actual P&L</span>
                              <span className={`font-mono font-semibold ${wi.actual >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                                {wi.actual >= 0 ? '+' : ''}${Math.round(wi.actual).toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-ink-900 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${wi.actual >= 0 ? 'bg-mint-500' : 'bg-red-400'}`} style={{ width: `${actualPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-ink-600">Hypothetical P&L</span>
                              <span className={`font-mono font-semibold ${wi.hypothetical >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                                {wi.hypothetical >= 0 ? '+' : ''}${Math.round(wi.hypothetical).toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-ink-900 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${wi.hypothetical >= 0 ? 'bg-cyan-400' : 'bg-red-400'}`} style={{ width: `${hypoPct}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold ${better ? 'bg-mint-500/10 text-mint-500' : 'bg-red-400/10 text-red-400'}`}>
                          {better ? '↑' : '↓'} {better ? '+' : ''}${Math.round(diff).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leak Prioritizer */}
            {prioritizedLeaks.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-bold text-2xl">Leak Prioritizer</h2>

                <div className="card p-5 border-flame-500/20 bg-gradient-to-r from-flame-500/5 to-transparent">
                  <p className="text-ink-600 text-xs uppercase tracking-wider mb-1">Total Recoverable</p>
                  <p className="font-mono text-3xl font-bold text-flame-500">${Math.round(totalRecoverable).toLocaleString()}</p>
                  <p className="text-ink-600 text-sm mt-1">Estimated money left on the table from all detected leaks and biases, ranked by impact.</p>
                </div>

                <div className="space-y-3">
                  {prioritizedLeaks.map((item, i) => {
                    const pct = totalRecoverable > 0 ? (item.cost / totalRecoverable) * 100 : 0;
                    return (
                      <div key={i} className="card p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-bold text-flame-500 shrink-0">#{i + 1}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{item.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'bias' ? 'bg-orange-400/10 text-orange-400' : 'bg-red-400/10 text-red-400'}`}>
                                  {item.type}
                                </span>
                                {item.severity && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.medium}`}>
                                    {item.severity}
                                  </span>
                                )}
                              </div>
                              {item.detail && <p className="text-ink-600 text-xs mt-0.5">{item.detail}</p>}
                            </div>
                          </div>
                          <span className="font-mono text-lg font-bold text-red-400 shrink-0">
                            -${Math.round(item.cost).toLocaleString()}
                          </span>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-ink-600">Share of total leaks</span>
                            <span className="text-ink-500 font-mono">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-ink-900 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-flame-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <div className="bg-ink-900/50 rounded-lg p-3">
                          <p className="text-ink-600 text-xs mb-1">Fix</p>
                          <p className="text-[#F0F0F0] text-sm">{item.fix}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!readOnly && <ReportFeedback reportId={reportId} />}
          </div>
        ) : (
          /* Locked Sharp tab for non-Sharp users */
          <div className="space-y-6 py-4">
            <div className="text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="font-bold text-2xl">Sharp Analysis</h2>
              <p className="text-ink-600 text-sm">Advanced tools that turn your report data into actionable strategy.</p>
              <a href="/pricing" className="btn-primary inline-block">Unlock Sharp — $22/mo</a>
            </div>

            {!readOnly && <ReportFeedback reportId={reportId} />}
          </div>
        )
      )}
    </div>
  );
}

function SummaryItem({ label, value, color, small, hint }: { label: string; value: string; color?: string; small?: boolean; hint?: string }) {
  return (
    <div>
      <p className="text-ink-600 text-xs mb-0.5">{label}{hint && <span className="text-ink-700 normal-case"> ({hint})</span>}</p>
      <p className={`font-mono font-semibold ${small ? 'text-sm' : 'text-lg'} ${color ?? 'text-[#F0F0F0]'}`}>{value}</p>
    </div>
  );
}

// ── Share Section ──

function ShareSection({ analysis, summary, reportId }: { analysis: AutopsyAnalysis; summary: AutopsyAnalysis['summary']; reportId?: string }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function getShareUrl(): Promise<string | null> {
    if (shareUrl) return shareUrl;
    if (!reportId) return null;
    setLoading(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      const result = await res.json();
      if (result.share_id) {
        const url = `${window.location.origin}/share/${result.share_id}`;
        setShareUrl(url);
        return url;
      }
    } catch {
      console.error('Share link failed');
    } finally {
      setLoading(false);
    }
    return null;
  }

  async function handleShare() {
    const url = await getShareUrl();
    if (url) setOpen(true);
  }

  async function handleCopy() {
    const url = shareUrl ?? await getShareUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleTweet() {
    if (!shareUrl) return;
    const text = `My BetAutopsy: Grade ${summary.overall_grade}${analysis.betting_archetype ? ` | ${analysis.betting_archetype.name}` : ''} | Emotion Score: ${analysis.tilt_score}/100 | ROI: ${summary.roi_percent >= 0 ? '+' : ''}${summary.roi_percent.toFixed(1)}%`;
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={loading || !reportId}
        className="btn-primary text-sm !py-2 flex items-center gap-2"
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
        Share
      </button>

      {open && shareUrl && (
        <div className="mt-3 card p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] font-mono truncate"
              onFocus={(e) => e.target.select()}
            />
            <button onClick={handleCopy} className="btn-secondary text-sm whitespace-nowrap">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={handleTweet}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </button>
        </div>
      )}
    </div>
  );
}
