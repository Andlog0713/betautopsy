'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import ReportFeedback from './ReportFeedback';
import type { ShareCardData } from './ShareCard';
import ShareModal from './ShareModal';
import type { AutopsyAnalysis, Bet, PersonalRule, ProgressSnapshot, TimingBucket, OddsBucket } from '@/types';

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

function emotionColor(score: number): string {
  if (score <= 25) return 'bg-mint-500';
  if (score <= 50) return 'bg-amber-400';
  if (score <= 75) return 'bg-orange-400';
  return 'bg-red-400';
}

function emotionLabel(score: number): string {
  if (score <= 20) return 'Cool and collected. Your decisions are strategy-driven.';
  if (score <= 40) return 'Mostly disciplined. Minor emotional patterns worth watching.';
  if (score <= 60) return 'Emotions are creeping in. This is costing you real money.';
  if (score <= 80) return 'Significant emotional betting. This is your biggest area for improvement.';
  return 'Your emotions are in the driver\'s seat. Addressing this is priority #1.';
}

function formatCategoryLabel(cat: string): string {
  const upper: Record<string, string> = { nba: 'NBA', nfl: 'NFL', nhl: 'NHL', mlb: 'MLB', ncaab: 'NCAAB', ncaaf: 'NCAAF', mma: 'MMA', ufc: 'UFC' };
  return cat.split(' ').map((word) => {
    const low = word.toLowerCase();
    if (upper[low]) return upper[low];
    // Replace underscores and capitalize
    return word.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }).join(' ');
}

