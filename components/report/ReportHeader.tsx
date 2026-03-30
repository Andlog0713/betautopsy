import { useMemo } from 'react';
import { gradeColor } from '@/lib/report-helpers';
import type { AutopsyAnalysis, AutopsySummary, Bet } from '@/types';

interface ReportHeaderProps {
  analysis: AutopsyAnalysis;
  summary: AutopsySummary;
  reportId?: string;
  readOnly?: boolean;
  bets: Bet[];
}

export default function ReportHeader({ analysis, summary, reportId, readOnly, bets }: ReportHeaderProps) {
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

  return (
    <>
      {/* ═══ CASE FILE HEADER — matching mockup ═══ */}
      <div className="flex justify-between items-start mb-7">
        <div>
          <p className="font-mono text-[10px] text-fg-dim tracking-[2px] mb-1.5">
            AUTOPSY REPORT — #{reportId ? `BA-${reportId.slice(0, 4).toUpperCase()}` : 'BA-LIVE'}
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
      <details className="border border-white/[0.04] rounded-sm bg-surface/50 mb-5">
        <summary className="px-4 py-3 text-sm text-fg-muted cursor-pointer hover:text-fg flex items-center gap-2 font-mono text-[11px] tracking-wider">
          <span className="text-fg-dim">▸</span> ABOUT THIS REPORT
        </summary>
        <div className="px-4 pb-4 text-xs text-fg-muted leading-relaxed border-t border-white/[0.04]">
          Unlike a bet tracker that shows you numbers, BetAutopsy analyzes your betting <strong className="text-fg-bright">behavior</strong> — the psychological patterns, emotional responses, and cognitive biases that affect every bet you place.
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
                <a href={`/reports?run=true&sportsbook=${encodeURIComponent(mixedDataInfo.sportsBook)}`} className="text-xs font-medium bg-base hover:bg-surface text-fg-bright px-3 py-2 rounded-sm transition-colors">
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
        <div className="border border-white/[0.04] p-[18px] border-l-[3px] border-l-purple-500 mb-5">
          <p className="font-mono text-[9px] text-fg-dim tracking-[2px] mb-1">SUBJECT CLASSIFICATION</p>
          <h2 className="font-bold text-xl text-purple-400 mb-1">{analysis.betting_archetype.name}</h2>
          <p className="text-[12px] text-fg-muted leading-relaxed">{analysis.betting_archetype.description}</p>
        </div>
      )}
    </>
  );
}
