'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { calculateMetrics } from '@/lib/autopsy-engine';
import type { Bet, Upload } from '@/types';

interface UploadAnalysis {
  upload: Upload;
  bets: Bet[];
  record: string;
  winRate: number;
  roi: number;
  netPnL: number;
  avgStake: number;
  emotionScore: number;
  parlayPct: number;
  parlayRoi: number;
  topProfitable: { cat: string; roi: number; count: number }[];
  topUnprofitable: { cat: string; roi: number; count: number }[];
}

function analyzeUpload(upload: Upload, bets: Bet[]): UploadAnalysis {
  const m = calculateMetrics(bets);
  const catRoi = m.category_roi.filter((c) => !c.category.includes(' ')); // only single-dimension categories
  const profitable = catRoi.filter((c) => c.roi > 0).sort((a, b) => b.roi - a.roi).slice(0, 3);
  const unprofitable = catRoi.filter((c) => c.roi < 0).sort((a, b) => a.roi - b.roi).slice(0, 3);

  return {
    upload,
    bets,
    record: m.summary.record,
    winRate: m.summary.win_rate,
    roi: m.summary.roi_percent,
    netPnL: m.summary.total_profit,
    avgStake: m.summary.avg_stake,
    emotionScore: m.emotion_score,
    parlayPct: m.parlay_stats.parlay_percent,
    parlayRoi: m.parlay_stats.parlay_roi,
    topProfitable: profitable.map((c) => ({ cat: c.category, roi: c.roi, count: c.count })),
    topUnprofitable: unprofitable.map((c) => ({ cat: c.category, roi: c.roi, count: c.count })),
  };
}

