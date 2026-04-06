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
import ChapterNav from './report/ChapterNav';
import ChapterHeader from './report/ChapterHeader';
import SnapshotPaywall from './SnapshotPaywall';
import { Lock, AlertTriangle, CheckCircle2, XCircle, Minus, Flame } from 'lucide-react';
import { toast } from 'sonner';
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
  low: 'bg-win/10 text-win border-win/20',
  medium: 'bg-caution/10 text-caution border-caution/20',
  high: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  critical: 'bg-loss/10 text-loss border-loss/20',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-win/10 text-win',
  medium: 'bg-caution/10 text-caution',
  hard: 'bg-loss/10 text-loss',
};

function emotionColor(score: number): string {
  if (score <= 25) return 'bg-win';
  if (score <= 50) return 'bg-caution';
  if (score <= 75) return 'bg-orange-400';
  return 'bg-loss';
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
      <div className="flex items-center gap-2 text-fg-muted text-sm">
        <span className="inline-block w-4 h-4 border-2 border-fg-muted border-t-scalpel rounded-full animate-spin" />
        {label}
      </div>
      <div className="h-4 bg-surface-1 rounded animate-pulse w-full" />
      <div className="h-4 bg-surface-1 rounded animate-pulse w-2/3" />
      <div className="h-4 bg-surface-1 rounded animate-pulse w-4/5" />
    </div>
  );
}

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'text-win';
  if (g.startsWith('B')) return 'text-win/70';
  if (g.startsWith('C')) return 'text-caution';
  if (g.startsWith('D')) return 'text-orange-400';
  return 'text-loss';
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
    <div className="bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-xs shadow-lg">
      <p className="text-fg-muted">{label}</p>
      <p className={`font-mono font-medium ${payload[0].value >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

// ── Main Component ──

export default function AutopsyReport({ analysis, bets = [], previousSnapshot, reportId, tier = 'free', readOnly = false, isSnapshot = false }: { analysis: AutopsyAnalysis; bets?: Bet[]; previousSnapshot?: ProgressSnapshot | null; reportId?: string; tier?: 'free' | 'pro'; readOnly?: boolean; isSnapshot?: boolean }) {
  const { summary, biases_detected, strategic_leaks, behavioral_patterns, recommendations } = analysis;
  const snapshotLocked = isSnapshot && !readOnly;

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

  const isSharp = tier === 'pro'; // Sharp features now included in Pro

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

    // Known overlaps: bias name keywords → strategic leak category keywords
    // When both refer to the same behavior, we keep whichever has the higher cost
    const OVERLAP_KEYWORDS: [string[], string[]][] = [
      [['parlay'], ['parlay']],
      [['post-loss', 'post loss', 'chase', 'chasing', 'escalat'], ['post-loss', 'post loss', 'chase', 'chasing', 'escalat', 'tilt']],
      [['recency'], ['recency', 'recent']],
      [['favorite', 'favourite'], ['favorite', 'favourite', 'chalk']],
      [['prop'], ['prop']],
      [['live', 'in-game', 'in game'], ['live', 'in-game', 'in game']],
      [['late night', 'late-night'], ['late night', 'late-night']],
      [['underdog'], ['underdog']],
    ];

    const biasItems: typeof items = [];
    biases_detected.forEach((b) => {
      if (b.estimated_cost > 0) {
        biasItems.push({ name: b.bias_name, type: 'bias', cost: Math.abs(b.estimated_cost), severity: b.severity, fix: b.fix });
      }
    });

    // Estimate $ cost for strategic leaks from bets data
    const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
    const avgStake = settled.length > 0 ? settled.reduce((s, b) => s + Math.abs(Number(b.stake)), 0) / settled.length : 0;

    const leakItems: typeof items = [];
    strategic_leaks.forEach((leak) => {
      if (leak.roi_impact < 0) {
        const lower = leak.category.toLowerCase().trim();
        // Strip leading "all " (e.g. "All Parlays" → "parlays")
        const normalized = lower.replace(/^all\s+/, '');
        // Singular form for matching (strip trailing 's')
        const singular = normalized.replace(/s$/, '');

        // Find matching bets with normalized matching
        const matching = settled.filter((b) => {
          const sport = b.sport.toLowerCase();
          const betType = b.bet_type.toLowerCase();
          const betTypeSingular = betType.replace(/s$/, '');
          const combined = `${sport} ${betType}`;
          const combinedSingular = `${sport} ${betTypeSingular}`;
          return combined === normalized
            || combinedSingular === singular
            || sport === normalized || sport === singular
            || betType === normalized || betTypeSingular === singular
            || (normalized.includes(' ') && sport === normalized.split(' ')[0] && normalized.split(' ').slice(1).some(w => betType.includes(w) || betTypeSingular.includes(w.replace(/s$/, ''))));
        });

        let cost: number;
        if (matching.length > 0) {
          // Use actual bet data
          const totalLoss = matching.reduce((s, b) => s + Number(b.profit), 0);
          cost = Math.abs(totalLoss);
        } else if (leak.sample_size > 0 && avgStake > 0) {
          // Fallback for time-based or unmatched categories: estimate from roi_impact
          cost = Math.abs(leak.roi_impact / 100) * avgStake * leak.sample_size;
        } else {
          cost = 0;
        }

        if (cost > 0) {
          leakItems.push({ name: leak.category, type: 'leak', cost, fix: leak.suggestion, detail: leak.detail });
        }
      }
    });

    // De-duplicate: when a bias and leak overlap, keep the one with higher cost
    const usedBiasIndices = new Set<number>();
    const usedLeakIndices = new Set<number>();

    for (let bi = 0; bi < biasItems.length; bi++) {
      const biasLower = biasItems[bi].name.toLowerCase();
      for (let li = 0; li < leakItems.length; li++) {
        const leakLower = leakItems[li].name.toLowerCase();
        const overlaps = OVERLAP_KEYWORDS.some(([biasKws, leakKws]) =>
          biasKws.some(kw => biasLower.includes(kw)) && leakKws.some(kw => leakLower.includes(kw))
        );
        if (overlaps) {
          // Keep the higher cost, mark the other as used
          if (biasItems[bi].cost >= leakItems[li].cost) {
            usedLeakIndices.add(li);
          } else {
            usedBiasIndices.add(bi);
          }
        }
      }
    }

    biasItems.forEach((item, i) => { if (!usedBiasIndices.has(i)) items.push(item); });
    leakItems.forEach((item, i) => { if (!usedLeakIndices.has(i)) items.push(item); });

    items.sort((a, b) => b.cost - a.cost);
    return items;
  }, [biases_detected, strategic_leaks, bets]);

  const totalRecoverable = prioritizedLeaks.reduce((s, l) => s + l.cost, 0);

  const hasBets = bets.length > 0;

  const [activeTab, setActiveTab] = useState<'report' | 'tools'>('report');
  const hasToolsContent = whatIfs.length > 0 || prioritizedLeaks.length > 0;

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
      {hasToolsContent && !readOnly && (
        <div className="flex gap-1 bg-base p-1 rounded-sm w-fit">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'report'
                ? 'bg-surface-1 text-fg-bright shadow-sm'
                : 'text-fg-muted hover:text-fg-muted'
            }`}
          >
            Report
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'tools'
                ? 'bg-cyan-400/10 text-cyan-400 shadow-sm border border-cyan-400/20'
                : 'text-cyan-400/60 hover:text-cyan-400'
            }`}
          >
            Tools
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

      {/* ═══ CASE FILE HEADER — matching mockup ═══ */}
      <div className="flex justify-between items-start mb-7">
        <div>
          <p className="font-mono text-[10px] text-fg-dim tracking-[2px] mb-1.5">
            AUTOPSY REPORT #{reportId ? `BA-${reportId.slice(0, 4).toUpperCase()}` : 'BA-LIVE'}
            {analysis.dfs_mode && <span className="ml-2 text-purple-400">· {analysis.dfs_platform ?? 'DFS'}</span>}
          </p>
          <p className="font-mono text-[10px] text-fg-dim tracking-[1px]">
            {summary.date_range.toUpperCase()} · {summary.total_bets} {analysis.dfs_mode ? 'ENTRIES' : 'SPECIMENS'} ANALYZED
          </p>
        </div>
        {/* Stamp-style grade — tilted like the mockup */}
        <div className={`border-2 ${gradeColor(summary.overall_grade).replace('text-', 'border-')} px-4 py-1.5 -rotate-3`}>
          <p className={`font-mono text-[30px] font-bold leading-none ${gradeColor(summary.overall_grade)}`}>{summary.overall_grade}</p>
          <p className={`font-mono text-[8px] tracking-[2px] text-center ${gradeColor(summary.overall_grade)}`}>GRADE</p>
        </div>
      </div>

      {/* What this report analyzes — collapsible */}
      <details className="border border-border-subtle rounded-sm bg-surface-1/50 mb-5">
        <summary className="px-4 py-3 text-sm text-fg-muted cursor-pointer hover:text-fg flex items-center gap-2 font-mono text-[11px] tracking-wider">
          <span className="text-fg-dim">▸</span> ABOUT THIS REPORT
        </summary>
        <div className="px-4 pb-4 text-xs text-fg-muted leading-relaxed border-t border-border-subtle">
          Unlike a bet tracker that shows you numbers, BetAutopsy analyzes your betting <strong className="text-fg-bright">behavior</strong>: the psychological patterns, emotional responses, and cognitive biases that affect every bet you place.
        </div>
      </details>

      {/* Mixed data banner */}
      {mixedDataInfo && !readOnly && (
        <div className="card border-purple-500/20 bg-purple-500/5 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-fg-bright font-medium text-sm">This report includes both sportsbook bets and DFS pick&apos;em entries.</p>
              <p className="text-fg-muted text-xs mt-1">For more accurate behavioral analysis, run separate reports for each.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {mixedDataInfo.sportsBook && (
                <a href={`/reports?run=true&sportsbook=${encodeURIComponent(mixedDataInfo.sportsBook)}`} className="text-xs font-medium bg-base hover:bg-surface-1 text-fg-bright px-3 py-2 rounded-sm transition-colors">
                  Sportsbook Only
                </a>
              )}
              {mixedDataInfo.dfsBook && (
                <a href={`/reports?run=true&sportsbook=${encodeURIComponent(mixedDataInfo.dfsBook)}`} className="text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-2 rounded-sm transition-colors">
                  DFS Only
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subject Classification — Bet DNA (purple left border like mockup) */}
      {analysis.betting_archetype && (
        <div className="border border-border-subtle p-[18px] border-l-[3px] border-l-purple-500 mb-5">
          <p className="font-mono text-[9px] text-fg-dim tracking-[2px] mb-1">SUBJECT CLASSIFICATION</p>
          <h2 className="font-bold text-xl text-purple-400 mb-1">{analysis.betting_archetype.name}</h2>
          <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright"><p className="text-[12px] text-fg-muted leading-relaxed">{analysis.betting_archetype.description}</p></div>
        </div>
      )}

      {!readOnly && <ChapterNav tier={tier} readOnly={readOnly} onSharpClick={() => { setActiveTab('tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}

      {/* Share button at top of report */}
      {!readOnly && !isPartialReport && reportId && (
        <div className="flex justify-end mb-2">
          <ShareSection analysis={analysis} summary={summary} reportId={reportId} bets={bets} />
        </div>
      )}

      {/* ═══ CHAPTER 1: SUMMARY ═══ */}
      <section id="chapter-summary">
      <ChapterHeader number={1} title="Summary" subtitle="The executive briefing" />

      {/* ═══ VITALS STRIP — 4-col like mockup ═══ */}
      <div className="vitals-strip grid-cols-2 sm:grid-cols-4 mb-5">
        <div className="vitals-cell">
          <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">RECORD</span>
          <span className="font-mono text-lg font-bold text-fg-bright">{summary.record}</span>
        </div>
        <div className="vitals-cell">
          <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">NET P&amp;L</span>
          <span className={`font-mono text-lg font-bold ${summary.total_profit >= 0 ? 'text-win' : 'text-loss'}`}>
            {summary.total_profit >= 0 ? '+' : ''}{summary.total_profit < 0 ? '-' : ''}${Math.abs(summary.total_profit).toLocaleString(undefined, {maximumFractionDigits: 0})}
          </span>
        </div>
        <div className="vitals-cell">
          <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">ROI</span>
          <span className={`font-mono text-lg font-bold ${summary.roi_percent >= 0 ? 'text-win' : 'text-loss'}`}>
            {summary.roi_percent.toFixed(1)}%
          </span>
        </div>
        <div className="vitals-cell">
          <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">AVG STAKE</span>
          <span className="font-mono text-lg font-bold text-fg-bright">${summary.avg_stake.toFixed(0)}</span>
        </div>
      </div>

      {/* ═══ SCORES — side-by-side with gradient bars + needle ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.04] border border-border-subtle mb-6">
        <div className="bg-base p-[18px]">
          <div className="flex justify-between items-baseline mb-2.5">
            <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px]">EMOTION SCORE</span>
            <span className={`font-mono text-[22px] font-bold ${
              emotionScore <= 25 ? 'text-win' : emotionScore <= 50 ? 'text-caution' : emotionScore <= 75 ? 'text-orange-400' : 'text-loss'
            }`}>{emotionScore}</span>
          </div>
          <div className="h-1 bg-surface-2 relative">
            <div className="h-full" style={{ width: `${emotionScore}%`, background: 'linear-gradient(90deg, #00FFCB, #D29922, #E8453C)' }} />
            <div className="absolute -top-1 w-0.5 h-3 bg-fg-bright" style={{ left: `${emotionScore}%` }} />
          </div>
          <p className="font-mono text-xs text-fg mt-2">{emotionLabel(emotionScore).split('.')[0]}</p>
          {analysis.emotion_percentile && (
            <p className="font-mono text-[10px] text-scalpel mt-1">Lower than {analysis.emotion_percentile}% of bettors</p>
          )}
        </div>
        {analysis.discipline_score ? (
          <div className="bg-base p-[18px]">
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px]">DISCIPLINE</span>
              <span className={`font-mono text-[22px] font-bold ${
                analysis.discipline_score.total >= 71 ? 'text-win' : analysis.discipline_score.total >= 51 ? 'text-caution' : analysis.discipline_score.total >= 31 ? 'text-orange-400' : 'text-loss'
              }`}>{analysis.discipline_score.total}</span>
            </div>
            <div className="h-1 bg-surface-2 relative">
              <div className="h-full" style={{ width: `${analysis.discipline_score.total}%`, background: analysis.discipline_score.total >= 51 ? 'linear-gradient(90deg, #D29922, #00FFCB)' : 'linear-gradient(90deg, #E8453C, #D29922)' }} />
              <div className="absolute -top-1 w-0.5 h-3 bg-fg-bright" style={{ left: `${analysis.discipline_score.total}%` }} />
            </div>
            <p className="font-mono text-xs text-fg mt-2">Process consistency {analysis.discipline_score.total >= 51 ? 'moderate' : 'is low'}</p>
            {analysis.discipline_score.percentile && (
              <p className="font-mono text-[10px] text-scalpel mt-1">Better than {analysis.discipline_score.percentile}% of bettors</p>
            )}
          </div>
        ) : (
          <div className="bg-base p-[18px]">
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px]">OVERALL GRADE</span>
              <span className={`font-mono text-[22px] font-bold ${gradeColor(summary.overall_grade)}`}>{summary.overall_grade}</span>
            </div>
            <p className="font-mono text-[10px] text-fg-muted mt-2">Combines ROI, discipline, and emotional control</p>
          </div>
        )}
      </div>

      {/* ── BetIQ Score — Pro only ── */}
      {(tier === 'pro') && analysis.betiq && !analysis.betiq.insufficient_data && (
        <div className="case-card p-6">
          <div className="case-header mb-4">BETIQ: SKILL ASSESSMENT</div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-2">
            <span className="font-mono text-4xl font-bold text-fg-bright">{analysis.betiq.score}</span>
            <span className="font-mono text-sm text-fg-dim">/100</span>
            <span className="font-mono text-xs text-scalpel">better than {analysis.betiq.percentile}% of bettors</span>
          </div>
          <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright mb-6"><p className="text-fg-muted text-sm leading-relaxed">{analysis.betiq.interpretation}</p></div>
          <div className="vitals-strip grid-cols-2 md:grid-cols-3">
            {[
              { label: 'Line value', hint: 'Are you getting good odds and avoiding heavy juice?', val: analysis.betiq.components.line_value, max: 25 },
              { label: 'Calibration', hint: 'Does your win rate match the implied probability of your bets?', val: analysis.betiq.components.calibration, max: 20 },
              { label: 'Sophistication', hint: 'Straight bets vs parlays. Higher means less parlay exposure', val: analysis.betiq.components.sophistication, max: 15 },
              { label: 'Specialization', hint: 'Do you have a focused edge in 1-2 sports or bet types?', val: analysis.betiq.components.specialization, max: 15 },
              { label: 'Timing', hint: 'Are you avoiding bad time windows like late-night betting?', val: analysis.betiq.components.timing, max: 10 },
              { label: 'Sample size', hint: 'More bets = more reliable analysis', val: analysis.betiq.components.confidence, max: 15 },
            ].map(c => (
              <div key={c.label} className="vitals-cell">
                <div className="data-label mb-0.5">{c.label}</div>
                <div className="text-[9px] text-fg-dim leading-tight mb-1">{c.hint}</div>
                <div className="font-mono text-lg font-bold text-fg-bright">{c.val}<span className="text-fg-dim text-xs">/{c.max}</span></div>
                <div className="h-1 mt-2 bg-surface-2 overflow-hidden">
                  <div className="h-full bg-scalpel/40" style={{ width: `${(c.val / c.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(tier === 'pro') && analysis.betiq && analysis.betiq.insufficient_data && (
        <div className="case-card p-6">
          <div className="case-header mb-3">BETIQ: SKILL ASSESSMENT</div>
          <p className="text-fg-dim text-sm font-mono">{analysis.betiq.interpretation}</p>
        </div>
      )}

      {/* BetIQ — free tier teaser */}
      {tier === 'free' && analysis.betiq && (
        <div className="case-card p-6 relative overflow-hidden">
          <div className="case-header mb-2">BETIQ: SKILL ASSESSMENT</div>
          <div className="blur-sm pointer-events-none">
            <div className="font-mono text-4xl font-bold text-fg-bright">{analysis.betiq.score}/100</div>
            <div className="vitals-strip grid-cols-3 mt-4">
              <div className="vitals-cell"><div className="h-4 bg-surface-2 rounded-sm" /></div>
              <div className="vitals-cell"><div className="h-4 bg-surface-2 rounded-sm" /></div>
              <div className="vitals-cell"><div className="h-4 bg-surface-2 rounded-sm" /></div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-1"><Lock size={20} className="text-fg-muted" /></div>
              <p className="text-fg-muted text-sm font-mono">Upgrade to Pro to unlock BetIQ</p>
            </div>
          </div>
        </div>
      )}

      {/* vs. Last Report */}
      {previousSnapshot && (
        <div className="card p-6">
          <h2 className="font-semibold text-lg mb-3">
            vs. Last Report <span className="text-fg-muted text-sm font-normal">({new Date(previousSnapshot.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
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
                  <p className="text-fg-muted text-xs mb-0.5">{item.label}</p>
                  <p className={`font-mono text-sm font-medium ${same ? 'text-fg-muted' : improved ? 'text-win' : 'text-loss'}`}>
                    {fromStr} → {toStr}
                  </p>
                  {!same && <p className={`text-xs ${improved ? 'text-win' : 'text-loss'}`}>{improved ? 'improved' : 'regressed'}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bankroll Health Warning */}
      {analysis.bankroll_health !== 'healthy' && (
        <div
          className={`rounded-sm p-5 border ${
            analysis.bankroll_health === 'danger'
              ? 'bg-loss/5 border-loss/30'
              : 'bg-caution/5 border-caution/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className={analysis.bankroll_health === 'danger' ? 'text-loss' : 'text-caution'} />
            <div>
              <h3 className={`font-medium ${
                analysis.bankroll_health === 'danger' ? 'text-loss' : 'text-caution'
              }`}>
                Bankroll Health: {analysis.bankroll_health === 'danger' ? 'At Risk' : 'Monitor'}
              </h3>
              <p className="text-fg-muted text-sm mt-1">
                {analysis.bankroll_health === 'danger'
                  ? 'Your stake sizing relative to your bankroll is aggressive. Consider setting hard limits on max bet size to protect your long-term position.'
                  : 'Your bankroll trajectory could use some adjustments. The recommendations below can help stabilize it.'}
              </p>
              {analysis.bankroll_health === 'danger' && (
                <p className="text-fg-dim text-xs mt-3">
                  If you feel your gambling is out of control, call <span className="text-fg-bright">1-800-GAMBLER</span> or visit <span className="text-fg-bright">ncpgambling.org</span> for self-exclusion resources.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!isPartialReport && totalRecoverable > 0 && (
        <div
          className="border border-border-subtle p-4 border-l-[3px] border-l-bleed cursor-pointer hover:bg-white/[0.01] transition-colors"
          onClick={() => {
            const el = document.getElementById('chapter-cost');
            if (el) {
              const top = el.getBoundingClientRect().top + window.scrollY - 60;
              window.scrollTo({ top, behavior: 'smooth' });
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] text-fg-dim tracking-[2px] mb-1">TOTAL RECOVERABLE</p>
              <p className="font-mono text-2xl font-bold text-bleed">{'$'}{Math.round(totalRecoverable).toLocaleString()}</p>
              <p className="text-[11px] text-fg-dim mt-1">Estimated money left on the table from all detected leaks and biases. Some leaks may overlap.</p>
            </div>
            <span className="font-mono text-[10px] text-fg-dim">See details →</span>
          </div>
        </div>
      )}

      </section>

      {/* ═══ SNAPSHOT PAYWALL: wraps Chapters 2-5 for free snapshot reports ═══ */}
      {snapshotLocked ? (
        <SnapshotPaywall reportId={reportId} isPro={tier === 'pro'} counts={analysis._snapshot_counts}>
          <div className="space-y-8">
            <section id="chapter-findings">
              <ChapterHeader number={2} title="Findings" subtitle="What we found in your betting data" />
              <div className="card p-6 space-y-4">
                <p className="text-fg-muted text-sm">Detailed bias analysis with dollar costs, strategic leak detection, and behavioral pattern mapping.</p>
              </div>
            </section>
            <section id="chapter-data">
              <ChapterHeader number={3} title="Your Data" subtitle="Charts and evidence supporting the diagnosis" />
              <div className="card p-6 space-y-4">
                <p className="text-fg-muted text-sm">P&L curves, stake distribution, timing patterns, odds intelligence, and category breakdowns.</p>
              </div>
            </section>
            <section id="chapter-cost">
              <ChapterHeader number={4} title="What It Costs" subtitle="The dollar impact of your behavioral leaks" />
              <div className="card p-6 space-y-4">
                <p className="text-fg-muted text-sm">Leak Prioritizer ranked by dollar impact and What-If Simulator showing recoverable profit.</p>
              </div>
            </section>
            <section id="chapter-protocol">
              <ChapterHeader number={5} title="Protocol" subtitle="Your personalized action plan" />
              <div className="card p-6 space-y-4">
                <p className="text-fg-muted text-sm">Prescribed protocols, personal rules, and session-by-session grading.</p>
              </div>
            </section>
          </div>
        </SnapshotPaywall>
      ) : (
      <>

      {/* ═══ CHAPTER 2: FINDINGS ═══ */}
      <section id="chapter-findings">
      <ChapterHeader number={2} title="Findings" subtitle="Behavioral analysis and pattern detection" />

      {/* FINDINGS — matching mockup exactly */}
      {biases_detected.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] text-fg-dim tracking-[3px] mb-2.5">FINDINGS</p>
          <div className="grid gap-2">
            {biases_detected.map((bias, i) => {
              const sevColor = bias.severity === 'critical' || bias.severity === 'high' ? 'bleed' : bias.severity === 'medium' ? 'caution' : 'win';
              return (
              <div key={i} className={`border border-border-subtle p-[18px] border-l-[3px] ${sevColor === 'bleed' ? 'border-l-bleed' : sevColor === 'caution' ? 'border-l-caution' : 'border-l-win'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono text-[10px] tracking-[1px] px-2 py-0.5 border ${sevColor === 'bleed' ? 'text-bleed border-bleed/30' : sevColor === 'caution' ? 'text-caution border-caution/30' : 'text-win border-win/30'}`}>FINDING-{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[14px] font-semibold text-fg-bright">{bias.bias_name}</span>
                  </div>
                  <span className={`font-mono text-[9px] tracking-[1px] font-bold px-2 py-0.5 ${sevColor === 'bleed' ? 'bg-bleed text-base' : sevColor === 'caution' ? 'bg-caution text-base' : 'bg-win text-base'}`}>{bias.severity.toUpperCase()}</span>
                </div>
                {!bias.description ? (
                  <div className="flex items-center gap-2 text-fg-muted text-sm py-2">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-fg-muted border-t-scalpel rounded-full animate-spin" />
                    Generating analysis for this bias...
                  </div>
                ) : (
                  <>
                    <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright mb-2.5"><p className="text-[12px] text-fg-muted leading-relaxed">{bias.description}</p></div>
                    {bias.fix && (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright mb-2.5"><p className="text-[11px] text-fg-dim"><span className="text-scalpel font-mono">RX:</span> {bias.fix}</p></div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className={`font-mono text-[12px] font-semibold ${sevColor === 'bleed' ? 'text-bleed' : sevColor === 'caution' ? 'text-caution' : 'text-win'}`}>
                        est. cost: -${Math.abs(bias.estimated_cost).toLocaleString()}/qtr
                      </span>
                    </div>
                  </>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sport-Specific Findings — Pro only ── */}
      {(tier === 'pro') && analysis.sport_specific_findings && analysis.sport_specific_findings.length > 0 && (
        <div className="space-y-3">
          <div className="case-header mb-2">SPORT-SPECIFIC FINDINGS</div>
          {analysis.sport_specific_findings.map((finding) => (
            <div key={finding.id} className={`finding-card ${finding.severity === 'high' ? 'border-l-bleed' : finding.severity === 'medium' ? 'border-l-caution' : 'border-l-scalpel'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`evidence-tag ${finding.severity === 'high' ? 'text-bleed border-bleed/30' : finding.severity === 'medium' ? 'text-caution border-caution/30' : 'text-scalpel border-scalpel/30'}`}>{finding.id}</span>
                  <span className="font-semibold text-sm text-fg-bright">{finding.name}</span>
                </div>
                <span className={`font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm font-bold ${finding.severity === 'high' ? 'bg-bleed text-base' : finding.severity === 'medium' ? 'bg-caution text-base' : 'bg-scalpel text-base'}`}>{finding.severity}</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright mb-2"><p className="text-fg-muted text-sm leading-relaxed">{finding.description}</p></div>
              <p className="text-fg-dim text-xs mb-2 font-mono">{finding.evidence}</p>
              <div className="flex items-center justify-between">
                {finding.estimated_cost !== null && (
                  <span className="font-mono text-sm font-semibold text-loss">est. cost: ${Math.abs(finding.estimated_cost).toLocaleString()}</span>
                )}
                <span className="text-scalpel text-xs font-mono ml-auto">{finding.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strategic Leaks */}
      {isPartialReport && <SkeletonSection label="Mapping strategic leaks by dollar impact..." />}
      {!isPartialReport && strategic_leaks.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl tracking-tight">Strategic Leaks</h2>
          <p className="text-fg-dim text-xs italic -mt-2">Categories where your ROI doesn&apos;t justify your volume. You&apos;re betting here but the numbers say you shouldn&apos;t be.</p>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left text-fg-muted font-medium px-4 py-3">Category</th>
                    <th className="text-left text-fg-muted font-medium px-4 py-3">Issue</th>
                    <th className="text-right text-fg-muted font-medium px-4 py-3">ROI</th>
                    <th className="text-right text-fg-muted font-medium px-4 py-3 hidden sm:table-cell">Sample</th>
                    <th className="text-left text-fg-muted font-medium px-4 py-3 hidden md:table-cell">Suggestion</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {strategic_leaks.map((leak, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="px-4 py-3 font-medium">{formatCategoryLabel(leak.category)}</td>
                      <td className="px-4 py-3 text-fg-muted">{leak.detail}</td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${leak.roi_impact >= 0 ? 'text-win' : 'text-loss'}`}>
                        {leak.roi_impact >= 0 ? '+' : ''}{leak.roi_impact.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-fg-muted hidden sm:table-cell">{leak.sample_size}</td>
                      <td className="px-4 py-3 text-fg-muted hidden md:table-cell">{leak.suggestion}</td>
                      <td className="px-4 py-3">
                        <Link href={leakToQuery(leak.category)} className="text-xs text-scalpel hover:underline whitespace-nowrap">
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

      {/* Emotion Score */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-xl">Emotion Score <span className="text-fg-dim text-xs font-normal">(how much emotions drive your bets)</span></h2>
          <span className={`font-mono text-2xl font-bold ${
            emotionScore <= 25 ? 'text-win' :
            emotionScore <= 50 ? 'text-caution' :
            emotionScore <= 75 ? 'text-orange-400' : 'text-loss'
          }`}>
            {emotionScore}/100
          </span>
        </div>
        <div className="w-full h-3 bg-base rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${emotionColor(emotionScore)}`}
            style={{ width: `${emotionScore}%` }}
          />
        </div>
        <p className="text-fg-muted text-sm mb-2">{emotionLabel(emotionScore)}</p>
        <p className="text-fg-dim text-xs mb-3 italic">
          Measures how much emotions drive your betting decisions: chasing losses, erratic bet sizing, and heated betting. Lower is better. Calculated from four behavioral signals in your bet history, adjusted for odds and timing.
        </p>
        {emotionBreakdown && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border-subtle">
            {([
              { label: 'Bet Sizing Consistency', key: 'stake_volatility' as const, hint: 'How much your bet sizes vary after accounting for odds differences' },
              { label: 'Reaction to Losses', key: 'loss_chasing' as const, hint: 'Whether your stakes increase after losing bets compared to after wins' },
              { label: 'During Losing Streaks', key: 'streak_behavior' as const, hint: 'How your betting speed and sizing change during consecutive losses' },
              { label: 'Knowing When to Stop', key: 'session_discipline' as const, hint: 'Whether you tend to over-bet in long sessions or chase back losses late at night' },
            ]).map(({ label, key, hint }) => {
              const val = emotionBreakdown![key];
              return (
                <div key={key}>
                  <p className="text-fg-dim text-xs mb-1" title={hint}>{label}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-base rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          val <= 5 ? 'bg-win' : val <= 12 ? 'bg-caution' : val <= 18 ? 'bg-orange-400' : 'bg-loss'
                        }`}
                        style={{ width: `${(val / 25) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-fg-muted">{val}/25</span>
                  </div>
                  <p className="text-fg-muted text-[10px] mt-0.5 leading-tight">{hint}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Emotional Triggers — Pro only ── */}
      {(tier === 'pro') && analysis.enhanced_tilt && (
        <div className="case-card p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="case-header">EMOTIONAL TRIGGER BREAKDOWN</div>
              <p className="text-fg-dim text-xs mt-1">Six signals that reveal when emotions are driving your bets instead of strategy</p>
            </div>
            <span className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-sm font-bold ${
              analysis.enhanced_tilt.risk_level === 'critical' ? 'bg-bleed text-base' :
              analysis.enhanced_tilt.risk_level === 'high' ? 'bg-bleed/80 text-base' :
              analysis.enhanced_tilt.risk_level === 'elevated' ? 'bg-caution text-base' :
              analysis.enhanced_tilt.risk_level === 'moderate' ? 'bg-caution/60 text-base' :
              'bg-scalpel text-base'
            }`}>
              {analysis.enhanced_tilt.risk_level} risk
            </span>
          </div>
          <div className="finding-card border-l-caution mb-4 !p-3">
            <p className="text-fg-muted text-sm">{analysis.enhanced_tilt.worst_trigger}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Bet size swings', hint: 'How much your stakes vary. Higher means more erratic sizing', value: analysis.enhanced_tilt.signals.bet_sizing_volatility, max: 25 },
              { label: 'Reaction to losses', hint: 'Whether your stakes increase after you lose', value: analysis.enhanced_tilt.signals.loss_reaction, max: 25 },
              { label: 'Losing streak behavior', hint: 'How your betting changes during consecutive losses', value: analysis.enhanced_tilt.signals.streak_behavior, max: 25 },
              { label: 'Knowing when to stop', hint: 'Whether you bet longer in losing sessions vs winning ones', value: analysis.enhanced_tilt.signals.session_discipline, max: 25 },
              { label: 'Speeding up mid-session', hint: 'Whether you place bets faster as a session goes on', value: analysis.enhanced_tilt.signals.session_acceleration, max: 25 },
              { label: 'Chasing bigger payouts', hint: 'Whether you shift to longer odds after losing, reaching for a recovery', value: analysis.enhanced_tilt.signals.odds_drift_after_loss, max: 25 },
            ].map(signal => (
              <div key={signal.label} className="bg-surface-2 p-3 border border-border-subtle rounded-sm">
                <div className="mb-1.5">
                  <span className="text-[11px] text-fg-muted block">{signal.label}</span>
                  <span className="text-[9px] text-fg-dim block leading-tight mt-0.5">{signal.hint}</span>
                </div>
                <div className="font-mono text-sm font-bold text-fg-bright">{signal.value}<span className="text-fg-dim text-xs">/{signal.max}</span></div>
                <div className="h-1 mt-1.5 bg-base overflow-hidden">
                  <div className="h-full" style={{ width: `${(signal.value / signal.max) * 100}%`, backgroundColor: signal.value / signal.max >= 0.7 ? '#F85149' : signal.value / signal.max >= 0.4 ? '#D29922' : '#00FFCB' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Behavioral Patterns */}
      {isPartialReport && <SkeletonSection label="Scanning for cognitive biases and emotional patterns..." />}
      {!isPartialReport && behavioral_patterns.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl tracking-tight">Behavioral Patterns</h2>
          <p className="text-fg-dim text-xs italic -mt-2">Recurring habits we found in your betting. Some help you, some hurt you.</p>
          <div className="grid gap-3">
            {behavioral_patterns.map((pat, i) => (
              <div key={i} className="card p-5 flex gap-4">
                <span className="mt-0.5 shrink-0">
                  {pat.impact === 'positive' ? <CheckCircle2 size={16} className="text-win" /> : pat.impact === 'negative' ? <XCircle size={16} className="text-loss" /> : <Minus size={16} className="text-fg-dim" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{pat.pattern_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      pat.impact === 'positive' ? 'bg-win/10 text-win'
                        : pat.impact === 'negative' ? 'bg-loss/10 text-loss'
                        : 'bg-fg-dim/50 text-fg-muted'
                    }`}>
                      {pat.impact}
                    </span>
                  </div>
                  <p className="text-fg-bright text-sm">{pat.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-fg-muted">
                    <span>Frequency: <span className="font-mono">{pat.frequency}</span></span>
                    <span>Evidence: <span className="font-mono">{pat.data_points}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </section>

      {/* ═══ CHAPTER 3: YOUR DATA ═══ */}
      <section id="chapter-data">
      <ChapterHeader number={3} title="Your Data" subtitle="Charts and evidence supporting the diagnosis" />

      {/* P&L Over Time Chart */}
      {hasBets && pnlData.length > 1 && (
        <div className="card p-6">
          <h2 className="font-semibold text-xl mb-1">
            <span className="font-mono text-[9px] text-fg-dim tracking-[3px] mr-3">EXHIBIT</span>
            Profit/Loss Over Time
          </h2>
          <p className="text-fg-dim text-xs italic mb-3">Track momentum shifts and identify when behavioral patterns impact results.</p>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#51596820" />
                <XAxis dataKey="date" tick={{ fill: '#848D9A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#51596830' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#848D9A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#51596830' }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="#51596850" />
                <Line type="monotone" dataKey="pnl" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stake Size Timeline */}
      {hasBets && stakeData.length > 1 && (
        <div className="card p-6">
          <h2 className="font-semibold text-xl mb-1">
            <span className="font-mono text-[9px] text-fg-dim tracking-[3px] mr-3">EXHIBIT</span>
            Stake Size Timeline
          </h2>
          <p className="text-fg-dim text-xs italic mb-1">How much you wagered on each bet over time. Spikes after losses can signal emotional betting.</p>
          <p className="text-fg-muted text-xs mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-[#5f594f] mr-1 align-middle" /> Normal
            <span className="inline-block w-2 h-2 rounded-full bg-[#f97316] mr-1 ml-3 align-middle" /> Within 1hr of a loss
          </p>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#51596820" />
                <XAxis dataKey="date" tick={{ fill: '#848D9A', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#51596830' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#848D9A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#51596830' }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="stake" radius={[2, 2, 0, 0]}>
                  {stakeData.map((entry, i) => (
                    <Cell key={i} fill={entry.afterLoss ? '#f97316' : '#515968'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ROI by Category Chart */}
      {hasBets && roiData.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-xl mb-1">ROI by Category</h2>
          <p className="text-fg-dim text-xs italic mb-3">See where your edge lives and where it doesn&apos;t.</p>
          <div style={{ height: Math.max(200, roiData.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#51596820" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#848D9A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#51596830' }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis type="category" dataKey="category" tick={{ fill: '#F0F2F5', fontSize: 12 }} tickLine={false} axisLine={false} width={55} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { category: string; roi: number; count: number };
                    return (
                      <div className="bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-xs shadow-lg">
                        <p className="text-fg-bright font-medium">{d.category}</p>
                        <p className={`font-mono ${d.roi >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.roi}% ROI</p>
                        <p className="text-fg-muted">{d.count} bets</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={0} stroke="#51596850" />
                <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                  {roiData.map((entry, i) => (
                    <Cell key={i} fill={entry.roi >= 0 ? '#00FFCB' : '#f87171'} fillOpacity={0.7} />
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
          <h2 className="font-bold text-2xl tracking-tight">Timing Patterns</h2>
          <p className="text-fg-dim text-xs italic -mt-2">Your performance broken down by when you place bets. Reveals hidden patterns in your schedule.</p>

          {/* Day of Week Chart */}
          <div className="card p-6">
            <h3 className="font-medium text-lg mb-4">ROI by Day of Week</h3>
            <div style={{ height: Math.max(200, analysis.timing_analysis.by_day.filter((d) => d.bets > 0).length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.timing_analysis.by_day.filter((d) => d.bets > 0)} layout="vertical" margin={{ left: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#51596820" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#848D9A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#51596830' }} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="label" tick={{ fill: '#F0F2F5', fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as TimingBucket;
                      return (
                        <div className="bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-xs shadow-lg">
                          <p className="text-fg-bright font-medium">{d.label}</p>
                          <p className={`font-mono ${d.roi >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.roi.toFixed(1)}% ROI</p>
                          <p className="text-fg-muted">{d.bets} bets · {d.win_rate.toFixed(0)}% win rate</p>
                          <p className={`font-mono text-xs ${d.profit >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.profit >= 0 ? '+' : ''}${d.profit.toFixed(0)}</p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={0} stroke="#51596850" />
                  <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                    {analysis.timing_analysis.by_day.filter((d) => d.bets > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.roi >= 0 ? '#00FFCB' : '#f87171'} fillOpacity={0.7} />
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
              <p className="text-fg-dim text-xs italic mb-4">Color intensity shows ROI. Size shows bet volume. Grey = no bets in that window.</p>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
                {analysis.timing_analysis.by_hour.map((h, i) => {
                  const hasBets = h.bets > 0;
                  const intensity = hasBets ? Math.min(1, h.bets / Math.max(...analysis.timing_analysis!.by_hour.map((x) => x.bets || 1))) : 0;
                  const bgColor = !hasBets
                    ? 'bg-base/50'
                    : h.roi >= 10 ? 'bg-[#00FFCB]'
                    : h.roi >= 0 ? 'bg-[#00FFCB]'
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
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-1 border border-border-subtle rounded-sm px-2.5 py-1.5 text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          <p className="text-fg-bright font-medium">{h.label}</p>
                          <p className={`font-mono ${h.roi >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{h.roi.toFixed(1)}% ROI</p>
                          <p className="text-fg-muted">{h.bets} bets · {h.win_rate.toFixed(0)}% WR</p>
                          <p className={`font-mono ${h.profit >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{h.profit >= 0 ? '+' : ''}${h.profit.toFixed(0)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-fg-muted">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#00FFCB] opacity-60" />
                  <span>Profitable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#f87171] opacity-60" />
                  <span>Unprofitable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-base/50 opacity-50" />
                  <span>No bets</span>
                </div>
              </div>
            </div>
          )}

          {/* Best / Worst / Late Night callouts */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysis.timing_analysis.best_window && (
              <div className="card border-win/20 bg-win/5 p-5">
                <p className="text-fg-muted text-xs mb-1">Best Window</p>
                <p className="font-bold text-xl text-win">{analysis.timing_analysis.best_window.label}</p>
                <p className="font-mono text-win text-sm">+{analysis.timing_analysis.best_window.roi.toFixed(1)}% ROI</p>
                <p className="text-fg-muted text-xs mt-1 font-mono">{analysis.timing_analysis.best_window.count} bets</p>
              </div>
            )}
            {analysis.timing_analysis.worst_window && (
              <div className="card border-loss/20 bg-loss/5 p-5">
                <p className="text-fg-muted text-xs mb-1">Worst Window</p>
                <p className="font-bold text-xl text-loss">{analysis.timing_analysis.worst_window.label}</p>
                <p className="font-mono text-loss text-sm">{analysis.timing_analysis.worst_window.roi.toFixed(1)}% ROI</p>
                <p className="text-fg-muted text-xs mt-1 font-mono">{analysis.timing_analysis.worst_window.count} bets</p>
              </div>
            )}
            {analysis.timing_analysis.late_night_stats && (
              <div className={`card p-5 ${analysis.timing_analysis.late_night_stats.roi < 0 ? 'border-orange-400/20 bg-orange-400/5' : 'border-border-subtle'}`}>
                <p className="text-fg-muted text-xs mb-1">Late Night (11pm–4am)</p>
                <p className="font-mono font-bold text-xl text-fg-bright">{analysis.timing_analysis.late_night_stats.count} bets</p>
                <p className={`font-mono text-sm ${analysis.timing_analysis.late_night_stats.roi >= 0 ? 'text-win' : 'text-orange-400'}`}>
                  {analysis.timing_analysis.late_night_stats.roi.toFixed(1)}% ROI
                </p>
                <p className="text-fg-muted text-xs mt-1 font-mono">{analysis.timing_analysis.late_night_stats.pct_of_total.toFixed(0)}% of all bets</p>
              </div>
            )}
          </div>

          {/* No time data notice */}
          {!analysis.timing_analysis.has_time_data && (
            <div className="card p-4 border-caution/20 bg-caution/5">
              <p className="text-caution text-sm font-medium mb-1">Limited time data</p>
              <p className="text-fg-muted text-xs">
                Your CSV only included dates, not timestamps. Day-of-week analysis is available above, but hour-of-day patterns require time data.
                For full timing insights, use a tracker like Pikkit that exports <span className="text-fg-bright">time_placed_iso</span> with each bet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Odds Intelligence */}
      {analysis.odds_analysis && analysis.odds_analysis.buckets.some((b) => b.bets > 0) && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl tracking-tight">Odds Intelligence</h2>
          <p className="text-fg-dim text-xs italic -mt-2">How you perform at different price points, and whether you&apos;re finding real value or just getting lucky.</p>

          {/* Odds Bucket Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left text-fg-muted font-medium px-4 py-3">Odds Range</th>
                    <th className="text-right text-fg-muted font-medium px-4 py-3">Bets</th>
                    <th className="text-right text-fg-muted font-medium px-4 py-3">Win Rate</th>
                    <th className="text-right text-fg-muted font-medium px-4 py-3 hidden sm:table-cell">Implied</th>
                    <th className="text-right text-fg-muted font-medium px-4 py-3" title="Your win rate minus what the odds predict. Positive means you're beating the line">Edge vs Odds</th>
                    <th className="text-right text-fg-muted font-medium px-4 py-3">ROI</th>
                    <th className="text-right text-fg-muted font-medium px-4 py-3 hidden md:table-cell">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.odds_analysis.buckets.filter((b) => b.bets > 0).map((bucket, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="px-4 py-3">
                        <span className="font-medium">{bucket.label}</span>
                        <span className="text-fg-dim text-xs ml-1.5 hidden sm:inline">({bucket.range})</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-fg-muted">{bucket.bets}</td>
                      <td className="px-4 py-3 text-right font-mono">{bucket.win_rate.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right font-mono text-fg-muted hidden sm:table-cell">{bucket.implied_prob.toFixed(0)}%</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${bucket.edge > 2 ? 'text-win' : bucket.edge < -2 ? 'text-loss' : 'text-fg-muted'}`}>
                        {bucket.edge >= 0 ? '+' : ''}{bucket.edge.toFixed(1)}pp
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${bucket.roi >= 0 ? 'text-win' : 'text-loss'}`}>
                        {bucket.roi >= 0 ? '+' : ''}{bucket.roi.toFixed(1)}%
                      </td>
                      <td className={`px-4 py-3 text-right font-mono hidden md:table-cell ${bucket.profit >= 0 ? 'text-win' : 'text-loss'}`}>
                        {bucket.profit >= 0 ? '+' : ''}${bucket.profit.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-border-subtle bg-base/30">
              <p className="text-fg-dim text-xs">
                <span className="text-fg-muted">Edge</span> = your actual win rate minus the implied probability from the odds. Positive edge means you&apos;re beating the line at that price point.
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#51596820" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#848D9A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#51596830' }} tickFormatter={(v: number) => `${v}pp`} />
                    <YAxis type="category" dataKey="label" tick={{ fill: '#F0F2F5', fontSize: 12 }} tickLine={false} axisLine={false} width={85} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as OddsBucket;
                        return (
                          <div className="bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-xs shadow-lg">
                            <p className="text-fg-bright font-medium">{d.label}</p>
                            <p className={`font-mono ${d.edge >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{d.edge >= 0 ? '+' : ''}{d.edge.toFixed(1)}pp edge</p>
                            <p className="text-fg-muted">{d.win_rate.toFixed(0)}% actual vs {d.implied_prob.toFixed(0)}% implied</p>
                            <p className="text-fg-muted">{d.bets} bets · {d.roi.toFixed(1)}% ROI</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0} stroke="#51596850" />
                    <Bar dataKey="edge" radius={[0, 4, 4, 0]}>
                      {analysis.odds_analysis.buckets.filter((b) => b.bets >= 3).map((entry, i) => (
                        <Cell key={i} fill={entry.edge >= 0 ? '#00FFCB' : '#f87171'} fillOpacity={0.7} />
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
              analysis.odds_analysis.luck_rating > 1 ? 'border-caution/20 bg-caution/5' :
              analysis.odds_analysis.luck_rating < -1 ? 'border-cyan-400/20 bg-cyan-400/5' :
              'border-border-subtle'
            }`}>
              <p className="text-fg-muted text-xs mb-1">Luck vs Skill</p>
              <p className={`font-bold text-xl ${
                analysis.odds_analysis.luck_rating > 1 ? 'text-caution' :
                analysis.odds_analysis.luck_rating < -1 ? 'text-cyan-400' :
                'text-fg-bright'
              }`}>
                {analysis.odds_analysis.luck_label}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-fg-muted">Expected wins</span>
                  <span className="font-mono text-fg-muted">{analysis.odds_analysis.expected_wins.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-fg-muted">Actual wins</span>
                  <span className="font-mono text-fg-bright">{analysis.odds_analysis.actual_wins}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-border-subtle pt-1">
                  <span className="text-fg-muted">Difference</span>
                  <span className={`font-mono font-semibold ${analysis.odds_analysis.luck_rating >= 0 ? 'text-caution' : 'text-cyan-400'}`}>
                    {analysis.odds_analysis.luck_rating >= 0 ? '+' : ''}{analysis.odds_analysis.luck_rating.toFixed(1)} wins
                  </span>
                </div>
              </div>
              <p className="text-fg-dim text-[10px] mt-2 italic">
                {analysis.odds_analysis.luck_rating > 1
                  ? 'You\'re winning more than the odds predict. Could be skill, could be variance. More bets will tell.'
                  : analysis.odds_analysis.luck_rating < -1
                  ? 'You\'re winning less than expected. Could be bad luck, or the lines you\'re taking aren\'t as good as they look.'
                  : 'Your results are tracking close to what the odds predict. Solid baseline.'}
              </p>
            </div>

            {/* Best Bucket */}
            {analysis.odds_analysis.best_bucket && (
              <div className="card border-win/20 bg-win/5 p-5">
                <p className="text-fg-muted text-xs mb-1">Best Odds Range</p>
                <p className="font-bold text-xl text-win">{analysis.odds_analysis.best_bucket.label}</p>
                <p className="font-mono text-win text-sm">+{analysis.odds_analysis.best_bucket.edge.toFixed(1)}pp edge</p>
                <p className="text-fg-muted text-xs mt-1 font-mono">{analysis.odds_analysis.best_bucket.count} bets</p>
                <p className="text-fg-dim text-[10px] mt-2 italic">You consistently beat the implied odds here.</p>
              </div>
            )}

            {/* Worst Bucket */}
            {analysis.odds_analysis.worst_bucket && (
              <div className="card border-loss/20 bg-loss/5 p-5">
                <p className="text-fg-muted text-xs mb-1">Worst Odds Range</p>
                <p className="font-bold text-xl text-loss">{analysis.odds_analysis.worst_bucket.label}</p>
                <p className="font-mono text-loss text-sm">{analysis.odds_analysis.worst_bucket.edge.toFixed(1)}pp edge</p>
                <p className="text-fg-muted text-xs mt-1 font-mono">{analysis.odds_analysis.worst_bucket.count} bets</p>
                <p className="text-fg-dim text-[10px] mt-2 italic">The odds are beating you at this price point.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DFS Pick Count Distribution */}
      {analysis.dfs_mode && analysis.dfs_metrics && analysis.dfs_metrics.pickCountDistribution.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-xl">Performance by Pick Count</h2>
            <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">DFS</span>
          </div>
          <p className="text-fg-dim text-xs italic mb-4">Fewer picks = higher win rate. Where&apos;s your sweet spot?</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-fg-muted font-medium px-3 py-2">Picks</th>
                  <th className="text-right text-fg-muted font-medium px-3 py-2">Entries</th>
                  <th className="text-right text-fg-muted font-medium px-3 py-2">Win Rate</th>
                  <th className="text-right text-fg-muted font-medium px-3 py-2">ROI</th>
                  <th className="text-right text-fg-muted font-medium px-3 py-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {analysis.dfs_metrics.pickCountDistribution.map((d) => (
                  <tr key={d.picks} className="border-b border-border-subtle">
                    <td className="px-3 py-2 font-medium">{d.picks}-pick</td>
                    <td className="px-3 py-2 text-right font-mono text-fg-muted">{d.count}</td>
                    <td className="px-3 py-2 text-right font-mono">{d.winRate}%</td>
                    <td className={`px-3 py-2 text-right font-mono font-medium ${d.roi >= 0 ? 'text-win' : 'text-loss'}`}>
                      {d.roi >= 0 ? '+' : ''}{d.roi}%
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${d.profit >= 0 ? 'text-win' : 'text-loss'}`}>
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
          <h2 className="font-semibold text-xl mb-1">Power Play vs Flex Play</h2>
          <p className="text-fg-dim text-xs italic mb-4">Power is all-or-nothing. Flex pays partial. Which is actually working?</p>
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-sm p-4 ${analysis.dfs_metrics.powerVsFlex.powerROI >= analysis.dfs_metrics.powerVsFlex.flexROI ? 'bg-win/5 border border-win/20' : 'bg-loss/5 border border-loss/20'}`}>
              <p className="text-fg-muted text-xs uppercase tracking-wider mb-2">Power Play</p>
              <p className="font-mono text-2xl font-bold">{analysis.dfs_metrics.powerVsFlex.powerCount}</p>
              <p className="text-fg-muted text-xs">entries</p>
              <p className={`font-mono text-lg font-medium mt-2 ${analysis.dfs_metrics.powerVsFlex.powerROI >= 0 ? 'text-win' : 'text-loss'}`}>
                {analysis.dfs_metrics.powerVsFlex.powerROI >= 0 ? '+' : ''}{analysis.dfs_metrics.powerVsFlex.powerROI}% ROI
              </p>
            </div>
            <div className={`rounded-sm p-4 ${analysis.dfs_metrics.powerVsFlex.flexROI >= analysis.dfs_metrics.powerVsFlex.powerROI ? 'bg-win/5 border border-win/20' : 'bg-loss/5 border border-loss/20'}`}>
              <p className="text-fg-muted text-xs uppercase tracking-wider mb-2">Flex Play</p>
              <p className="font-mono text-2xl font-bold">{analysis.dfs_metrics.powerVsFlex.flexCount}</p>
              <p className="text-fg-muted text-xs">entries</p>
              <p className={`font-mono text-lg font-medium mt-2 ${analysis.dfs_metrics.powerVsFlex.flexROI >= 0 ? 'text-win' : 'text-loss'}`}>
                {analysis.dfs_metrics.powerVsFlex.flexROI >= 0 ? '+' : ''}{analysis.dfs_metrics.powerVsFlex.flexROI}% ROI
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DFS Player Concentration */}
      {analysis.dfs_mode && analysis.dfs_metrics && analysis.dfs_metrics.playerConcentration.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-xl mb-1">Player Concentration</h2>
          <p className="text-fg-dim text-xs italic mb-4">Are you over-exposed to specific players?</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-fg-muted font-medium px-3 py-2">Player</th>
                  <th className="text-right text-fg-muted font-medium px-3 py-2">Appearances</th>
                  <th className="text-right text-fg-muted font-medium px-3 py-2">% of Entries</th>
                  <th className="text-right text-fg-muted font-medium px-3 py-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {analysis.dfs_metrics.playerConcentration.slice(0, 10).map((p) => (
                  <tr key={p.player} className="border-b border-border-subtle">
                    <td className="px-3 py-2 font-medium">{p.player}</td>
                    <td className="px-3 py-2 text-right font-mono text-fg-muted">{p.count}</td>
                    <td className={`px-3 py-2 text-right font-mono ${p.percent >= 30 ? 'text-loss' : p.percent >= 20 ? 'text-caution' : 'text-fg-muted'}`}>
                      {p.percent}%
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${p.roi >= 0 ? 'text-win' : 'text-loss'}`}>
                      {p.roi >= 0 ? '+' : ''}{p.roi}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Session Analysis */}
      {isPartialReport && <SkeletonSection label="Building your session-by-session tilt analysis..." />}
      {!isPartialReport && analysis.session_analysis && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl">Session Analysis</h2>
          <p className="text-fg-dim text-xs italic -mt-2">A &quot;session&quot; is a group of bets placed close together in time, like a single night of betting.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Worst session */}
            {analysis.session_analysis.worst_session && (
              <div className="card border-loss/20 bg-loss/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-loss">Worst Session</h3>
                  <span className="text-xs text-fg-muted">{analysis.session_analysis.worst_session.date}</span>
                </div>
                <p className="font-mono text-2xl font-bold text-loss mb-2">
                  {analysis.session_analysis.worst_session.net >= 0 ? '+' : ''}${Math.round(analysis.session_analysis.worst_session.net).toLocaleString()}
                </p>
                <div className="flex gap-4 text-xs text-fg-muted font-mono mb-3">
                  <span>{analysis.session_analysis.worst_session.bets} bets</span>
                  <span>{analysis.session_analysis.worst_session.duration}</span>
                </div>
                <p className="text-sm text-fg-bright">{analysis.session_analysis.worst_session.description}</p>
              </div>
            )}
            {/* Best session */}
            {analysis.session_analysis.best_session && (
              <div className="card border-win/20 bg-win/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-win">Best Session</h3>
                  <span className="text-xs text-fg-muted">{analysis.session_analysis.best_session.date}</span>
                </div>
                <p className="font-mono text-2xl font-bold text-win mb-2">
                  +${Math.round(analysis.session_analysis.best_session.net).toLocaleString()}
                </p>
                <div className="flex gap-4 text-xs text-fg-muted font-mono mb-3">
                  <span>{analysis.session_analysis.best_session.bets} bets</span>
                  <span>{analysis.session_analysis.best_session.duration}</span>
                </div>
                <p className="text-sm text-fg-bright">{analysis.session_analysis.best_session.description}</p>
              </div>
            )}
          </div>
          <div className="card p-5">
            <p className="text-sm text-fg-bright">
              Your winning sessions average{' '}
              <span className="font-mono font-medium text-win">{analysis.session_analysis.avg_bets_per_winning_session}</span> bets.
              Your losing sessions average{' '}
              <span className="font-mono font-medium text-loss">{analysis.session_analysis.avg_bets_per_losing_session}</span> bets.
            </p>
            <p className="text-fg-muted text-sm mt-2">{analysis.session_analysis.insight}</p>
            <p className="text-fg-dim text-xs mt-2 font-mono">
              {analysis.session_analysis.total_sessions} sessions analyzed (3+ hour gap = new session)
            </p>
          </div>
        </div>
      )}

      {/* ── Session Analysis ── */}
      {analysis.session_detection && analysis.session_detection.totalSessions > 0 && (
        <SessionAnalysisSection sessionData={analysis.session_detection} />
      )}

      {/* ── Bet-by-Bet Annotations ── */}
      {analysis.bet_annotations && analysis.bet_annotations.annotations.length > 0 && (
        <BetAnnotationsSection data={analysis.bet_annotations} />
      )}

      {/* Edge Profile */}
      {isPartialReport && <SkeletonSection label="Ranking your edges and leaks by dollar impact..." />}
      {!isPartialReport && analysis.edge_profile && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl">Edge Profile</h2>
          <p className="text-fg-dim text-xs italic -mt-2">Where you have a statistical advantage (edges) vs where you&apos;re losing money (leaks).</p>
          {/* Sharp Score */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-fg-muted text-sm">Sharp Score <span className="text-fg-dim italic">(how skilled your betting is overall)</span></span>
              <span className="font-mono text-2xl font-bold text-cyan-400">
                {analysis.edge_profile.sharp_score}/100
              </span>
            </div>
            <div className="w-full h-3 bg-base rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-1000 ease-out"
                style={{ width: `${analysis.edge_profile.sharp_score}%` }}
              />
            </div>
            <p className="text-fg-muted text-xs">
              {analysis.edge_profile.sharp_score >= 60
                ? 'You have genuine edges in some areas. Focus your volume there.'
                : analysis.edge_profile.sharp_score >= 30
                ? 'Some promising spots, but more data needed to confirm real edges.'
                : 'No strong edges detected yet. Focus on reducing leaks first.'}
            </p>
            <p className="text-fg-muted text-[10px] mt-1 italic">Based on closing line value, category-level ROI consistency, and sample size confidence.</p>
          </div>
          {/* Profitable / Unprofitable areas */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-win">Profitable Areas</h3>
              {(analysis.edge_profile.profitable_areas ?? []).length === 0 ? (
                <p className="text-fg-muted text-sm card p-4">No profitable areas with sufficient sample size.</p>
              ) : (
                analysis.edge_profile.profitable_areas.map((area, i) => (
                  <div key={i} className="card border-win/20 bg-win/5 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{formatCategoryLabel(area.category)}</span>
                      <span
                        title={area.confidence === 'high' ? '75+ bets, statistically reliable' : area.confidence === 'medium' ? '30-75 bets, likely real but needs more data' : 'Under 30 bets, could be noise'}
                        className={`text-xs px-2 py-0.5 rounded-sm font-mono cursor-help ${
                        area.confidence === 'high' ? 'bg-win/10 text-win' :
                        area.confidence === 'medium' ? 'bg-caution/10 text-caution' :
                        'bg-fg-dim/50 text-fg-muted'
                      }`}>{area.confidence} conf.</span>
                    </div>
                    <p className="font-mono text-win font-semibold">+{area.roi.toFixed(1)}% ROI</p>
                    <p className="text-fg-muted text-xs font-mono">{area.sample_size} bets</p>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-loss">Unprofitable Areas</h3>
              {(analysis.edge_profile.unprofitable_areas ?? []).length === 0 ? (
                <p className="text-fg-muted text-sm card p-4">No major unprofitable areas detected.</p>
              ) : (
                analysis.edge_profile.unprofitable_areas.map((area, i) => (
                  <div key={i} className="card border-loss/20 bg-loss/5 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{formatCategoryLabel(area.category)}</span>
                      <span className="text-xs text-loss font-mono">-${Math.abs(area.estimated_loss).toLocaleString()}</span>
                    </div>
                    <p className="font-mono text-loss font-semibold">{area.roi.toFixed(1)}% ROI</p>
                    <p className="text-fg-muted text-xs font-mono">{area.sample_size} bets</p>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Reallocation advice */}
          {analysis.edge_profile.reallocation_advice && (
            <div className="card border-scalpel/20 bg-scalpel-muted p-5">
              <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright"><p className="text-sm text-fg-bright">{analysis.edge_profile.reallocation_advice}</p></div>
            </div>
          )}
        </div>
      )}

      </section>

      {/* ═══ CHAPTER 4: WHAT IT COSTS ═══ */}
      <section id="chapter-cost">
      <ChapterHeader number={4} title="What It Costs" subtitle="The dollar impact of your behavioral leaks" />

            {/* Leak Prioritizer */}
            {isPartialReport && <SkeletonSection label="Ranking behavioral leaks by dollar cost..." />}
            {!isPartialReport && prioritizedLeaks.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-bold text-2xl">Leak Prioritizer</h2>

                <div className="finding-card border-l-scalpel p-5">
                  <p className="text-fg-muted text-xs uppercase tracking-wider mb-1">Total Recoverable</p>
                  <p className="font-mono text-3xl font-bold text-scalpel">${Math.round(totalRecoverable).toLocaleString()}</p>
                  <p className="text-fg-muted text-sm mt-1">Estimated money left on the table from all detected leaks and biases, ranked by impact.</p>
                  <p className="text-fg-dim text-xs mt-1">Estimated. Some leaks may overlap.</p>
                </div>

                <div className="space-y-3">
                  {prioritizedLeaks.map((item, i) => {
                    const pct = totalRecoverable > 0 ? (item.cost / totalRecoverable) * 100 : 0;
                    return (
                      <div key={i} className="card p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-bold text-scalpel shrink-0">#{i + 1}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{item.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'bias' ? 'bg-orange-400/10 text-orange-400' : 'bg-loss/10 text-loss'}`}>
                                  {item.type}
                                </span>
                                {item.severity && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.medium}`}>
                                    {item.severity}
                                  </span>
                                )}
                              </div>
                              {item.detail && <p className="text-fg-muted text-xs mt-0.5">{item.detail}</p>}
                            </div>
                          </div>
                          <span className="font-mono text-lg font-bold text-loss shrink-0">
                            -${Math.round(item.cost).toLocaleString()}
                          </span>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-fg-muted">Share of total leaks</span>
                            <span className="text-fg-muted font-mono">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-base rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-loss to-scalpel" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <div className="bg-base/50 rounded-sm p-3">
                          <p className="text-fg-muted text-xs mb-1">Fix</p>
                          <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright"><p className="text-fg-bright text-sm">{item.fix}</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What If Simulator */}
            {isPartialReport && <SkeletonSection label="Simulating behavioral what-if scenarios..." />}
            {!isPartialReport && whatIfs.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-bold text-2xl">What-If Simulator</h2>
                <p className="text-fg-muted text-sm">Counterfactual scenarios calculated from your actual bet data.</p>
                <div className="grid gap-3">
                  {whatIfs.map((wi, i) => {
                    const diff = wi.hypothetical - wi.actual;
                    const better = diff > 0;
                    const maxVal = Math.max(Math.abs(wi.actual), Math.abs(wi.hypothetical));
                    const actualPct = maxVal > 0 ? (Math.abs(wi.actual) / maxVal) * 100 : 0;
                    const hypoPct = maxVal > 0 ? (Math.abs(wi.hypothetical) / maxVal) * 100 : 0;
                    return (
                      <div key={i} className="card p-5">
                        <p className="text-fg-bright text-sm mb-4">{wi.label}</p>
                        <div className="space-y-3 mb-4">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-fg-muted">Actual P&L</span>
                              <span className={`font-mono font-semibold ${wi.actual >= 0 ? 'text-win' : 'text-loss'}`}>
                                {wi.actual >= 0 ? '+' : ''}${Math.round(wi.actual).toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-base rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${wi.actual >= 0 ? 'bg-win' : 'bg-loss'}`} style={{ width: `${actualPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-fg-muted">Hypothetical P&L</span>
                              <span className={`font-mono font-semibold ${wi.hypothetical >= 0 ? 'text-win' : 'text-loss'}`}>
                                {wi.hypothetical >= 0 ? '+' : ''}${Math.round(wi.hypothetical).toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-base rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${wi.hypothetical >= 0 ? 'bg-cyan-400' : 'bg-loss'}`} style={{ width: `${hypoPct}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-mono font-semibold ${better ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'}`}>
                          {better ? '↑' : '↓'} {better ? '+' : ''}${Math.round(diff).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

      </section>

      {/* ═══ CHAPTER 5: PROTOCOL ═══ */}
      <section id="chapter-protocol">
      <ChapterHeader number={5} title="Protocol" subtitle="Your personalized action plan" />

      {/* Action Plan */}
      {isPartialReport && <SkeletonSection label="Generating your personalized action plan..." />}
      {!isPartialReport && recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] text-fg-dim tracking-[3px] mb-2.5 mt-7">PRESCRIBED PROTOCOL</p>
          {recommendations.map((rec, i) => (
            <div key={i} className="border border-border-subtle p-4 border-l-[3px] border-l-scalpel">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="font-mono text-[11px] font-bold text-scalpel bg-scalpel/[0.08] px-2 py-0.5">RX-{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[14px] font-semibold text-fg-bright">{rec.title}</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright ml-[50px]">
                <p className="text-[12px] text-fg-muted leading-relaxed">{rec.description}{' '}<span className="font-mono text-[11px] text-scalpel">{rec.expected_improvement}</span></p>
              </div>
            </div>
          ))}
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
                const btn = document.getElementById('copy-rules-btn');
                toast.success('Rules copied to clipboard');
              }}
              id="copy-rules-btn"
              className="text-xs text-fg-muted hover:text-scalpel transition-colors"
            >
              Copy Rules
            </button>
          </div>
          <div className="space-y-3">
            {(analysis.personal_rules ?? []).map((rule: PersonalRule, i: number) => (
              <div key={i} className="card border-l-4 border-l-scalpel bg-surface-1/60 p-5">
                <p className="text-fg-bright font-medium mb-2">{rule.rule}</p>
                <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright mb-2"><p className="text-fg-muted text-sm">{rule.reason}</p></div>
                <p className="text-fg-dim text-xs">Based on: {rule.based_on}</p>
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
              analysis.discipline_score.total >= 71 ? 'text-win' :
              analysis.discipline_score.total >= 51 ? 'text-caution' :
              analysis.discipline_score.total >= 31 ? 'text-orange-400' : 'text-loss'
            }`}>
              {analysis.discipline_score.total}/100
            </span>
          </div>
          <p className="text-fg-muted text-xs">
            Measures how consistently you&apos;re building better betting habits: tracking, sizing, emotional control, and strategic focus.
          </p>
          <div className="w-full h-3 bg-base rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                analysis.discipline_score.total >= 71 ? 'bg-win' :
                analysis.discipline_score.total >= 51 ? 'bg-caution' :
                analysis.discipline_score.total >= 31 ? 'bg-orange-400' : 'bg-loss'
              }`}
              style={{ width: `${analysis.discipline_score.total}%` }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { label: 'Tracking', val: analysis.discipline_score.tracking, hint: 'Consistency of uploading and reviewing your bets' },
              { label: 'Sizing', val: analysis.discipline_score.sizing, hint: 'How flat and controlled your bet sizing is' },
              { label: 'Control', val: analysis.discipline_score.control, hint: 'Tied to your emotion score. Staying cool means more control' },
              { label: 'Strategy', val: analysis.discipline_score.strategy, hint: 'Whether you focus volume on your profitable categories' },
            ]).map(({ label, val, hint }) => (
              <div key={label}>
                <p className="text-fg-dim text-xs mb-1" title={hint}>{label}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-base rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${val >= 18 ? 'bg-win' : val >= 12 ? 'bg-caution' : val >= 6 ? 'bg-orange-400' : 'bg-loss'}`} style={{ width: `${(val / 25) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-fg-muted">{val}/25</span>
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
              <p className="text-fg-muted text-xs">
                Weakest area: <span className="text-fg-bright">{weakest.name} ({weakest.val}/25)</span>. {tips[weakest.name]}
              </p>
            );
          })()}
        </div>
      )}

      {/* Tools tab nudge — above share */}
      {hasToolsContent && !readOnly && isSharp && (
        <button
          onClick={() => { setActiveTab('tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="w-full card p-5 text-left hover:border-cyan-400/20 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-cyan-400/10 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm text-fg-bright group-hover:text-cyan-400 transition-colors">View Analysis Tools</p>
                <p className="text-fg-muted text-xs mt-0.5">Your leaks are ranked and ready. See what to fix first.</p>
              </div>
            </div>
            <span className="text-fg-dim group-hover:text-cyan-400 transition-colors text-sm shrink-0 ml-3">Tools &rarr;</span>
          </div>
        </button>
      )}

      {!readOnly && (
        <div className="border-t border-border-subtle pt-5 mt-5">
          <p className="font-mono text-[9px] text-fg-dim tracking-[2px] mb-3">SHARE YOUR RESULTS</p>
          <ShareSection analysis={analysis} summary={summary} reportId={reportId} bets={bets} />
        </div>
      )}

      <div className="case-card p-5 text-center space-y-3 mt-4">
        <p className="text-fg-bright font-medium">What happens next?</p>
        <p className="text-fg-muted text-sm">Run another autopsy in 2-4 weeks to see if your behavioral patterns are improving. Your scores update every time.</p>
      </div>

      </section>

      </>
      )}

      {/* Feedback */}
      {!readOnly && <ReportFeedback reportId={reportId} />}
      </>}


      {/* ═══ Tools Tab (Leak Prioritizer + What-If Simulator) ═══ */}
      {activeTab === 'tools' && (
        isSharp ? (
          <div className="space-y-8">
            {/* What If Simulator */}
            {isPartialReport && <SkeletonSection label="Simulating behavioral what-if scenarios..." />}
            {!isPartialReport && whatIfs.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-bold text-2xl">What-If Simulator</h2>
                <p className="text-fg-muted text-sm">Counterfactual scenarios calculated from your actual bet data.</p>
                <div className="grid gap-3">
                  {whatIfs.map((wi, i) => {
                    const diff = wi.hypothetical - wi.actual;
                    const better = diff > 0;
                    const maxVal = Math.max(Math.abs(wi.actual), Math.abs(wi.hypothetical));
                    const actualPct = maxVal > 0 ? (Math.abs(wi.actual) / maxVal) * 100 : 0;
                    const hypoPct = maxVal > 0 ? (Math.abs(wi.hypothetical) / maxVal) * 100 : 0;
                    return (
                      <div key={i} className="card p-5">
                        <p className="text-fg-bright text-sm mb-4">{wi.label}</p>
                        <div className="space-y-3 mb-4">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-fg-muted">Actual P&L</span>
                              <span className={`font-mono font-semibold ${wi.actual >= 0 ? 'text-win' : 'text-loss'}`}>
                                {wi.actual >= 0 ? '+' : ''}${Math.round(wi.actual).toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-base rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${wi.actual >= 0 ? 'bg-win' : 'bg-loss'}`} style={{ width: `${actualPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-fg-muted">Hypothetical P&L</span>
                              <span className={`font-mono font-semibold ${wi.hypothetical >= 0 ? 'text-win' : 'text-loss'}`}>
                                {wi.hypothetical >= 0 ? '+' : ''}${Math.round(wi.hypothetical).toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-base rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${wi.hypothetical >= 0 ? 'bg-cyan-400' : 'bg-loss'}`} style={{ width: `${hypoPct}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-mono font-semibold ${better ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'}`}>
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

                <div className="finding-card border-l-scalpel p-5">
                  <p className="text-fg-muted text-xs uppercase tracking-wider mb-1">Total Recoverable</p>
                  <p className="font-mono text-3xl font-bold text-scalpel">${Math.round(totalRecoverable).toLocaleString()}</p>
                  <p className="text-fg-muted text-sm mt-1">Estimated money left on the table from all detected leaks and biases, ranked by impact.</p>
                  <p className="text-fg-dim text-xs mt-1">Estimated. Some leaks may overlap.</p>
                </div>

                <div className="space-y-3">
                  {prioritizedLeaks.map((item, i) => {
                    const pct = totalRecoverable > 0 ? (item.cost / totalRecoverable) * 100 : 0;
                    return (
                      <div key={i} className="card p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-bold text-scalpel shrink-0">#{i + 1}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{item.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'bias' ? 'bg-orange-400/10 text-orange-400' : 'bg-loss/10 text-loss'}`}>
                                  {item.type}
                                </span>
                                {item.severity && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.medium}`}>
                                    {item.severity}
                                  </span>
                                )}
                              </div>
                              {item.detail && <p className="text-fg-muted text-xs mt-0.5">{item.detail}</p>}
                            </div>
                          </div>
                          <span className="font-mono text-lg font-bold text-loss shrink-0">
                            -${Math.round(item.cost).toLocaleString()}
                          </span>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-fg-muted">Share of total leaks</span>
                            <span className="text-fg-muted font-mono">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-base rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-loss to-scalpel" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <div className="bg-base/50 rounded-sm p-3">
                          <p className="text-fg-muted text-xs mb-1">Fix</p>
                          <div className="prose prose-invert prose-sm max-w-none prose-p:text-fg-muted prose-p:leading-relaxed prose-strong:text-fg-bright"><p className="text-fg-bright text-sm">{item.fix}</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!readOnly && (
              <div className="border-t border-border-subtle pt-5 mt-5">
                <p className="font-mono text-[9px] text-fg-dim tracking-[2px] mb-3">SHARE YOUR RESULTS</p>
                <ShareSection analysis={analysis} summary={summary} reportId={reportId} bets={bets} />
              </div>
            )}
            {!readOnly && <ReportFeedback reportId={reportId} />}
          </div>
        ) : (
          /* Locked tools tab for non-Pro users */
          <div className="space-y-6 py-4">
            <div className="text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-sm bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="font-bold text-2xl">Analysis Tools</h2>
              <p className="text-fg-muted text-sm mb-4">Every behavioral leak, ranked by dollar cost. See exactly where to fix first and simulate how much you&apos;d save.</p>
              <a href="/pricing" className="btn-primary inline-block">Get a Full Report</a>
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
      <p className="text-fg-muted text-xs mb-0.5">{label}{hint && <span className="text-fg-dim normal-case"> ({hint})</span>}</p>
      <p className={`font-mono font-semibold ${small ? 'text-sm' : 'text-lg'} ${color ?? 'text-fg-bright'}`}>{value}</p>
    </div>
  );
}

// ── Bet Annotations Section ──

const CLASSIFICATION_COLORS: Record<string, string> = {
  disciplined: 'bg-win/20 text-win',
  neutral: 'bg-fg-dim/20 text-fg-muted',
  emotional: 'bg-caution/20 text-caution',
  chasing: 'bg-orange-400/20 text-orange-400',
  impulsive: 'bg-loss/20 text-loss',
};

const CLASSIFICATION_BAR_COLORS: Record<string, string> = {
  disciplined: '#3FB950',
  neutral: '#515968',
  emotional: '#D29922',
  chasing: '#f97316',
  impulsive: '#F85149',
};

function BetAnnotationsSection({ data }: { data: import('@/types').AnnotationSummary }) {
  const [showLog, setShowLog] = useState(false);
  const [expandedBet, setExpandedBet] = useState<number | null>(null);

  const totalBets = Object.values(data.distribution).reduce((s, d) => s + d.count, 0);
  const disciplinedROI = data.distribution.disciplined.roi;
  const emotionalBets = data.distribution.emotional.count + data.distribution.chasing.count + data.distribution.impulsive.count;
  const emotionalPct = totalBets > 0 ? Math.round((emotionalBets / totalBets) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="case-header mb-1">BET-BY-BET ANALYSIS</div>
        <p className="text-fg-dim text-xs">Every bet, classified by behavioral intent</p>
      </div>

      {/* Distribution bar */}
      <div>
        <div className="flex h-6 rounded-sm overflow-hidden border border-border-subtle">
          {(['disciplined', 'neutral', 'emotional', 'chasing', 'impulsive'] as const).filter(c => data.distribution[c].count > 0).map(c => (
            <div
              key={c}
              style={{ width: `${data.distribution[c].percent}%`, backgroundColor: CLASSIFICATION_BAR_COLORS[c] }}
              className="flex items-center justify-center"
              title={`${c}: ${data.distribution[c].count} bets (${data.distribution[c].percent}%)`}
            >
              {data.distribution[c].percent >= 12 && <span className="font-mono text-[9px] text-base font-bold capitalize">{c.slice(0, 4)}</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {(['disciplined', 'neutral', 'emotional', 'chasing', 'impulsive'] as const).filter(c => data.distribution[c].count > 0).map(c => (
            <span key={c} className="font-mono text-[10px] text-fg-dim">
              <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: CLASSIFICATION_BAR_COLORS[c] }} />
              {data.distribution[c].count} {c}
            </span>
          ))}
        </div>
      </div>

      {/* Emotional cost callout */}
      {data.emotionalCost > 0 && (
        <div className="finding-card border-l-scalpel !p-4">
          <p className="text-fg-muted text-sm">
            Your emotional, chasing, and impulsive bets cost you an estimated <span className="font-mono font-bold text-loss">${data.emotionalCost.toLocaleString()}</span>.
            Disciplined bets returned <span className="font-mono text-win">{disciplinedROI.toFixed(1)}%</span> ROI.
          </p>
        </div>
      )}

      {/* ROI comparison strip */}
      <div className="vitals-strip grid-cols-2 md:grid-cols-5">
        {(['disciplined', 'neutral', 'emotional', 'chasing', 'impulsive'] as const).filter(c => data.distribution[c].count > 0).map(c => {
          const d = data.distribution[c];
          return (
            <div key={c} className="vitals-cell text-center">
              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-bold mb-1 inline-block ${CLASSIFICATION_COLORS[c]}`}>{c}</span>
              <div className="font-mono text-sm text-fg-bright">{d.count} bets</div>
              <div className={`font-mono text-xs font-medium ${d.roi >= 0 ? 'text-win' : 'text-loss'}`}>{d.roi >= 0 ? '+' : ''}{d.roi.toFixed(1)}% ROI</div>
            </div>
          );
        })}
      </div>

      {/* Insight */}
      {data.insight && (
        <div className="finding-card border-l-caution !p-3">
          <p className="text-fg-muted text-sm">{data.insight}</p>
        </div>
      )}

      {/* Worst / Best spotlight */}
      <div className="grid md:grid-cols-2 gap-3">
        {data.worstAnnotatedBet && (
          <div className="case-card border-loss/20 p-4">
            <span className="font-mono text-[9px] text-loss tracking-widest block mb-2">WORST BEHAVIORAL BET</span>
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-sm font-bold ${CLASSIFICATION_COLORS[data.worstAnnotatedBet.classification]}`}>{data.worstAnnotatedBet.classification}</span>
              <span className="font-mono text-[10px] text-fg-dim">{data.worstAnnotatedBet.confidence}% conf.</span>
            </div>
            <p className="text-fg-muted text-sm mb-1">{data.worstAnnotatedBet.primaryReason}</p>
            {data.worstAnnotatedBet.sessionId && (
              <p className="font-mono text-[10px] text-fg-dim">Part of {data.worstAnnotatedBet.sessionId} (Grade {data.worstAnnotatedBet.sessionGrade}{data.worstAnnotatedBet.isInHeatedSession ? ', heated' : ''})</p>
            )}
          </div>
        )}
        {data.bestAnnotatedBet && (
          <div className="case-card border-win/20 p-4">
            <span className="font-mono text-[9px] text-win tracking-widest block mb-2">MOST DISCIPLINED BET</span>
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-sm font-bold ${CLASSIFICATION_COLORS[data.bestAnnotatedBet.classification]}`}>{data.bestAnnotatedBet.classification}</span>
              <span className="font-mono text-[10px] text-fg-dim">{data.bestAnnotatedBet.confidence}% conf.</span>
            </div>
            <p className="text-fg-muted text-sm mb-1">{data.bestAnnotatedBet.primaryReason}</p>
            {data.bestAnnotatedBet.sessionId && (
              <p className="font-mono text-[10px] text-fg-dim">Part of {data.bestAnnotatedBet.sessionId} (Grade {data.bestAnnotatedBet.sessionGrade})</p>
            )}
          </div>
        )}
      </div>

      {/* Full bet log */}
      {data.annotations.length > 5 && (
        <div>
          <button onClick={() => setShowLog(!showLog)} className="text-sm text-fg-muted hover:text-fg transition-colors font-mono">
            {showLog ? 'Hide' : `View all ${data.annotations.length} annotated bets`} <span className="text-fg-dim text-xs">{showLog ? '▴' : '▾'}</span>
          </button>
          {showLog && (
            <div className="mt-2 space-y-1 max-h-[500px] overflow-y-auto">
              {data.annotations.map((ann, i) => (
                <div key={ann.betId}>
                  <button
                    onClick={() => setExpandedBet(expandedBet === i ? null : i)}
                    className="w-full bg-surface-2 rounded-sm p-2 flex items-center gap-2 text-xs text-left hover:bg-surface-3 transition-colors"
                  >
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-bold shrink-0 ${CLASSIFICATION_COLORS[ann.classification]}`}>{ann.classification.slice(0, 4)}</span>
                    <span className="font-mono text-fg-dim w-8 shrink-0">{ann.confidence}%</span>
                    <span className="text-fg-muted truncate flex-1">{ann.primaryReason}</span>
                    {ann.isInHeatedSession && <span title="Heated session"><Flame size={14} className="text-orange-400" /></span>}
                    <span className="text-fg-dim font-mono">{ann.stakeVsMedian.toFixed(1)}x</span>
                  </button>
                  {expandedBet === i && (
                    <div className="bg-base border border-border-subtle rounded-sm p-3 ml-4 mt-1 space-y-1">
                      {ann.signals.map((sig, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <span className={`font-mono w-6 text-right shrink-0 ${sig.weight > 0 ? 'text-loss' : 'text-win'}`}>{sig.weight > 0 ? '+' : ''}{sig.weight}</span>
                          <span className="text-fg-dim">{sig.description}</span>
                        </div>
                      ))}
                      {ann.sessionId && <p className="text-fg-dim text-[10px] font-mono mt-1">{ann.sessionId} · Grade {ann.sessionGrade} · Streak: {ann.currentStreak > 0 ? `+${ann.currentStreak}W` : ann.currentStreak < 0 ? `${ann.currentStreak}L` : '0'}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Session Analysis Section ──

function SessionAnalysisSection({ sessionData }: { sessionData: import('@/types').SessionDetectionResult }) {
  const [showAll, setShowAll] = useState(false);
  const [showHeated, setShowHeated] = useState(false);

  const gradeColors: Record<string, string> = {
    A: 'bg-win/20 text-win',
    B: 'bg-win/10 text-win/70',
    C: 'bg-caution/20 text-caution',
    D: 'bg-orange-400/20 text-orange-400',
    F: 'bg-loss/20 text-loss',
  };

  const gradeBarColors: Record<string, string> = {
    A: '#3FB950', B: '#3FB95090', C: '#D29922', D: '#f97316', F: '#F85149',
  };

  const totalForBar = sessionData.sessionGradeDistribution.reduce((s, g) => s + g.count, 0);
  const heatedSessions = sessionData.sessions.filter(s => s.isHeated);
  const sortedSessions = [...sessionData.sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <div>
        <div className="case-header mb-1">SESSION ANALYSIS</div>
        <p className="text-fg-dim text-xs">Every betting session, detected and graded A through F</p>
      </div>

      {/* Grade distribution bar */}
      <div>
        <div className="flex h-6 rounded-sm overflow-hidden border border-border-subtle">
          {sessionData.sessionGradeDistribution.filter(g => g.count > 0).map(g => (
            <div
              key={g.grade}
              style={{ width: `${(g.count / totalForBar) * 100}%`, backgroundColor: gradeBarColors[g.grade] }}
              className="flex items-center justify-center"
              title={`${g.grade}: ${g.count} sessions (${g.percent}%)`}
            >
              {g.percent >= 10 && <span className="font-mono text-[10px] text-base font-bold">{g.grade}</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {sessionData.sessionGradeDistribution.filter(g => g.count > 0).map(g => (
            <span key={g.grade} className="font-mono text-[10px] text-fg-dim">
              <span className={`inline-block w-2 h-2 rounded-sm mr-1`} style={{ backgroundColor: gradeBarColors[g.grade] }} />
              {g.count} {g.grade}
            </span>
          ))}
        </div>
      </div>

      {/* Key stats strip */}
      <div className="vitals-strip grid-cols-3 md:grid-cols-6">
        <div className="vitals-cell text-center">
          <span className="data-label block">Sessions</span>
          <span className="font-mono text-lg font-bold text-fg-bright">{sessionData.totalSessions}</span>
        </div>
        <div className="vitals-cell text-center">
          <span className="data-label block">Avg Length</span>
          <span className="font-mono text-lg font-bold text-fg-bright">{sessionData.avgSessionLength.toFixed(1)} bets</span>
        </div>
        <div className="vitals-cell text-center">
          <span className="data-label block">Avg Duration</span>
          <span className="font-mono text-lg font-bold text-fg-bright">{Math.round(sessionData.avgSessionDuration)}m</span>
        </div>
        <div className="vitals-cell text-center">
          <span className="data-label block">Heated</span>
          <span className="font-mono text-lg font-bold text-loss">{sessionData.heatedSessionCount}</span>
        </div>
        <div className="vitals-cell text-center">
          <span className="data-label block">A-Grade ROI</span>
          <span className="font-mono text-lg font-bold text-win">+{(sessionData.avgGradedROI['A'] ?? 0).toFixed(1)}%</span>
        </div>
        <div className="vitals-cell text-center">
          <span className="data-label block">F-Grade ROI</span>
          <span className="font-mono text-lg font-bold text-loss">{(sessionData.avgGradedROI['F'] ?? 0).toFixed(1)}%</span>
        </div>
      </div>

      {/* Insight */}
      {sessionData.insight && (
        <div className="finding-card border-l-scalpel !p-3">
          <p className="text-fg-muted text-sm">{sessionData.insight}</p>
        </div>
      )}

      {/* Best / Worst session cards */}
      <div className="grid md:grid-cols-2 gap-3">
        {sessionData.bestSession && (
          <div className="case-card border-win/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-fg-dim text-xs font-mono">{sessionData.bestSession.id}</span>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-sm font-bold ${gradeColors[sessionData.bestSession.grade]}`}>{sessionData.bestSession.grade}</span>
            </div>
            <p className="text-win font-mono text-xl font-bold">+${sessionData.bestSession.profit.toLocaleString()}</p>
            <p className="text-fg-dim text-xs font-mono mt-1">{sessionData.bestSession.dayOfWeek} · {sessionData.bestSession.bets} bets · {sessionData.bestSession.startTime}–{sessionData.bestSession.endTime}</p>
            {sessionData.bestSession.gradeReasons.map((r, i) => (
              <p key={i} className="text-fg-muted text-xs mt-1">+ {r}</p>
            ))}
          </div>
        )}
        {sessionData.worstSession && (
          <div className="case-card border-loss/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-fg-dim text-xs font-mono">{sessionData.worstSession.id}</span>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-sm font-bold ${gradeColors[sessionData.worstSession.grade]}`}>{sessionData.worstSession.grade}</span>
            </div>
            <p className="text-loss font-mono text-xl font-bold">-${Math.abs(sessionData.worstSession.profit).toLocaleString()}</p>
            <p className="text-fg-dim text-xs font-mono mt-1">{sessionData.worstSession.dayOfWeek} · {sessionData.worstSession.bets} bets · {sessionData.worstSession.startTime}–{sessionData.worstSession.endTime}</p>
            {sessionData.worstSession.gradeReasons.map((r, i) => (
              <p key={i} className="text-fg-muted text-xs mt-1 text-loss/70">- {r}</p>
            ))}
          </div>
        )}
      </div>

      {/* Heated sessions */}
      {heatedSessions.length > 0 && (
        <div>
          <button onClick={() => setShowHeated(!showHeated)} className="flex items-center gap-2 text-sm text-loss hover:text-loss/80 transition-colors font-mono">
            <span className="flex items-center gap-1"><Flame size={16} className="text-orange-400" /> {heatedSessions.length} Heated Session{heatedSessions.length !== 1 ? 's' : ''}</span> <span className="text-fg-dim text-xs">{showHeated ? '▴' : '▾'}</span>
          </button>
          {showHeated && (
            <div className="mt-2 space-y-1.5">
              {heatedSessions.map(s => (
                <div key={s.id} className="bg-surface-2 border border-loss/10 rounded-sm p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-mono text-[10px] text-fg-dim w-24 shrink-0">{s.id}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-sm font-bold shrink-0 ${gradeColors[s.grade]}`}>{s.grade}</span>
                  <span className="text-fg-muted text-xs">{s.dayOfWeek} {s.date.slice(5)}</span>
                  <span className="text-fg-muted text-xs font-mono">{s.bets} bets · {Math.round(s.durationMinutes / 60)}h</span>
                  <span className="text-loss font-mono text-xs font-medium">{s.profit >= 0 ? '+' : ''}${s.profit.toLocaleString()}</span>
                  <span className="text-fg-dim text-xs italic ml-auto">{s.heatSignals[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full session log */}
      {sessionData.sessions.length > 4 && (
        <div>
          <button onClick={() => setShowAll(!showAll)} className="text-sm text-fg-muted hover:text-fg transition-colors font-mono">
            {showAll ? 'Hide' : `View all ${sessionData.totalSessions} sessions`} <span className="text-fg-dim text-xs">{showAll ? '▴' : '▾'}</span>
          </button>
          {showAll && (
            <div className="mt-2 space-y-1">
              {sortedSessions.map(s => (
                <div key={s.id} className="bg-surface-2 rounded-sm p-2 flex items-center gap-2 text-xs">
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm font-bold shrink-0 ${gradeColors[s.grade]}`}>{s.grade}</span>
                  <span className="font-mono text-fg-dim w-20 shrink-0">{s.date.slice(5)}</span>
                  <span className="text-fg-muted font-mono">{s.bets} bets</span>
                  <span className="text-fg-dim font-mono">{Math.round(s.durationMinutes / 60)}h{s.durationMinutes % 60 > 0 ? `${s.durationMinutes % 60}m` : ''}</span>
                  <span className={`font-mono font-medium ml-auto ${s.profit >= 0 ? 'text-win' : 'text-loss'}`}>{s.profit >= 0 ? '+' : ''}${s.profit.toLocaleString()}</span>
                  {s.isHeated && <span title="Heated session"><Flame size={14} className="text-loss" /></span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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

  // Build behavioral split from bet annotations
  const annotations = analysis.bet_annotations?.distribution;
  let disciplinedRecord: { bets: number; roi: number } | undefined;
  let emotionalRecord: { bets: number; roi: number } | undefined;
  if (annotations) {
    const disc = annotations['disciplined' as keyof typeof annotations] as { count?: number; roi?: number } | undefined;
    if (disc?.count && disc.count > 0) {
      disciplinedRecord = { bets: disc.count, roi: Math.round((disc.roi ?? 0) * 10) / 10 };
    }
    const emotionalKeys = ['emotional', 'chasing', 'impulsive'] as const;
    let emoBets = 0, emoStaked = 0, emoProfit = 0;
    for (const key of emotionalKeys) {
      const bucket = annotations[key as keyof typeof annotations] as { count?: number; totalStaked?: number; totalProfit?: number } | undefined;
      if (bucket?.count) {
        emoBets += bucket.count;
        emoStaked += bucket.totalStaked ?? 0;
        emoProfit += bucket.totalProfit ?? 0;
      }
    }
    if (emoBets > 0 && emoStaked > 0) {
      emotionalRecord = { bets: emoBets, roi: Math.round((emoProfit / emoStaked) * 1000) / 10 };
    }
  }

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
    disciplinedRecord,
    emotionalRecord,
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
