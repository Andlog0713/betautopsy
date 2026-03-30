'use client';

import { gradeColor } from '@/lib/report-helpers';
import type { AutopsyAnalysis } from '@/types';

interface ReportHeaderProps {
  analysis: AutopsyAnalysis;
  summary: AutopsyAnalysis['summary'];
  reportId?: string;
}

export default function ReportHeader({ analysis, summary, reportId }: ReportHeaderProps) {
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
    </>
  );
}
