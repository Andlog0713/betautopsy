'use client';

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { ProgressSnapshot } from '@/types';

export default function ProgressChart({ snapshots }: { snapshots: ProgressSnapshot[] }) {
  const data = snapshots.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tilt: s.tilt_score,
    roi: s.roi_percent,
  }));

  return (
    <div className="card p-6">
      <h2 className="font-bold text-xl mb-4">Progress Over Time</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#5A5C6F20" />
            <XAxis dataKey="date" tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#5A5C6F30' }} />
            <YAxis yAxisId="tilt" orientation="left" tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={false} reversed domain={[0, 100]} />
            <YAxis yAxisId="roi" orientation="right" tick={{ fill: '#A0A3B1', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-ink-800 border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-lg">
                    <p className="text-ink-600">{label}</p>
                    {payload.map((p) => (
                      <p key={p.dataKey as string} style={{ color: p.color }} className="font-mono">
                        {p.dataKey === 'tilt' ? `Emotion: ${p.value}` : `ROI: ${p.value}%`}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <ReferenceLine yAxisId="roi" y={0} stroke="#5A5C6F50" />
            <Line yAxisId="tilt" type="monotone" dataKey="tilt" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, fill: '#fbbf24' }} />
            <Line yAxisId="roi" type="monotone" dataKey="roi" stroke="#00C853" strokeWidth={2} dot={{ r: 4, fill: '#00C853' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-6 justify-center mt-3 text-xs text-ink-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#fbbf24] inline-block rounded" /> Emotion Score (lower is better)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#00C853] inline-block rounded" /> ROI %</span>
      </div>
    </div>
  );
}
