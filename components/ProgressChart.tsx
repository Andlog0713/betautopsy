'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { ProgressSnapshot } from '@/types';

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: null },
] as const;

export default function ProgressChart({ snapshots }: { snapshots: ProgressSnapshot[] }) {
  const [range, setRange] = useState<number | null>(null);

  const data = useMemo(() => {
    const cutoff = range ? Date.now() - range * 86400000 : 0;
    return snapshots
      .filter((s) => !range || new Date(s.snapshot_date).getTime() >= cutoff)
      .map((s) => ({
        date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        emotion: s.tilt_score,
        roi: s.roi_percent,
      }));
  }, [snapshots, range]);

  return (
    <div className="card p-5">
      {/* Header + range selector */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-fg-bright">Performance Trend</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                range === r.days
                  ? 'bg-surface-2 text-fg-bright'
                  : 'text-fg-dim hover:text-fg-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="min-h-[280px]">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="emotionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00C9A7" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#00C9A7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B8944A" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#B8944A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <YAxis
              yAxisId="emotion"
              orientation="left"
              tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              reversed
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="roi"
              orientation="right"
              tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-surface-3 border border-border-subtle rounded-sm p-3 text-xs">
                    <p className="text-fg-dim mb-1">{label}</p>
                    {payload.map((p) => (
                      <p key={p.dataKey as string} className="font-mono text-fg-bright">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
                        {p.dataKey === 'emotion' ? `Emotion: ${p.value}` : `ROI: ${p.value}%`}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <ReferenceLine yAxisId="roi" y={0} stroke="rgba(255,255,255,0.06)" />
            <Area yAxisId="emotion" type="monotone" dataKey="emotion" stroke="none" fill="url(#emotionFill)" />
            <Area yAxisId="roi" type="monotone" dataKey="roi" stroke="none" fill="url(#roiFill)" />
            <Line yAxisId="emotion" type="monotone" dataKey="emotion" stroke="#00C9A7" strokeWidth={2} dot={false} />
            <Line yAxisId="roi" type="monotone" dataKey="roi" stroke="#B8944A" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center mt-3 text-xs text-fg-dim">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#00C9A7] inline-block rounded" /> Emotion Score (lower is better)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#B8944A] inline-block rounded" /> ROI %</span>
      </div>
    </div>
  );
}