function CompareMetric({ label, a, b, suffix, lowerBetter }: { label: string; a: number; b: number; suffix?: string; lowerBetter?: boolean }) {
  const s = suffix ?? '';
  const aWins = lowerBetter ? a < b : a > b;
  const bWins = lowerBetter ? b < a : b > a;
  const same = Math.abs(a - b) < 0.1;
  return (
    <tr className="border-b border-white/[0.04]">
      <td className={`px-4 py-3 text-right font-mono ${!same && aWins ? 'text-win' : !same && bWins ? 'text-loss' : 'text-fg-bright'}`}>
        {a >= 0 && suffix === '$' ? '+' : ''}{suffix === '$' ? `$${Math.round(a).toLocaleString()}` : `${a.toFixed(1)}${s}`}
      </td>
      <td className="px-4 py-3 text-center text-fg-muted text-sm">{label}</td>
      <td className={`px-4 py-3 font-mono ${!same && bWins ? 'text-win' : !same && aWins ? 'text-loss' : 'text-fg-bright'}`}>
        {b >= 0 && suffix === '$' ? '+' : ''}{suffix === '$' ? `$${Math.round(b).toLocaleString()}` : `${b.toFixed(1)}${s}`}
      </td>
    </tr>
  );
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [a, setA] = useState<UploadAnalysis | null>(null);
  const [b, setB] = useState<UploadAnalysis | null>(null);
  const [tier, setTier] = useState('free');

  useEffect(() => {
    async function load() {
      const idA = searchParams.get('a');
      const idB = searchParams.get('b');
      if (!idA || !idB) return;

      const supabase = createClient();

      // Check tier
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
        if (profile) setTier(profile.subscription_tier);
      }
      const [uploadA, uploadB, betsA, betsB] = await Promise.all([
        supabase.from('uploads').select('*').eq('id', idA).single(),
        supabase.from('uploads').select('*').eq('id', idB).single(),
        supabase.from('bets').select('*').eq('upload_id', idA).order('placed_at', { ascending: true }),
        supabase.from('bets').select('*').eq('upload_id', idB).order('placed_at', { ascending: true }),
      ]);

      if (uploadA.data && uploadB.data) {
        setA(analyzeUpload(uploadA.data as Upload, (betsA.data ?? []) as Bet[]));
        setB(analyzeUpload(uploadB.data as Upload, (betsB.data ?? []) as Bet[]));
      }
      setLoading(false);
    }
    load();
  }, [searchParams]);

  if (!loading && tier === 'free') {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link href="/uploads" className="text-sm text-fg-muted hover:text-fg transition-colors">← Back to Uploads</Link>
        <div className="card border-scalpel/20 bg-scalpel-muted p-8 text-center space-y-4">
          <h2 className="font-bold text-2xl">Upload Comparison</h2>
          <p className="text-fg-muted text-sm max-w-md mx-auto">
            Compare how you perform across different sportsbooks, time periods, or bet sources.
            Available with Pro subscription.
          </p>
          <Link href="/pricing" className="btn-primary inline-block text-sm">Go Pro — $19.99/mo</Link>
        </div>
      </div>
    );
  }

  if (loading || !a || !b) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-surface rounded-none" />
        <div className="h-64 bg-surface rounded-none" />
      </div>
    );
  }

  const nameA = a.upload.display_name || a.upload.filename || 'Upload A';
  const nameB = b.upload.display_name || b.upload.filename || 'Upload B';
  const roiDiff = Math.abs(a.roi - b.roi);
  const betterUpload = a.roi > b.roi ? nameA : nameB;
  const worseUpload = a.roi > b.roi ? nameB : nameA;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/uploads" className="text-sm text-fg-muted hover:text-fg transition-colors">
        ← Back to Uploads
      </Link>

      <h1 className="font-bold text-xl">Compare Uploads</h1>

      {/* Summary */}
      {roiDiff > 0.5 && (
        <div className="card border-scalpel/20 bg-scalpel-muted p-5">
          <p className="text-fg-bright text-sm">
            Your <span className="font-medium">{betterUpload}</span> bets are outperforming{' '}
            <span className="font-medium">{worseUpload}</span> by{' '}
            <span className="font-mono text-win">{roiDiff.toFixed(1)}%</span> ROI.
          </p>
        </div>
      )}

      {/* Comparison table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="text-right text-fg-muted font-medium px-4 py-3 w-1/3">
                <div className="truncate">{nameA}</div>
                <div className="text-xs font-normal">{a.bets.length} bets</div>
              </th>
              <th className="text-center text-fg-dim font-medium px-4 py-3">Metric</th>
              <th className="text-left text-fg-muted font-medium px-4 py-3 w-1/3">
                <div className="truncate">{nameB}</div>
                <div className="text-xs font-normal">{b.bets.length} bets</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.04]">
              <td className="px-4 py-3 text-right font-mono text-fg-bright">{a.record}</td>
              <td className="px-4 py-3 text-center text-fg-muted text-sm">Record</td>
              <td className="px-4 py-3 font-mono text-fg-bright">{b.record}</td>
            </tr>
            <CompareMetric label="Win Rate" a={a.winRate} b={b.winRate} suffix="%" />
            <CompareMetric label="ROI" a={a.roi} b={b.roi} suffix="%" />
            <CompareMetric label="Net P&L" a={a.netPnL} b={b.netPnL} suffix="$" />
            <CompareMetric label="Avg Stake" a={a.avgStake} b={b.avgStake} suffix="$" />
            <CompareMetric label="Emotion Score" a={a.emotionScore} b={b.emotionScore} lowerBetter />
            <CompareMetric label="Parlay %" a={a.parlayPct} b={b.parlayPct} suffix="%" lowerBetter />
            <CompareMetric label="Parlay ROI" a={a.parlayRoi} b={b.parlayRoi} suffix="%" />
          </tbody>
        </table>
      </div>

      {/* Category breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {[{ data: a, name: nameA }, { data: b, name: nameB }].map(({ data: d, name }) => (
          <div key={name} className="space-y-3">
            <h3 className="font-medium text-sm">{name}</h3>
            {d.topProfitable.length > 0 && (
              <div className="card p-4">
                <p className="text-xs text-win mb-2">Top profitable</p>
                {d.topProfitable.map((c) => (
                  <div key={c.cat} className="flex justify-between text-xs py-1">
                    <span className="text-fg-bright">{c.cat}</span>
                    <span className="font-mono text-win">+{c.roi.toFixed(1)}% ({c.count})</span>
                  </div>
                ))}
              </div>
            )}
            {d.topUnprofitable.length > 0 && (
              <div className="card p-4">
                <p className="text-xs text-loss mb-2">Top leaks</p>
                {d.topUnprofitable.map((c) => (
                  <div key={c.cat} className="flex justify-between text-xs py-1">
                    <span className="text-fg-bright">{c.cat}</span>
                    <span className="font-mono text-loss">{c.roi.toFixed(1)}% ({c.count})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
