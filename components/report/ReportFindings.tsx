import Link from 'next/link';
import { leakToQuery, formatCategoryLabel } from '@/lib/report-helpers';
import type { AutopsyAnalysis } from '@/types';

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

interface ReportFindingsProps {
  analysis: AutopsyAnalysis;
  tier: 'free' | 'pro' | 'sharp';
  isPartialReport: boolean;
}

export default function ReportFindings({ analysis, tier, isPartialReport }: ReportFindingsProps) {
  const { biases_detected, strategic_leaks } = analysis;

  return (
    <>
      {/* FINDINGS — matching mockup exactly */}
      {biases_detected.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] text-fg-dim tracking-[3px] mb-2.5">FINDINGS</p>
          <div className="grid gap-2">
            {biases_detected.map((bias, i) => {
              const sevColor = bias.severity === 'critical' || bias.severity === 'high' ? 'bleed' : bias.severity === 'medium' ? 'caution' : 'win';
              return (
              <div key={i} className={`border border-white/[0.04] p-[18px] border-l-[3px] ${sevColor === 'bleed' ? 'border-l-bleed' : sevColor === 'caution' ? 'border-l-caution' : 'border-l-win'}`}>
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
                    <p className="text-[12px] text-fg-muted leading-relaxed mb-2.5">{bias.description}</p>
                    {bias.fix && (
                      <p className="text-[11px] text-fg-dim mb-2.5"><span className="text-scalpel font-mono">RX:</span> {bias.fix}</p>
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

      {/* ── Sport-Specific Findings — Pro/Sharp only ── */}
      {(tier === 'pro' || tier === 'sharp') && analysis.sport_specific_findings && analysis.sport_specific_findings.length > 0 && (
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
              <p className="text-fg-muted text-sm leading-relaxed mb-2">{finding.description}</p>
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
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-fg-dim tracking-[3px]">SEC. 4</span>
            <h2 className="font-bold text-2xl">Strategic Leaks</h2>
          </div>
          <p className="text-fg-dim text-xs italic -mt-2">Specific bet types or sports where you&apos;re consistently losing money.</p>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04]">
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
                    <tr key={i} className="border-b border-white/[0.04]">
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
    </>
  );
}