function SkeletonSection({ label }: { label: string }) {
  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center gap-2 text-ink-600 text-sm">
        <span className="inline-block w-4 h-4 border-2 border-ink-600 border-t-flame-500 rounded-full animate-spin" />
        {label}
      </div>
      <div className="h-4 bg-ink-800 rounded animate-pulse w-full" />
      <div className="h-4 bg-ink-800 rounded animate-pulse w-2/3" />
      <div className="h-4 bg-ink-800 rounded animate-pulse w-4/5" />
    </div>
  );
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
      data.push({ category: formatCategoryLabel(k), roi: Math.round((v.profit / v.staked) * 1000) / 10, count: v.count });
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

  // Backward compat: read new field first, fall back to deprecated tilt_ fields for old saved reports
  const emotionScore = analysis.emotion_score ?? analysis.tilt_score ?? 0;
  const emotionBreakdown = analysis.emotion_breakdown ?? analysis.tilt_breakdown;

  // Detect if this is a partial (metrics-only) report still waiting for Claude
  const isPartialReport =
    biases_detected?.every((b) => !b.description && !b.fix) &&
    (!strategic_leaks || strategic_leaks.length === 0) &&
    (!recommendations || recommendations.length === 0);

  const pnlData = useMemo(() => buildPnLData(bets), [bets]);
  const stakeData = useMemo(() => buildStakeData(bets), [bets]);
  const roiData = useMemo(() => buildROIData(bets), [bets]);
  const whatIfs = useMemo(() => buildWhatIfs(bets), [bets]);

  const isSharp = tier === 'sharp';

  // Detect mixed sportsbook + DFS data
  const mixedDataInfo = useMemo(() => {
    if (bets.length < 10) return null;
    const dfsNames = ['prizepicks', 'prize picks', 'underdog', 'sleeper', 'dabble', 'thrive', 'betr picks'];
    const dfsBooksSet = new Set<string>();
    const sportsBooksSet = new Set<string>();
    for (const b of bets) {
      const book = (b.sportsbook ?? '').toLowerCase();
      if (!book) continue;
      if (dfsNames.some((d) => book.includes(d))) {
        dfsBooksSet.add(b.sportsbook!);
      } else {
        sportsBooksSet.add(b.sportsbook!);
      }
    }
    const dfsCount = bets.filter((b) => {
      const book = (b.sportsbook ?? '').toLowerCase();
      return dfsNames.some((d) => book.includes(d));
    }).length;
    const pct = dfsCount / bets.length;
    if (pct < 0.15 || pct > 0.85) return null;
    const dfsBook = Array.from(dfsBooksSet)[0] ?? null;
    const sportsBook = Array.from(sportsBooksSet)[0] ?? null;
    return { dfsBook, sportsBook };
  }, [bets]);

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
    { label: 'Emotion Score', from: previousSnapshot.tilt_score, to: emotionScore, lowerBetter: true },
    { label: 'Grade', from: previousSnapshot.overall_grade, to: analysis.summary.overall_grade, isGrade: true },
    { label: 'Loss Chase Ratio', from: previousSnapshot.loss_chase_ratio, to: null, lowerBetter: true, suffix: 'x' },
    { label: 'Parlay %', from: previousSnapshot.parlay_percent, to: null, lowerBetter: true, suffix: '%' },
    { label: 'ROI', from: previousSnapshot.roi_percent, to: analysis.summary.roi_percent, suffix: '%' },
  ] : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Tab Bar — hidden in readOnly/demo mode */}
      {hasSharpContent && !readOnly && (
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

      {/* Behavioral Analysis Report header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-flame-500 text-sm font-semibold uppercase tracking-wider">Behavioral Analysis Report</span>
          {analysis.dfs_mode && <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full ml-2">{analysis.dfs_platform ?? 'DFS'} Pick&apos;em</span>}
          <span className="text-ink-700 text-xs">·</span>
          <span className="text-ink-700 text-xs">{summary.date_range}</span>
        </div>
        <span className="text-ink-700 text-xs">{summary.total_bets} {analysis.dfs_mode ? 'entries' : 'bets'} analyzed</span>
      </div>

      {/* What this report analyzes — collapsible explainer */}
      <details className="card bg-ink-900/50 border-white/[0.04] mb-2">
        <summary className="px-4 py-3 text-sm text-ink-500 cursor-pointer hover:text-ink-400 flex items-center gap-2">
          <span>ℹ️</span> What this report analyzes
        </summary>
        <div className="px-4 pb-4 text-xs text-ink-600 leading-relaxed">
          Unlike a bet tracker that shows you numbers, BetAutopsy analyzes your betting <strong className="text-[#F0F0F0]">behavior</strong> — the psychological patterns, emotional responses, and cognitive biases that affect every bet you place. Below you&apos;ll find your Emotion Score (how much emotions drive your betting), Discipline Score (how consistent your process is), detected cognitive biases with dollar costs, and a personalized action plan.
        </div>
      </details>

      {/* Mixed data banner */}
      {mixedDataInfo && !readOnly && (
        <div className="card border-purple-500/20 bg-purple-500/5 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[#F0F0F0] font-medium text-sm">This report includes both sportsbook bets and DFS pick&apos;em entries.</p>
              <p className="text-ink-600 text-xs mt-1">For more accurate behavioral analysis, run separate reports for each.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {mixedDataInfo.sportsBook && (
                <a href={`/reports?run=true&sportsbook=${encodeURIComponent(mixedDataInfo.sportsBook)}`} className="text-xs font-medium bg-ink-900 hover:bg-ink-800 text-[#F0F0F0] px-3 py-2 rounded-lg transition-colors">
                  Sportsbook Only
                </a>
              )}
              {mixedDataInfo.dfsBook && (
                <a href={`/reports?run=true&sportsbook=${encodeURIComponent(mixedDataInfo.dfsBook)}`} className="text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-2 rounded-lg transition-colors">
                  DFS Only
                </a>
              )}
            </div>
          </div>
        </div>
      )}

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
      {!readOnly && <ShareSection analysis={analysis} summary={summary} reportId={reportId} bets={bets} />}

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

      {/* Behavioral Profile — 3 core metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <p className="text-ink-600 text-xs uppercase tracking-wider mb-2">Emotion Score</p>
          <p className={`font-mono text-4xl font-bold ${
            emotionScore <= 25 ? 'text-mint-500' : emotionScore <= 50 ? 'text-amber-400' : emotionScore <= 75 ? 'text-orange-400' : 'text-red-400'
          }`}>{emotionScore}/100</p>
          <div className="w-full h-2 bg-ink-900 rounded-full overflow-hidden mt-3 mb-2">
            <div className={`h-full rounded-full ${emotionColor(emotionScore)}`} style={{ width: `${emotionScore}%` }} />
          </div>
          <p className="text-ink-600 text-xs">{emotionLabel(emotionScore).split('.')[0]}.</p>
        </div>
        {analysis.discipline_score && (
          <div className="card p-5 text-center">
            <p className="text-ink-600 text-xs uppercase tracking-wider mb-2">Discipline Score</p>
            <p className={`font-mono text-4xl font-bold ${
              analysis.discipline_score.total >= 71 ? 'text-mint-500' : analysis.discipline_score.total >= 51 ? 'text-amber-400' : analysis.discipline_score.total >= 31 ? 'text-orange-400' : 'text-red-400'
            }`}>{analysis.discipline_score.total}/100</p>
            <div className="w-full h-2 bg-ink-900 rounded-full overflow-hidden mt-3 mb-2">
              <div className={`h-full rounded-full ${
                analysis.discipline_score.total >= 71 ? 'bg-mint-500' : analysis.discipline_score.total >= 51 ? 'bg-amber-400' : analysis.discipline_score.total >= 31 ? 'bg-orange-400' : 'bg-red-400'
              }`} style={{ width: `${analysis.discipline_score.total}%` }} />
            </div>
            <p className="text-ink-600 text-xs">How consistently you follow your process.</p>
          </div>
        )}
        <div className="card p-5 text-center">
          <p className="text-ink-600 text-xs uppercase tracking-wider mb-2">Overall Grade</p>
          <p className={`text-5xl font-bold ${gradeColor(summary.overall_grade)}`}>{summary.overall_grade}</p>
          <p className="text-ink-600 text-xs mt-3">Combines ROI, discipline, and emotional control.</p>
        </div>
      </div>

      {/* Performance Summary (condensed) */}
      <div className="bg-ink-900/30 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div>
          <span className="text-ink-700 text-xs">Record </span>
          <span className="font-mono text-sm text-[#F0F0F0]">{summary.record}</span>
        </div>
        <div>
          <span className="text-ink-700 text-xs">P&L </span>
          <span className={`font-mono text-sm ${summary.total_profit >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
            {summary.total_profit >= 0 ? '+' : ''}${summary.total_profit.toFixed(0)}
          </span>
        </div>
        <div>
          <span className="text-ink-700 text-xs">ROI </span>
          <span className={`font-mono text-sm ${summary.roi_percent >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
            {summary.roi_percent.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-ink-700 text-xs">Avg Stake </span>
          <span className="font-mono text-sm text-[#F0F0F0]">${summary.avg_stake.toFixed(0)}</span>
        </div>
      </div>

      {/* Summary Card — REMOVED (replaced by Behavioral Profile + condensed stats above) */}

      {/* P&L Over Time Chart */}
      {hasBets && pnlData.length > 1 && (
        <div className="card p-6">
          <h2 className="font-bold text-xl mb-1">Profit/Loss Over Time</h2>
          <p className="text-ink-700 text-xs italic mb-3">Track momentum shifts and identify when behavioral patterns impact results.</p>
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
            emotionScore <= 25 ? 'text-mint-500' :
            emotionScore <= 50 ? 'text-amber-400' :
            emotionScore <= 75 ? 'text-orange-400' : 'text-red-400'
          }`}>
            {emotionScore}/100
          </span>
        </div>
        <div className="w-full h-3 bg-ink-900 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${emotionColor(emotionScore)}`}
            style={{ width: `${emotionScore}%` }}
          />
        </div>
        <p className="text-ink-600 text-sm mb-2">{emotionLabel(emotionScore)}</p>
        <p className="text-ink-700 text-xs mb-3 italic">
          Measures how much emotions drive your betting decisions — chasing losses, erratic bet sizing, and heated betting. Lower is better. Calculated from four behavioral signals in your bet history, adjusted for odds and timing.
        </p>
        {emotionBreakdown && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/[0.06]">
            {([
              { label: 'Bet Sizing Consistency', key: 'stake_volatility' as const, hint: 'How much your bet sizes vary after accounting for odds differences' },
              { label: 'Reaction to Losses', key: 'loss_chasing' as const, hint: 'Whether your stakes increase after losing bets compared to after wins' },
              { label: 'During Losing Streaks', key: 'streak_behavior' as const, hint: 'How your betting speed and sizing change during consecutive losses' },
              { label: 'Knowing When to Stop', key: 'session_discipline' as const, hint: 'Whether you tend to over-bet in long sessions or chase back losses late at night' },
            ]).map(({ label, key, hint }) => {
              const val = emotionBreakdown![key];
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
                {!bias.description ? (
                  <div className="flex items-center gap-2 text-ink-600 text-sm py-2">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-ink-600 border-t-flame-500 rounded-full animate-spin" />
                    Generating analysis for this bias...
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategic Leaks */}
      {isPartialReport && <SkeletonSection label="Mapping strategic leaks by dollar impact..." />}
      {!isPartialReport && strategic_leaks.length > 0 && (
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
                      <td className="px-4 py-3 font-medium">{formatCategoryLabel(leak.category)}</td>
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
          <h2 className="font-bold text-xl mb-1">ROI by Category</h2>
          <p className="text-ink-700 text-xs italic mb-3">See where your edge lives and where it doesn&apos;t.</p>
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

      {/* Timing Patterns */}
      {analysis.timing_analysis && analysis.timing_analysis.by_day.some((d) => d.bets > 0) && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl">Timing Patterns</h2>
          <p className="text-ink-700 text-xs italic -mt-2">Your performance broken down by when you place bets — reveals hidden patterns in your schedule.</p>

          {/* Day of Week Chart */}
          <div className="card p-6">
            <h3 className="font-medium text-lg mb-4">ROI by Day of Week</h3>
            <div style={{ height: Math.max(200, analysis.timing_analysis.by_day.filter((d) => d.bets > 0).length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.timing_analysis.by_day.filter((d) => d.bets > 0)} layout="vertical" margin={{ left: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#5A5C6F20" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5A5C6F30' }} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="label" tick={{ fill: '#F0F0F0', fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as TimingBucket;
                      return (
                        <div className="bg-ink-800 border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-lg">
                          <p className="text-[#F0F0F0] font-medium">{d.label}</p>
                          <p className={`font-mono ${d.roi >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.roi.toFixed(1)}% ROI</p>
                          <p className="text-ink-600">{d.bets} bets · {d.win_rate.toFixed(0)}% win rate</p>
                          <p className={`font-mono text-xs ${d.profit >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.profit >= 0 ? '+' : ''}${d.profit.toFixed(0)}</p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={0} stroke="#5A5C6F50" />
                  <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                    {analysis.timing_analysis.by_day.filter((d) => d.bets > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.roi >= 0 ? '#00C853' : '#f87171'} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hour of Day Heatmap — only if we have real time data */}
          {analysis.timing_analysis.has_time_data && (
            <div className="card p-6">
              <h3 className="font-medium text-lg mb-1">Time of Day Heatmap</h3>
              <p className="text-ink-700 text-xs italic mb-4">Color intensity shows ROI. Size shows bet volume. Grey = no bets in that window.</p>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
                {analysis.timing_analysis.by_hour.map((h, i) => {
                  const hasBets = h.bets > 0;
                  const intensity = hasBets ? Math.min(1, h.bets / Math.max(...analysis.timing_analysis!.by_hour.map((x) => x.bets || 1))) : 0;
                  const bgColor = !hasBets
                    ? 'bg-ink-900/50'
                    : h.roi >= 10 ? 'bg-[#00C853]'
                    : h.roi >= 0 ? 'bg-[#00C853]'
                    : h.roi >= -10 ? 'bg-[#f87171]'
                    : 'bg-[#f87171]';
                  const opacity = !hasBets ? '' : h.roi >= 10 || h.roi <= -10 ? `opacity-${Math.round(Math.max(0.4, intensity) * 100) >= 70 ? '90' : '60'}` : `opacity-${Math.round(Math.max(0.3, intensity) * 100) >= 50 ? '50' : '30'}`;

                  return (
                    <div
                      key={i}
                      className="relative group"
                      title={hasBets ? `${h.label}: ${h.roi.toFixed(1)}% ROI, ${h.bets} bets` : `${h.label}: no bets`}
                    >
                      <div
                        className={`rounded-md aspect-square flex flex-col items-center justify-center ${bgColor} transition-all`}
                        style={{ opacity: hasBets ? Math.max(0.3, intensity * 0.7 + 0.3) : 0.15 }}
                      >
                        <span className="text-[10px] font-mono text-white/90 leading-none">{h.label.replace('am', 'a').replace('pm', 'p')}</span>
                        {hasBets && <span className="text-[9px] font-mono text-white/70 leading-none mt-0.5">{h.bets}</span>}
                      </div>
                      {/* Hover tooltip */}
                      {hasBets && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-ink-800 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          <p className="text-[#F0F0F0] font-medium">{h.label}</p>
                          <p className={`font-mono ${h.roi >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{h.roi.toFixed(1)}% ROI</p>
                          <p className="text-ink-600">{h.bets} bets · {h.win_rate.toFixed(0)}% WR</p>
                          <p className={`font-mono ${h.profit >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{h.profit >= 0 ? '+' : ''}${h.profit.toFixed(0)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-ink-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#00C853] opacity-60" />
                  <span>Profitable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#f87171] opacity-60" />
                  <span>Unprofitable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-ink-900/50 opacity-50" />
                  <span>No bets</span>
                </div>
              </div>
            </div>
          )}

          {/* Best / Worst / Late Night callouts */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysis.timing_analysis.best_window && (
              <div className="card border-mint-500/20 bg-mint-500/5 p-5">
                <p className="text-ink-600 text-xs mb-1">Best Window</p>
                <p className="font-bold text-xl text-mint-500">{analysis.timing_analysis.best_window.label}</p>
                <p className="font-mono text-mint-500 text-sm">+{analysis.timing_analysis.best_window.roi.toFixed(1)}% ROI</p>
                <p className="text-ink-600 text-xs mt-1">{analysis.timing_analysis.best_window.count} bets</p>
              </div>
            )}
            {analysis.timing_analysis.worst_window && (
              <div className="card border-red-400/20 bg-red-400/5 p-5">
                <p className="text-ink-600 text-xs mb-1">Worst Window</p>
                <p className="font-bold text-xl text-red-400">{analysis.timing_analysis.worst_window.label}</p>
                <p className="font-mono text-red-400 text-sm">{analysis.timing_analysis.worst_window.roi.toFixed(1)}% ROI</p>
                <p className="text-ink-600 text-xs mt-1">{analysis.timing_analysis.worst_window.count} bets</p>
              </div>
            )}
            {analysis.timing_analysis.late_night_stats && (
              <div className={`card p-5 ${analysis.timing_analysis.late_night_stats.roi < 0 ? 'border-orange-400/20 bg-orange-400/5' : 'border-white/[0.08]'}`}>
                <p className="text-ink-600 text-xs mb-1">Late Night (11pm–4am)</p>
                <p className="font-bold text-xl text-[#F0F0F0]">{analysis.timing_analysis.late_night_stats.count} bets</p>
                <p className={`font-mono text-sm ${analysis.timing_analysis.late_night_stats.roi >= 0 ? 'text-mint-500' : 'text-orange-400'}`}>
                  {analysis.timing_analysis.late_night_stats.roi.toFixed(1)}% ROI
                </p>
                <p className="text-ink-600 text-xs mt-1">{analysis.timing_analysis.late_night_stats.pct_of_total.toFixed(0)}% of all bets</p>
              </div>
            )}
          </div>

          {/* No time data notice */}
          {!analysis.timing_analysis.has_time_data && (
            <div className="card p-4 border-amber-400/20 bg-amber-400/5">
              <p className="text-amber-400 text-sm font-medium mb-1">Limited time data</p>
              <p className="text-ink-600 text-xs">
                Your CSV only included dates, not timestamps. Day-of-week analysis is available above, but hour-of-day patterns require time data.
                For full timing insights, use a tracker like Pikkit that exports <span className="text-[#F0F0F0]">time_placed_iso</span> with each bet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Odds Intelligence */}
      {analysis.odds_analysis && analysis.odds_analysis.buckets.some((b) => b.bets > 0) && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl">Odds Intelligence</h2>
          <p className="text-ink-700 text-xs italic -mt-2">How you perform at different price points — and whether you&apos;re finding real value or just getting lucky.</p>

          {/* Odds Bucket Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-ink-600 font-medium px-4 py-3">Odds Range</th>
                    <th className="text-right text-ink-600 font-medium px-4 py-3">Bets</th>
                    <th className="text-right text-ink-600 font-medium px-4 py-3">Win Rate</th>
                    <th className="text-right text-ink-600 font-medium px-4 py-3 hidden sm:table-cell">Implied</th>
                    <th className="text-right text-ink-600 font-medium px-4 py-3">Edge</th>
                    <th className="text-right text-ink-600 font-medium px-4 py-3">ROI</th>
                    <th className="text-right text-ink-600 font-medium px-4 py-3 hidden md:table-cell">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.odds_analysis.buckets.filter((b) => b.bets > 0).map((bucket, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      <td className="px-4 py-3">
                        <span className="font-medium">{bucket.label}</span>
                        <span className="text-ink-700 text-xs ml-1.5 hidden sm:inline">({bucket.range})</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink-500">{bucket.bets}</td>
                      <td className="px-4 py-3 text-right font-mono">{bucket.win_rate.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right font-mono text-ink-600 hidden sm:table-cell">{bucket.implied_prob.toFixed(0)}%</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${bucket.edge > 2 ? 'text-mint-500' : bucket.edge < -2 ? 'text-red-400' : 'text-ink-500'}`}>
                        {bucket.edge >= 0 ? '+' : ''}{bucket.edge.toFixed(1)}pp
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${bucket.roi >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                        {bucket.roi >= 0 ? '+' : ''}{bucket.roi.toFixed(1)}%
                      </td>
                      <td className={`px-4 py-3 text-right font-mono hidden md:table-cell ${bucket.profit >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                        {bucket.profit >= 0 ? '+' : ''}${bucket.profit.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-white/[0.04] bg-ink-900/30">
              <p className="text-ink-700 text-xs">
                <span className="text-ink-600">Edge</span> = your actual win rate minus the implied probability from the odds. Positive edge means you&apos;re beating the line at that price point.
              </p>
            </div>
          </div>

          {/* Edge by Bucket Visual */}
          {analysis.odds_analysis.buckets.filter((b) => b.bets >= 3).length > 0 && (
            <div className="card p-6">
              <h3 className="font-medium text-lg mb-4">Edge by Odds Range</h3>
              <div style={{ height: Math.max(180, analysis.odds_analysis.buckets.filter((b) => b.bets >= 3).length * 42) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.odds_analysis.buckets.filter((b) => b.bets >= 3)} layout="vertical" margin={{ left: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#5A5C6F20" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5A5C6F30' }} tickFormatter={(v: number) => `${v}pp`} />
                    <YAxis type="category" dataKey="label" tick={{ fill: '#F0F0F0', fontSize: 12 }} tickLine={false} axisLine={false} width={85} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as OddsBucket;
                        return (
                          <div className="bg-ink-800 border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-lg">
                            <p className="text-[#F0F0F0] font-medium">{d.label}</p>
                            <p className={`font-mono ${d.edge >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.edge >= 0 ? '+' : ''}{d.edge.toFixed(1)}pp edge</p>
                            <p className="text-ink-600">{d.win_rate.toFixed(0)}% actual vs {d.implied_prob.toFixed(0)}% implied</p>
                            <p className="text-ink-600">{d.bets} bets · {d.roi.toFixed(1)}% ROI</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0} stroke="#5A5C6F50" />
                    <Bar dataKey="edge" radius={[0, 4, 4, 0]}>
                      {analysis.odds_analysis.buckets.filter((b) => b.bets >= 3).map((entry, i) => (
                        <Cell key={i} fill={entry.edge >= 0 ? '#00C853' : '#f87171'} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Luck vs Skill + Best/Worst Callouts */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Luck vs Skill */}
            <div className={`card p-5 ${
              analysis.odds_analysis.luck_rating > 1 ? 'border-amber-400/20 bg-amber-400/5' :
              analysis.odds_analysis.luck_rating < -1 ? 'border-cyan-400/20 bg-cyan-400/5' :
              'border-white/[0.08]'
            }`}>
              <p className="text-ink-600 text-xs mb-1">Luck vs Skill</p>
              <p className={`font-bold text-xl ${
                analysis.odds_analysis.luck_rating > 1 ? 'text-amber-400' :
                analysis.odds_analysis.luck_rating < -1 ? 'text-cyan-400' :
                'text-[#F0F0F0]'
              }`}>
                {analysis.odds_analysis.luck_label}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">Expected wins</span>
                  <span className="font-mono text-ink-500">{analysis.odds_analysis.expected_wins.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-600">Actual wins</span>
                  <span className="font-mono text-[#F0F0F0]">{analysis.odds_analysis.actual_wins}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/[0.06] pt-1">
                  <span className="text-ink-600">Difference</span>
                  <span className={`font-mono font-semibold ${analysis.odds_analysis.luck_rating >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {analysis.odds_analysis.luck_rating >= 0 ? '+' : ''}{analysis.odds_analysis.luck_rating.toFixed(1)} wins
                  </span>
                </div>
              </div>
              <p className="text-ink-700 text-[10px] mt-2 italic">
                {analysis.odds_analysis.luck_rating > 1
                  ? 'You\'re winning more than the odds predict. Could be skill, could be variance — more bets will tell.'
                  : analysis.odds_analysis.luck_rating < -1
                  ? 'You\'re winning less than expected. Could be bad luck — or the lines you\'re taking aren\'t as good as they look.'
                  : 'Your results are tracking close to what the odds predict. Solid baseline.'}
              </p>
            </div>

            {/* Best Bucket */}
            {analysis.odds_analysis.best_bucket && (
              <div className="card border-mint-500/20 bg-mint-500/5 p-5">
                <p className="text-ink-600 text-xs mb-1">Best Odds Range</p>
                <p className="font-bold text-xl text-mint-500">{analysis.odds_analysis.best_bucket.label}</p>
                <p className="font-mono text-mint-500 text-sm">+{analysis.odds_analysis.best_bucket.edge.toFixed(1)}pp edge</p>
                <p className="text-ink-600 text-xs mt-1">{analysis.odds_analysis.best_bucket.count} bets</p>
                <p className="text-ink-700 text-[10px] mt-2 italic">You consistently beat the implied odds here.</p>
              </div>
            )}

            {/* Worst Bucket */}
            {analysis.odds_analysis.worst_bucket && (
              <div className="card border-red-400/20 bg-red-400/5 p-5">
                <p className="text-ink-600 text-xs mb-1">Worst Odds Range</p>
                <p className="font-bold text-xl text-red-400">{analysis.odds_analysis.worst_bucket.label}</p>
                <p className="font-mono text-red-400 text-sm">{analysis.odds_analysis.worst_bucket.edge.toFixed(1)}pp edge</p>
                <p className="text-ink-600 text-xs mt-1">{analysis.odds_analysis.worst_bucket.count} bets</p>
                <p className="text-ink-700 text-[10px] mt-2 italic">The odds are beating you at this price point.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DFS Pick Count Distribution */}
      {analysis.dfs_mode && analysis.dfs_metrics && analysis.dfs_metrics.pickCountDistribution.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-xl">Performance by Pick Count</h2>
            <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">DFS</span>
          </div>
          <p className="text-ink-700 text-xs italic mb-4">Fewer picks = higher win rate. Where&apos;s your sweet spot?</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-ink-600 font-medium px-3 py-2">Picks</th>
                  <th className="text-right text-ink-600 font-medium px-3 py-2">Entries</th>
                  <th className="text-right text-ink-600 font-medium px-3 py-2">Win Rate</th>
                  <th className="text-right text-ink-600 font-medium px-3 py-2">ROI</th>
                  <th className="text-right text-ink-600 font-medium px-3 py-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {analysis.dfs_metrics.pickCountDistribution.map((d) => (
                  <tr key={d.picks} className="border-b border-white/[0.04]">
                    <td className="px-3 py-2 font-medium">{d.picks}-pick</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-500">{d.count}</td>
                    <td className="px-3 py-2 text-right font-mono">{d.winRate}%</td>
                    <td className={`px-3 py-2 text-right font-mono font-medium ${d.roi >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                      {d.roi >= 0 ? '+' : ''}{d.roi}%
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${d.profit >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                      {d.profit >= 0 ? '+' : ''}${d.profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DFS Power vs Flex */}
      {analysis.dfs_mode && analysis.dfs_metrics?.powerVsFlex && (
        <div className="card p-6">
          <h2 className="font-bold text-xl mb-1">Power Play vs Flex Play</h2>
          <p className="text-ink-700 text-xs italic mb-4">Power is all-or-nothing. Flex pays partial. Which is actually working?</p>
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 ${analysis.dfs_metrics.powerVsFlex.powerROI >= analysis.dfs_metrics.powerVsFlex.flexROI ? 'bg-mint-500/5 border border-mint-500/20' : 'bg-red-400/5 border border-red-400/20'}`}>
              <p className="text-ink-600 text-xs uppercase tracking-wider mb-2">Power Play</p>
              <p className="font-mono text-2xl font-bold">{analysis.dfs_metrics.powerVsFlex.powerCount}</p>
              <p className="text-ink-600 text-xs">entries</p>
              <p className={`font-mono text-lg font-medium mt-2 ${analysis.dfs_metrics.powerVsFlex.powerROI >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                {analysis.dfs_metrics.powerVsFlex.powerROI >= 0 ? '+' : ''}{analysis.dfs_metrics.powerVsFlex.powerROI}% ROI
              </p>
            </div>
            <div className={`rounded-xl p-4 ${analysis.dfs_metrics.powerVsFlex.flexROI >= analysis.dfs_metrics.powerVsFlex.powerROI ? 'bg-mint-500/5 border border-mint-500/20' : 'bg-red-400/5 border border-red-400/20'}`}>
              <p className="text-ink-600 text-xs uppercase tracking-wider mb-2">Flex Play</p>
              <p className="font-mono text-2xl font-bold">{analysis.dfs_metrics.powerVsFlex.flexCount}</p>
              <p className="text-ink-600 text-xs">entries</p>
              <p className={`font-mono text-lg font-medium mt-2 ${analysis.dfs_metrics.powerVsFlex.flexROI >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                {analysis.dfs_metrics.powerVsFlex.flexROI >= 0 ? '+' : ''}{analysis.dfs_metrics.powerVsFlex.flexROI}% ROI
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DFS Player Concentration */}
      {analysis.dfs_mode && analysis.dfs_metrics && analysis.dfs_metrics.playerConcentration.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-xl mb-1">Player Concentration</h2>
          <p className="text-ink-700 text-xs italic mb-4">Are you over-exposed to specific players?</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-ink-600 font-medium px-3 py-2">Player</th>
                  <th className="text-right text-ink-600 font-medium px-3 py-2">Appearances</th>
                  <th className="text-right text-ink-600 font-medium px-3 py-2">% of Entries</th>
                  <th className="text-right text-ink-600 font-medium px-3 py-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {analysis.dfs_metrics.playerConcentration.slice(0, 10).map((p) => (
                  <tr key={p.player} className="border-b border-white/[0.04]">
                    <td className="px-3 py-2 font-medium">{p.player}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-500">{p.count}</td>
                    <td className={`px-3 py-2 text-right font-mono ${p.percent >= 30 ? 'text-red-400' : p.percent >= 20 ? 'text-amber-400' : 'text-ink-500'}`}>
                      {p.percent}%
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${p.roi >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                      {p.roi >= 0 ? '+' : ''}{p.roi}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edge Profile */}
      {isPartialReport && <SkeletonSection label="Ranking your edges and leaks by dollar impact..." />}
      {!isPartialReport && analysis.edge_profile && (
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
                      <span className="font-medium text-sm">{formatCategoryLabel(area.category)}</span>
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
                      <span className="font-medium text-sm">{formatCategoryLabel(area.category)}</span>
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
      {isPartialReport && <SkeletonSection label="Scanning for cognitive biases and emotional patterns..." />}
      {!isPartialReport && behavioral_patterns.length > 0 && (
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
      {isPartialReport && <SkeletonSection label="Building your session-by-session tilt analysis..." />}
      {!isPartialReport && analysis.session_analysis && (
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
      {isPartialReport && <SkeletonSection label="Generating your personalized action plan..." />}
      {!isPartialReport && recommendations.length > 0 && (
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
      {isPartialReport && <SkeletonSection label="Writing personal betting rules from your data..." />}
      {!isPartialReport && (analysis.personal_rules ?? []).length > 0 && (
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
              { label: 'Control', val: analysis.discipline_score.control, hint: 'Tied to your emotion score — staying cool means more control' },
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
                  <p className="text-ink-600 text-xs mt-0.5">Your leaks are ranked and ready. See what to fix first.</p>
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
                  <p className="text-ink-600 text-xs mt-0.5">See every leak ranked by dollar cost and simulate what fixing each one saves you.</p>
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
            {isPartialReport && <SkeletonSection label="Simulating behavioral what-if scenarios..." />}
            {!isPartialReport && whatIfs.length > 0 && (
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
            {isPartialReport && <SkeletonSection label="Ranking behavioral leaks by dollar cost..." />}
            {!isPartialReport && prioritizedLeaks.length > 0 && (
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
              <p className="text-ink-600 text-sm mb-4">Every behavioral leak, ranked by dollar cost. See exactly where to fix first — and simulate how much you&apos;d save.</p>
              {/* Blurred Leak Prioritizer preview */}
              <div className="relative mb-6">
                <div className="blur-sm pointer-events-none opacity-50 space-y-2">
                  {[
                    { name: 'Loss Chasing', cost: 340, pct: 38 },
                    { name: 'Parlay Overexposure', cost: 210, pct: 23 },
                    { name: 'Late Night Impulse Bets', cost: 180, pct: 20 },
                    { name: 'Favorite Bias (NFL)', cost: 170, pct: 19 },
                  ].map((item) => (
                    <div key={item.name} className="card p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="font-mono text-red-400 text-sm">-${item.cost}/mo</span>
                      </div>
                      <div className="h-2 bg-ink-900 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-flame-500" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <a href="/pricing" className="btn-primary inline-block">Unlock Sharp — $24.99/mo</a>
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

function ShareSection({ analysis, summary, reportId, bets }: { analysis: AutopsyAnalysis; summary: AutopsyAnalysis['summary']; reportId?: string; bets?: Bet[] }) {
  const [showModal, setShowModal] = useState(false);

  // Build share card data — find best edge from edge_profile or strategic_leaks
  const leaks = analysis.strategic_leaks ?? [];
  const profitableAreas = analysis.edge_profile?.profitable_areas ?? [];
  const bestProfitable = profitableAreas.sort((a, b) => b.roi - a.roi)[0];
  const bestLeakEdge = leaks.filter((l) => l.roi_impact > 0).sort((a, b) => b.roi_impact - a.roi_impact)[0];
  const bestEdge = bestProfitable
    ? { category: bestProfitable.category, roi: bestProfitable.roi }
    : bestLeakEdge
    ? { category: bestLeakEdge.category, roi: bestLeakEdge.roi_impact }
    : null;
  const biggestLeak = leaks.filter((l) => l.roi_impact < 0).sort((a, b) => a.roi_impact - b.roi_impact)[0];

  const parts = summary.record.match(/(\d+)W-(\d+)L-(\d+)P/);
  const winRate = parts ? (parseInt(parts[1]) / (parseInt(parts[1]) + parseInt(parts[2]) + parseInt(parts[3]))) * 100 : 0;
  const parlayPct = bets && bets.length > 0
    ? (bets.filter((b) => b.bet_type === 'parlay' || (b.parlay_legs && b.parlay_legs > 1)).length / bets.length) * 100
    : 0;

  const emotionScore = analysis.emotion_score ?? analysis.tilt_score ?? 0;

  const shareData: ShareCardData = {
    grade: summary.overall_grade,
    emotion_score: emotionScore,
    roi_percent: summary.roi_percent,
    win_rate: winRate,
    total_bets: summary.total_bets,
    record: summary.record,
    best_edge: bestEdge,
    biggest_leak: biggestLeak ? { category: biggestLeak.category, roi: biggestLeak.roi_impact } : null,
    parlay_percent: parlayPct,
    sharp_score: analysis.edge_profile?.sharp_score ?? null,
    archetype: analysis.betting_archetype ?? null,
    discipline_score: analysis.discipline_score?.total ?? null,
    date_range: summary.date_range,
    bets,
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={!reportId}
        className="btn-primary text-sm !py-2 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>
      {showModal && (
        <ShareModal
          data={shareData}
          reportId={reportId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
