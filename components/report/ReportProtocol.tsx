'use client';

import type { AutopsyAnalysis, PersonalRule } from '@/types';

function SkeletonSection({ label }: { label: string }) {
  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center gap-2 text-fg-muted text-sm">
        <span className="inline-block w-4 h-4 border-2 border-fg-muted border-t-scalpel rounded-full animate-spin" />
        {label}
      </div>
      <div className="h-4 bg-surface rounded animate-pulse w-full" />
      <div className="h-4 bg-surface rounded animate-pulse w-2/3" />
      <div className="h-4 bg-surface rounded animate-pulse w-4/5" />
    </div>
  );
}

interface ReportProtocolProps {
  analysis: AutopsyAnalysis;
  isPartialReport: boolean;
}

export default function ReportProtocol({ analysis, isPartialReport }: ReportProtocolProps) {
  const { recommendations } = analysis;

  return (
    <>
      {/* Action Plan */}
      {isPartialReport && <SkeletonSection label="Generating your personalized action plan..." />}
      {!isPartialReport && recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] text-fg-dim tracking-[3px] mb-2.5 mt-7">PRESCRIBED PROTOCOL</p>
          {recommendations.map((rec, i) => (
            <div key={i} className="border border-white/[0.04] p-4 border-l-[3px] border-l-scalpel">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="font-mono text-[11px] font-bold text-scalpel bg-scalpel/[0.08] px-2 py-0.5">RX-{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[14px] font-semibold text-fg-bright">{rec.title}</span>
              </div>
              <p className="text-[12px] text-fg-muted leading-relaxed ml-[50px]">
                {rec.description}{' '}
                <span className="font-mono text-[11px] text-scalpel">{rec.expected_improvement}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Personal Rules */}
      {isPartialReport && <SkeletonSection label="Writing personal betting rules from your data..." />}
      {!isPartialReport && (analysis.personal_rules ?? []).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] text-fg-dim tracking-[3px]">SEC. 10</span>
              <h2 className="font-bold text-2xl">Your Rules</h2>
            </div>
            <button
              onClick={() => {
                const text = (analysis.personal_rules ?? [])
                  .map((r: PersonalRule, i: number) => `${i + 1}. ${r.rule}\n   Why: ${r.reason}`)
                  .join('\n\n');
                navigator.clipboard.writeText(text);
              }}
              className="text-xs text-fg-muted hover:text-scalpel transition-colors"
            >
              Copy Rules
            </button>
          </div>
          <div className="space-y-3">
            {(analysis.personal_rules ?? []).map((rule: PersonalRule, i: number) => (
              <div key={i} className="card border-l-4 border-l-scalpel bg-surface/60 p-5">
                <p className="text-fg-bright font-medium mb-2">{rule.rule}</p>
                <p className="text-fg-muted text-sm mb-2">{rule.reason}</p>
                <p className="text-fg-dim text-xs">Based on: {rule.based_on}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
