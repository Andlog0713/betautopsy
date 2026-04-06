'use client';

import { forwardRef } from 'react';
import type { ShareCardData } from './ShareCard';
import type { RoastStat } from '@/lib/share-helpers';

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

const ShareCardStories = forwardRef<HTMLDivElement, { data: ShareCardData; roastStats: RoastStat[] }>(({ data, roastStats }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';
  const accent = ARCHETYPE_ACCENT[archName] ?? '#94a3b8';
  const gc = gradeColor(data.grade);
  const ec = emotionColor(data.emotion_score);

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        background: '#111318',
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: '#F0F2F5',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '100px 80px 80px',
      }}
    >
      {/* Accent glow behind archetype */}
      <div style={{ position: 'absolute', top: 200, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: accent, opacity: 0.05, borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 80 }}>
          <svg width="36" height="54" viewBox="0 0 18 28" fill="none">
            <path d="M2,2 Q3.8,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
            <path d="M16,2 Q14.2,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
            <line x1="9" y1="8.5" x2="9" y2="26" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="9" cy="8.5" r="1.9" fill="#E8453C"/>
          </svg>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 2 }}>
            <span style={{ fontWeight: 900 }}>BET</span><span style={{ fontWeight: 300, color: '#00C9A7' }}>AUTOPSY</span>
          </div>
        </div>

        {/* Archetype — dominant hero section */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, letterSpacing: 4, textTransform: 'uppercase' as const, color: '#515968', marginBottom: 20 }}>YOUR BETTING PERSONALITY</div>
          <div style={{ fontSize: 84, fontWeight: 800, color: accent, lineHeight: 1.1, marginBottom: 20 }}>{archName}</div>
          {data.archetype?.description && (
            <div style={{ fontSize: 28, color: '#848D9A', lineHeight: 1.5, maxWidth: 800 }}>{data.archetype.description}</div>
          )}
        </div>

        {/* Three scores — lab result strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginBottom: 64, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '36px 24px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#515968', marginBottom: 12 }}>GRADE</div>
            <div style={{ fontSize: 80, fontWeight: 800, color: gc, lineHeight: 1 }}>{data.grade}</div>
          </div>
          <div style={{ padding: '36px 24px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#515968', marginBottom: 12 }}>EMOTION</div>
            <div style={{ fontSize: 80, fontWeight: 800, color: ec, lineHeight: 1 }}>{data.emotion_score}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: '#515968', marginTop: 8 }}>{emotionLabel(data.emotion_score)}</div>
          </div>
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#515968', marginBottom: 12 }}>WIN RATE</div>
            <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1 }}>{(data.win_rate ?? 0).toFixed(0)}%</div>
          </div>
        </div>

        {/* Signature stats — edge + leak side by side if both exist */}
        {(data.best_edge || data.biggest_leak) && (
          <div style={{ display: 'grid', gridTemplateColumns: (data.best_edge && data.biggest_leak) ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 64 }}>
            {data.best_edge && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '28px 24px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#00C9A7', marginBottom: 12 }}>BEST EDGE</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{data.best_edge.category}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: '#00C9A7' }}>+{data.best_edge.roi.toFixed(1)}% ROI</div>
              </div>
            )}
            {data.biggest_leak && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '28px 24px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#f87171', marginBottom: 12 }}>BIGGEST LEAK</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{data.biggest_leak.category}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: '#f87171' }}>{data.biggest_leak.roi.toFixed(1)}% ROI</div>
              </div>
            )}
          </div>
        )}

        {/* Roast stats — the shareability engine */}
        {roastStats.length > 0 && (
          <div style={{ marginBottom: 64 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#fbbf24', marginBottom: 24 }}>THE RECEIPTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {roastStats.map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', padding: '20px 24px', fontSize: 24, color: '#A0A8B4', lineHeight: 1.5 }}>
                  {stat.emoji} {stat.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom — record + CTA */}
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: '#515968' }}>
              {data.record} · {data.total_bets} bets{data.date_range ? ` · ${data.date_range}` : ''}
            </div>
            {data.streak_count && data.streak_count >= 3 && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: '#00C9A7' }}>{data.streak_count}w streak</div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, color: '#F0F2F5', fontWeight: 700 }}>Get your autopsy report</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#00C9A7', marginTop: 8 }}>betautopsy.com</div>
          </div>
        </div>
      </div>
    </div>
  );
});

ShareCardStories.displayName = 'ShareCardStories';
export default ShareCardStories;
