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

function fillColor(score: number): string {
  if (score >= 70) return '#00C9A7'; // scalpel
  if (score >= 40) return '#D29922'; // caution (brand-correct)
  return '#F85149'; // loss (brand-correct)
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Developing';
  if (score >= 40) return 'Needs work';
  return 'Critical';
}

/** Trend sparkline — teal stroke, subtle fill, fixed-width inline glyph. */
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 18;
  const w = 72;
  const step = w / (data.length - 1);

  const coords = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });

  const linePoints = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const last = coords[coords.length - 1];

  return (
    <svg width={w} height={h} className="shrink-0 block">
      <polyline
        points={linePoints}
        fill="none"
        stroke="#00C9A7"
        strokeWidth="1.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <circle cx={last[0]} cy={last[1]} r="1.5" fill="#00C9A7" />
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
        setHistory(data.map((d: Record<string, unknown>) => d.score as number));
      }
    }
    loadHistory();
  }, []);

  if (currentScore === null) return null;

  const score = currentScore;
  const delta = previousScore !== null ? score - previousScore : null;

  return (
    <div>
      {/* Top meta row */}
      <div className="flex items-baseline justify-between mb-5">
        <p className="case-header case-header-teal">DISCIPLINE SCORE</p>
        <p className="case-header">
          {reportCount} REPORT{reportCount !== 1 ? 'S' : ''}
        </p>
      </div>

      {/* Number + status + delta — single baseline */}
      <div className="flex items-baseline gap-4 mb-5 flex-wrap">
        <span className="data-number text-[56px] text-fg-bright leading-none tracking-tight">
          {mask(score.toString())}
        </span>
        <span className="data-number text-sm text-fg-dim">/100</span>
        <span className={`data-number text-xs uppercase tracking-[2px] ${scoreColor(score)}`}>
          {scoreLabel(score)}
        </span>
        {delta !== null && delta !== 0 && (
          <span className={`data-number text-sm tracking-tight ml-auto ${delta > 0 ? 'change-up' : 'change-down'}`}>
            {delta > 0 ? '↑ +' : '↓ '}{delta} pts
          </span>
        )}
        {delta === 0 && (
          <span className="data-number text-xs text-fg-dim ml-auto tracking-wider">— NO CHANGE</span>
        )}
      </div>

      {/* Linear gauge — full width, ticks at 25/50/75 */}
      <div className="relative h-[6px] bg-tier-2 mb-2">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: fillColor(score) }}
        />
        {/* Tick marks */}
        <span className="absolute top-0 left-1/4 w-px h-full bg-white/[0.06]" />
        <span className="absolute top-0 left-1/2 w-px h-full bg-white/[0.06]" />
        <span className="absolute top-0 left-3/4 w-px h-full bg-white/[0.06]" />
      </div>

      {/* Scale labels under gauge */}
      <div className="relative h-3 mb-5">
        <span className="absolute left-0 case-header">0</span>
        <span className="absolute left-1/4 -translate-x-1/2 case-header">25</span>
        <span className="absolute left-1/2 -translate-x-1/2 case-header">50</span>
        <span className="absolute left-3/4 -translate-x-1/2 case-header">75</span>
        <span className="absolute right-0 case-header">100</span>
      </div>

      {/* Trend row — only if we have history */}
      {history.length >= 2 && (
        <div className="flex items-center gap-3 pt-4 border-t border-white/[0.04]">
          <p className="case-header">TREND</p>
          <Sparkline data={history} />
          <p className="case-header ml-auto">
            {history.length} SAMPLE{history.length !== 1 ? 'S' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
