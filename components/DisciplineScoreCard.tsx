'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

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

/** Tiny inline sparkline — teal stroke with 0.1 opacity teal fill underneath. */
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 96;
  const step = w / (data.length - 1);

  const coords = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });

  const linePoints = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const fillPath = `M ${coords[0][0]},${h} L ${coords.map(([x, y]) => `${x},${y}`).join(' L ')} L ${coords[coords.length - 1][0]},${h} Z`;

  const last = coords[coords.length - 1];

  return (
    <svg width={w} height={h} className="shrink-0">
      <path d={fillPath} fill="#00C9A7" fillOpacity="0.1" />
      <polyline
        points={linePoints}
        fill="none"
        stroke="#00C9A7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill="#00C9A7" />
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
    <div className="card-hero py-8 px-6 sm:px-8">
      <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
        {/* Ring */}
        <div className="relative shrink-0 ring-glow">
          <svg width="128" height="128" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1A2029" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={strokeColor(score)}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${dashLength} ${circumference}`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="data-number text-4xl text-fg-bright leading-none">{mask(score.toString())}</span>
            <span className="data-number text-[10px] text-fg-dim mt-1">/100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <p className="data-label-sm mb-2">Discipline Score</p>
          <p className={`text-xs ${scoreColor(score)}`}>{scoreLabel(score)}</p>

          {/* Delta + sparkline row */}
          <div className="flex items-center gap-4 mt-4 justify-center sm:justify-start">
            {delta !== null && delta !== 0 && (
              <span className={`text-sm ${delta > 0 ? 'change-up' : 'change-down'}`}>
                {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : ''}{delta} pts
              </span>
            )}
            {delta === 0 && (
              <span className="text-sm data-number text-fg-muted">— No change</span>
            )}
            {history.length >= 2 && <Sparkline data={history} />}
          </div>

          {/* Subtitle */}
          <p className="data-body text-xs mt-3 text-fg-dim">
            Based on {reportCount} report{reportCount !== 1 ? 's' : ''}
            {reportCount === 1 && '. Run another to see your trend.'}
          </p>
        </div>
      </div>
    </div>
  );
}
