"use client";
import { Tabs } from "./ui/tabs";

export function ProductShowcase() {
  const tabs = [
    {
      title: "1. Upload",
      value: "upload",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-md border border-border-subtle bg-surface-1 p-6 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-scalpel/10 text-scalpel flex items-center justify-center text-xs font-bold font-mono">1</span>
            <p className="text-lg md:text-2xl font-semibold text-fg-bright tracking-tight">
              Import your betting history
            </p>
          </div>
          <p className="text-sm text-fg-muted mb-6">
            CSV from FanDuel, DraftKings, BetMGM, PrizePicks via Pikkit, screenshot, or paste. Takes 30 seconds.
          </p>
          <div className="bg-surface-2 rounded-md p-4 space-y-2.5">
            <div className="flex items-center gap-3 p-2.5 bg-base rounded border border-border-subtle">
              <div className="w-8 h-8 rounded bg-scalpel/10 flex items-center justify-center">
                <svg className="text-scalpel" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg-bright truncate">draftkings_history_2024.csv</p>
                <p className="text-xs text-fg-dim font-mono">847 bets · 14 months</p>
              </div>
              <span className="text-xs text-scalpel font-mono">Imported</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 bg-base rounded border border-border-subtle">
              <div className="w-8 h-8 rounded bg-scalpel/10 flex items-center justify-center">
                <svg className="text-scalpel" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg-bright truncate">fanduel_export.csv</p>
                <p className="text-xs text-fg-dim font-mono">312 bets · 6 months</p>
              </div>
              <span className="text-xs text-scalpel font-mono">Imported</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "2. Analyze",
      value: "analyze",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-md border border-border-subtle bg-surface-1 p-6 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-scalpel/10 text-scalpel flex items-center justify-center text-xs font-bold font-mono">2</span>
            <p className="text-lg md:text-2xl font-semibold text-fg-bright tracking-tight">
              We found 3 biases costing you $1,920/year
            </p>
          </div>
          <p className="text-sm text-fg-muted mb-5">
            Your bets were scanned for 47 behavioral signals. Here&apos;s what surfaced:
          </p>
          {/* Realistic finding previews */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-base rounded border border-border-subtle">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-bleed shrink-0" />
                <span className="text-sm text-fg-bright font-medium truncate">Loss Chasing</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bleed/10 text-bleed font-medium shrink-0">HIGH</span>
              </div>
              <span className="text-sm font-mono text-bleed shrink-0 ml-3">-$480/qtr</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-base rounded border border-border-subtle">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-caution shrink-0" />
                <span className="text-sm text-fg-bright font-medium truncate">Parlay Overexposure</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-caution/10 text-caution font-medium shrink-0">MEDIUM</span>
              </div>
              <span className="text-sm font-mono text-bleed shrink-0 ml-3">-$312/qtr</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-base rounded border border-border-subtle">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-caution shrink-0" />
                <span className="text-sm text-fg-bright font-medium truncate">Late-Night Betting</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-caution/10 text-caution font-medium shrink-0">MEDIUM</span>
              </div>
              <span className="text-sm font-mono text-bleed shrink-0 ml-3">-$188/qtr</span>
            </div>
          </div>
          <p className="text-xs text-fg-dim mt-3 font-mono">From a real user&apos;s report with 280 bets</p>
        </div>
      ),
    },
    {
      title: "3. Report",
      value: "report",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-md border border-border-subtle bg-surface-1 p-6 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-scalpel/10 text-scalpel flex items-center justify-center text-xs font-bold font-mono">3</span>
            <p className="text-lg md:text-2xl font-semibold text-fg-bright tracking-tight">
              Your personalized action plan
            </p>
          </div>
          <p className="text-sm text-fg-muted mb-5">
            Not just what&apos;s wrong. Exactly how to fix it, ranked by dollar impact.
          </p>
          {/* Mini report preview */}
          <div className="space-y-3">
            <div className="bg-scalpel/[0.04] border border-scalpel/10 rounded-md px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-1 rounded-full bg-scalpel" />
                <span className="text-[10px] text-scalpel font-mono uppercase tracking-widest">Rule #1</span>
              </div>
              <p className="text-sm text-fg-bright">Never bet more than $75 after a loss. Your post-loss stakes average 2.4x your normal size and lose at 63%.</p>
            </div>
            <div className="bg-scalpel/[0.04] border border-scalpel/10 rounded-md px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-1 rounded-full bg-scalpel" />
                <span className="text-[10px] text-scalpel font-mono uppercase tracking-widest">Rule #2</span>
              </div>
              <p className="text-sm text-fg-bright">Cap parlays at 15% of weekly volume. You&apos;re at 41%. Your 4+ leg parlays are 2-for-31.</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <span className="text-sm text-fg-muted">If you follow these rules:</span>
              <span className="text-lg font-bold font-mono text-scalpel">+$1,920/year</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="h-[26rem] md:h-[32rem] [perspective:1000px] relative flex flex-col max-w-4xl mx-auto w-full items-start justify-start">
      <Tabs tabs={tabs} autoAdvance={5000} />
    </div>
  );
}
