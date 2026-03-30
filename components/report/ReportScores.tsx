import { emotionLabel, gradeColor } from '@/lib/report-helpers';
import type { AutopsyAnalysis } from '@/types';

interface ReportScoresProps {
  analysis: AutopsyAnalysis;
  emotionScore: number;
}

export default function ReportScores({ analysis, emotionScore }: ReportScoresProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.04] border border-white/[0.04] mb-6">
      <div className="bg-base p-[18px]">
        <div className="flex justify-between items-baseline mb-2.5">
          <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px]">EMOTION SCORE</span>
          <span className={`font-mono text-[22px] font-bold ${
            emotionScore <= 25 ? 'text-win' : emotionScore <= 50 ? 'text-caution' : emotionScore <= 75 ? 'text-orange-400' : 'text-loss'
          }`}>{emotionScore}</span>
        </div>
        <div className="h-1 bg-surface-raised relative">
          <div className="h-full" style={{ width: `${emotionScore}%`, background: 'linear-gradient(90deg, #00C9A7, #D29922, #E8453C)' }} />
          <div className="absolute -top-1 w-0.5 h-3 bg-fg-bright" style={{ left: `${emotionScore}%` }} />
        </div>
        <p className="font-mono text-[10px] text-fg-muted mt-2">{emotionLabel(emotionScore).split('.')[0]}</p>
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
          <div className="h-1 bg-surface-raised relative">
            <div className="h-full" style={{ width: `${analysis.discipline_score.total}%`, background: analysis.discipline_score.total >= 51 ? 'linear-gradient(90deg, #D29922, #00C9A7)' : 'linear-gradient(90deg, #E8453C, #D29922)' }} />
            <div className="absolute -top-1 w-0.5 h-3 bg-fg-bright" style={{ left: `${analysis.discipline_score.total}%` }} />
          </div>
          <p className="font-mono text-[10px] text-fg-muted mt-2">Process consistency {analysis.discipline_score.total >= 51 ? 'moderate' : 'is low'}</p>
          {analysis.discipline_score.percentile && (
            <p className="font-mono text-[10px] text-scalpel mt-1">Better than {analysis.discipline_score.percentile}% of bettors</p>
          )}
        </div>
      ) : (
        <div className="bg-base p-[18px]">
          <div className="flex justify-between items-baseline mb-2.5">
            <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px]">OVERALL GRADE</span>
            <span className={`font-mono text-[22px] font-bold ${gradeColor(analysis.summary.overall_grade)}`}>{analysis.summary.overall_grade}</span>
          </div>
          <p className="font-mono text-[10px] text-fg-muted mt-2">Combines ROI, discipline, and emotional control</p>
        </div>
      )}
    </div>
  );
}
