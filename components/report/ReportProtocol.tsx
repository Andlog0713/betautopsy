'use client';

import { SkeletonSection } from '@/lib/report-helpers';
import type { AutopsyAnalysis, PersonalRule } from '@/types';

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
            Measures how consistently you&apos;re building better betting habits — tracking, sizing, emotional control, and strategic focus.
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
              { label: 'Control', val: analysis.discipline_score.control, hint: 'Tied to your emotion score — staying cool means more control' },
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
                Weakest area: <span className="text-fg-bright">{weakest.name} ({weakest.val}/25)</span> — {tips[weakest.name]}
              </p>
            );
          })()}
        </div>
      )}
    </>
  );
}
