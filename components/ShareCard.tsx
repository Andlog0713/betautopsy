'use client';

import { forwardRef } from 'react';
import type { Bet } from '@/types';
import type { RoastStat } from '@/lib/share-helpers';

export interface ShareCardData {
  grade: string;
  emotion_score: number;
  roi_percent: number;
  win_rate?: number;
  total_bets: number;
  record: string;
  best_edge: { category: string; roi: number } | null;
  biggest_leak: { category: string; roi: number } | null;
  sharp_score: number | null;
  archetype: { name: string; description: string } | null;
  discipline_score?: number | null;
  streak_count?: number;
  date_range?: string;
  parlay_percent?: number;
  bets?: Bet[];
}

function gradeColor(g: string): string {
  if (g.startsWith('A')) return '#00C9A7';
  if (g.startsWith('B')) return '#fbbf24';
  if (g.startsWith('C')) return '#f97316';
  return '#f87171';
}

function emotionColor(s: number): string {
  if (s <= 30) return '#00C9A7';
  if (s <= 55) return '#fbbf24';
  if (s <= 75) return '#f97316';
  return '#f87171';
}

function emotionLabel(s: number): string {
  if (s <= 20) return 'Ice cold';
  if (s <= 40) return 'Composed';
  if (s <= 60) return 'Reactive';
  if (s <= 80) return 'Tilted';
  return 'On fire';
}

function getSignatureStat(data: ShareCardData): { label: string; value: string } | null {
  // Pick the single most interesting non-dollar stat
  if (data.best_edge && data.best_edge.roi > 5) {
    return { label: 'Best edge', value: `${data.best_edge.category} at +${data.best_edge.roi.toFixed(0)}% ROI` };
  }
  if (data.biggest_leak && data.biggest_leak.roi < -10) {
    return { label: 'Biggest leak', value: `${data.biggest_leak.category} at ${data.biggest_leak.roi.toFixed(0)}% ROI` };
  }
  if ((data.parlay_percent ?? 0) > 50) {
    return { label: 'Parlay rate', value: `${Math.round(data.parlay_percent!)}% of all bets` };
  }
  if ((data.win_rate ?? 0) > 55) {
    return { label: 'Win rate', value: `${(data.win_rate!).toFixed(1)}% across ${data.total_bets} bets` };
  }
  if (data.sharp_score !== null && data.sharp_score > 60) {
    return { label: 'Sharp score', value: `${data.sharp_score}/100` };
  }
  return null;
}

const ARCHETYPE_ACCENT: Record<string, string> = {
  'The Natural': '#00C9A7',
  'Sharp Sleeper': '#00C9A7',
  'Heated Bettor': '#f97316',
  'Chalk Grinder': '#fbbf24',
  'Parlay Dreamer': '#8b5cf6',
  'Sniper': '#60a5fa',
  'Volume Warrior': '#a78bfa',
  'Degen King': '#f87171',
  'The Grinder': '#94a3b8',
  'Multiplier Chaser': '#8b5cf6',
  'All-or-Nothing Player': '#f97316',
  'Loyalty Bettor': '#60a5fa',
};

const S = {
  mono: { fontFamily: "'JetBrains Mono', monospace" } as React.CSSProperties,
  label: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#515968' } as React.CSSProperties,
};

const ShareCard = forwardRef<HTMLDivElement, { data: ShareCardData; roastStats?: RoastStat[] }>(({ data, roastStats = [] }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';
  const accent = ARCHETYPE_ACCENT[archName] ?? '#94a3b8';
  const gc = gradeColor(data.grade);
  const ec = emotionColor(data.emotion_score);
  const sig = getSignatureStat(data);

  return (
    <div
      ref={ref}
      style={{
        width: 440,
        padding: '36px 32px 28px',
        background: '#111318',
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: '#F0F2F5',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle accent glow */}
      <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 300, height: 200, background: accent, opacity: 0.04, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>

        {/* Logo — small, top-left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
          <svg width="14" height="22" viewBox="0 0 18 28" fill="none">
            <path d="M2,2 Q3.8,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
            <path d="M16,2 Q14.2,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
            <line x1="9" y1="8.5" x2="9" y2="26" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="9" cy="8.5" r="1.9" fill="#E8453C"/>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ fontWeight: 900 }}>BET</span><span style={{ fontWeight: 300, color: '#00C9A7' }}>AUTOPSY</span>
          </div>
        </div>

        {/* Archetype — the hero */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...S.label, marginBottom: 8 }}>YOUR BETTING PERSONALITY</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: accent, lineHeight: 1.15, marginBottom: 6 }}>{archName}</div>
          {data.archetype?.description && (
            <div style={{ fontSize: 12, color: '#848D9A', lineHeight: 1.5, maxWidth: 340 }}>{data.archetype.description}</div>
          )}
        </div>

        {/* Three scores — lab result strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '14px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ ...S.label, marginBottom: 6 }}>GRADE</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: gc, lineHeight: 1 }}>{data.grade}</div>
          </div>
          <div style={{ padding: '14px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ ...S.label, marginBottom: 6 }}>EMOTION</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: ec, lineHeight: 1 }}>{data.emotion_score}</div>
            <div style={{ fontSize: 9, color: '#515968', marginTop: 4 }}>{emotionLabel(data.emotion_score)}</div>
          </div>
          <div style={{ padding: '14px 12px', textAlign: 'center' }}>
            <div style={{ ...S.label, marginBottom: 6 }}>WIN RATE</div>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{(data.win_rate ?? 0).toFixed(0)}%</div>
          </div>
        </div>

        {/* Signature stat — one standout insight */}
        {sig && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...S.label, margin: 0 }}>{sig.label}</span>
            <span style={{ ...S.mono, fontSize: 12, color: '#F0F2F5' }}>{sig.value}</span>
          </div>
        )}

        {/* Roast stats — the shareability engine */}
        {roastStats.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...S.label, color: '#fbbf24', marginBottom: 10 }}>THE RECEIPTS</div>
            {roastStats.slice(0, 2).map((stat, i) => (
              <div key={i} style={{ fontSize: 12, color: '#A0A8B4', lineHeight: 1.5, marginBottom: 6 }}>
                {stat.emoji} {stat.text}
              </div>
            ))}
          </div>
        )}

        {/* Bottom — record + CTA */}
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...S.mono, fontSize: 10, color: '#515968' }}>
              {data.record} · {data.total_bets} bets{data.date_range ? ` · ${data.date_range}` : ''}
            </div>
            {data.streak_count && data.streak_count >= 3 && (
              <div style={{ ...S.mono, fontSize: 10, color: '#00C9A7' }}>{data.streak_count}w streak</div>
            )}
          </div>
          <div style={{ ...S.mono, fontSize: 10, color: '#515968', marginTop: 10, textAlign: 'center' }}>
            betautopsy.com
          </div>
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;
