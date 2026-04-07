'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  /** Current score from latest progress snapshot. */
  currentScore: number | null;
  /** Previous score from second-latest snapshot. */
  previousScore: number | null;
  /** Total number of reports the user has run. */
  reportCount: number;
  /** Privacy mask function. */
  mask: (val: string) => string;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-win';
  if (score >= 40) return 'text-caution';
  return 'text-loss';
}

function strokeColor(score: number): string {
  if (score >= 70) return '#00C9A7';
  if (score >= 40) return '#B8944A';
  return '#C4463A';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Developing';
  if (score >= 40) return 'Needs work';
  return 'Critical';
}

/** Tiny inline sparkline from an array of scores. */
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 80;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const lastScore = data[data.length - 1];
  const color = strokeColor(lastScore);

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {/* Dot on the last point */}
      <circle
        cx={data.length > 1 ? (data.length - 1) * step : 0}
        cy={h - ((lastScore - min) / range) * (h - 4) - 2}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export default function DisciplineScoreCard({ currentScore, previousScore, reportCount, mask }: Props) {
  const [history, setHistory] = useState<number[]>([]);

  // Fetch historical discipline scores for sparkline
  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('discipline_scores')
        .select('score, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(10);

      if (data && data.length > 0) {
        setHistory(data.map((d) => d.score as number));
      }
    }
    loadHistory();
  }, []);

  if (currentScore === null) return null;

  const score = currentScore;
  const delta = previousScore !== null ? score - previousScore : null;
  const circumference = 2 * Math.PI * 52; // r=52
  const dashLength = (score / 100) * circumference;

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-md p-6">
      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Ring */}
        <div className="relative shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-2" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={strokeColor(score)}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${dashLength} ${circumference}`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-bold text-fg-bright">{mask(score.toString())}</span>
            <span className="text-[10px] text-fg-dim font-mono">/100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="font-semibold text-xl mb-0.5 text-fg-bright">Discipline Score</h2>
          <p className={`text-xs font-medium ${scoreColor(score)}`}>{scoreLabel(score)}</p>

          {/* Delta + sparkline row */}
          <div className="flex items-center gap-3 mt-3 justify-center sm:justify-start">
            {delta !== null && delta !== 0 && (
              <span className={`flex items-center gap-1 text-sm font-mono ${delta > 0 ? 'text-win' : 'text-loss'}`}>
                {delta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {delta > 0 ? '+' : ''}{delta} pts
              </span>
            )}
            {delta === 0 && (
              <span className="flex items-center gap-1 text-sm font-mono text-fg-muted">
                <Minus size={14} />
                No change
              </span>
            )}
            {history.length >= 2 && <Sparkline data={history} />}
          </div>

          {/* Subtitle */}
          <p className="text-fg-dim text-xs mt-2">
            Based on {reportCount} report{reportCount !== 1 ? 's' : ''}
            {reportCount === 1 && '. Run another to see your trend.'}
          </p>
        </div>
      </div>
    </div>
  );
}
