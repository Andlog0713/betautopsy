'use client';

import Link from 'next/link';
import AutopsyReport from '@/components/AutopsyReport';
import type { AutopsyAnalysis } from '@/types';

interface ShareData {
  grade: string;
  emotion_score: number;
  roi_percent: number;
  total_bets: number;
  record: string;
  best_edge: { category: string; roi: number } | null;
  biggest_leak: { category: string; roi: number } | null;
  sharp_score: number | null;
  archetype: { name: string; description: string } | null;
  date: string;
  report_json?: unknown;
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-mint-500';
  if (grade.startsWith('B')) return 'text-mint-500/70';
  if (grade.startsWith('C')) return 'text-amber-400';
  if (grade.startsWith('D')) return 'text-orange-400';
  return 'text-red-400';
}

export default function SharedReport({ data }: { data: ShareData }) {
  const hasFullReport = !!data.report_json;

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <span className="font-bold text-xl">
              Bet<span className="text-flame-500">Autopsy</span>
            </span>
          </Link>
          {data.archetype && (
            <div>
              <p className="text-flame-500 font-bold text-lg">{data.archetype.name}</p>
              <p className="text-ink-600 text-xs">{data.archetype.description}</p>
            </div>
          )}
          <p className="text-ink-700 text-xs">
            Generated {new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Full report */}
        {hasFullReport ? (
          <AutopsyReport
            analysis={data.report_json as AutopsyAnalysis}
            tier="free"
            readOnly
          />
        ) : (
          /* Fallback: card-only view for old share tokens */
          <div className="max-w-md mx-auto card p-8 space-y-6">
            <div className="text-center">
              <p className="text-ink-600 text-xs uppercase tracking-wider mb-1">Overall Grade</p>
              <span className={`font-bold text-7xl ${gradeColor(data.grade)}`}>
                {data.grade}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-ink-600 text-xs">Emotion Score</p>
                <p className="font-mono text-lg font-semibold text-[#F0F0F0]">{data.emotion_score}/100</p>
              </div>
              <div className="text-center">
                <p className="text-ink-600 text-xs">ROI</p>
                <p className={`font-mono text-lg font-semibold ${data.roi_percent >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                  {data.roi_percent >= 0 ? '+' : ''}{data.roi_percent.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-ink-600 text-xs">Record</p>
                <p className="font-mono text-lg font-semibold text-[#F0F0F0]">{data.record}</p>
              </div>
              <div className="text-center">
                <p className="text-ink-600 text-xs">Total Bets</p>
                <p className="font-mono text-lg font-semibold text-[#F0F0F0]">{data.total_bets}</p>
              </div>
            </div>

            {(data.best_edge || data.biggest_leak) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
                {data.best_edge && (
                  <div className="text-center">
                    <p className="text-ink-600 text-xs">Best Edge</p>
                    <p className="text-mint-500 text-sm font-medium">{data.best_edge.category}</p>
                    <p className="font-mono text-xs text-mint-500">+{data.best_edge.roi.toFixed(1)}%</p>
                  </div>
                )}
                {data.biggest_leak && (
                  <div className="text-center">
                    <p className="text-ink-600 text-xs">Biggest Leak</p>
                    <p className="text-red-400 text-sm font-medium">{data.biggest_leak.category}</p>
                    <p className="font-mono text-xs text-red-400">{data.biggest_leak.roi.toFixed(1)}%</p>
                  </div>
                )}
              </div>
            )}

            {data.sharp_score !== null && (
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-ink-600 text-xs">Sharp Score</p>
                  <p className="font-mono text-sm text-cyan-400">{data.sharp_score}/100</p>
                </div>
                <div className="h-2 bg-ink-900 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${data.sharp_score}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-4 pt-4">
          <Link href="/signup" className="btn-primary inline-block">
            Get Your Own Autopsy — Free
          </Link>
          <p className="text-ink-700 text-xs">
            BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
