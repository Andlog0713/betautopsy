'use client';

import { forwardRef } from 'react';
import type { ShareCardData } from './ShareCard';
import type { RoastStat } from '@/lib/share-helpers';

const ARCHETYPE_BG: Record<string, string> = {
  'The Natural': 'radial-gradient(ellipse at 30% 20%, rgba(0,200,83,0.08) 0%, transparent 50%)',
  'Heated Bettor': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.07) 0px, transparent 40px, rgba(248,113,113,0.04) 80px)',
  'Parlay Dreamer': 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.08) 0%, transparent 50%)',
  'Chalk Grinder': 'repeating-linear-gradient(0deg, rgba(90,92,111,0.05) 0px, transparent 1px, transparent 20px)',
  'Sharp Sleeper': 'repeating-linear-gradient(0deg, rgba(0,200,83,0.06) 0px, transparent 3px, transparent 14px)',
  'Volume Warrior': 'radial-gradient(circle, rgba(90,92,111,0.06) 1px, transparent 1px)',
  'Sniper': 'linear-gradient(0deg, transparent 48%, rgba(90,92,111,0.06) 48%, rgba(90,92,111,0.06) 52%, transparent 52%)',
  'Degen King': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.08) 0px, transparent 30px, rgba(248,113,113,0.05) 60px)',
  'The Grinder': 'none',
};

function gradeColor(g: string): string {
  if (g.startsWith('A')) return '#00C853';
  if (g.startsWith('B')) return '#fbbf24';
  if (g.startsWith('C')) return '#f97316';
  return '#f87171';
}

function emotionColor(s: number): string {
  if (s <= 30) return '#00C853';
  if (s <= 55) return '#fbbf24';
  if (s <= 75) return '#f97316';
  return '#f87171';
}

const ShareCardStories = forwardRef<HTMLDivElement, { data: ShareCardData; roastStats: RoastStat[] }>(({ data, roastStats }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';
  const archColor = data.archetype ? getArchColor(archName) : '#94a3b8';
  const bgPattern = ARCHETYPE_BG[archName] ?? 'none';
  const gc = gradeColor(data.grade);
  const ec = emotionColor(data.emotion_score);

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        background: '#0D1117',
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: '#F0F0F0',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 50px',
      }}
    >
      {/* Background pattern */}
      <div style={{ position: 'absolute', inset: 0, background: bgPattern, pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 50 }}>
          <div style={{ fontSize: 36, fontWeight: 700 }}>
            Bet<span style={{ color: '#00C853' }}>Autopsy</span>
          </div>
          <div style={{ fontSize: 18, color: '#5A5C6F', marginTop: 4 }}>Autopsy Report</div>
        </div>

        {/* Archetype */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>{data.archetype?.description ? '' : ''}{getArchEmoji(archName)}</div>
          <div style={{ fontSize: 16, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#5A5C6F', marginBottom: 12 }}>MY BETTING PERSONALITY</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: archColor, lineHeight: 1.1, marginBottom: 12 }}>{archName}</div>
          <div style={{ fontSize: 20, color: '#A0A3B1', maxWidth: 700, margin: '0 auto', lineHeight: 1.5 }}>
            {data.archetype?.description ?? ''}
          </div>
        </div>

        {/* Two-column stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2px 1fr', gap: 0, marginBottom: 50 }}>
          {/* THE GOOD */}
          <div style={{ paddingRight: 30 }}>
            <div style={{ fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#00C853', marginBottom: 24, fontWeight: 600 }}>THE GOOD</div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 96, fontWeight: 800, color: gc, lineHeight: 1 }}>{data.grade}</div>
              <div style={{ fontSize: 14, color: '#5A5C6F', marginTop: 4 }}>GRADE</div>
            </div>
            {data.best_edge && (
              <div style={{ background: 'rgba(0,200,83,0.06)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#00C853', fontWeight: 600 }}>Best Edge</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{data.best_edge.category}</div>
                <div style={{ fontSize: 18, color: '#00C853', fontWeight: 700, marginTop: 2 }}>+{data.best_edge.roi.toFixed(1)}%</div>
              </div>
            )}
            {data.sharp_score !== null && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5A5C6F', marginBottom: 6 }}>
                  <span>Sharp Score</span>
                  <span style={{ color: '#00C853', fontWeight: 600 }}>{data.sharp_score}</span>
                </div>
                <div style={{ height: 6, background: '#1C1E2D', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.sharp_score}%`, borderRadius: 3, background: '#00C853' }} />
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ background: 'linear-gradient(180deg, transparent, rgba(90,92,111,0.3), transparent)' }} />

          {/* THE REAL */}
          <div style={{ paddingLeft: 30 }}>
            <div style={{ fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#f87171', marginBottom: 24, fontWeight: 600 }}>THE REAL</div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5A5C6F', marginBottom: 6 }}>
                <span>Emotion Score</span>
                <span style={{ color: ec, fontWeight: 700, fontSize: 18 }}>{data.emotion_score}/100</span>
              </div>
              <div style={{ height: 8, background: '#1C1E2D', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.emotion_score}%`, borderRadius: 4, background: ec }} />
              </div>
            </div>
            {data.biggest_leak && (
              <div style={{ background: 'rgba(248,113,113,0.06)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>Biggest Leak</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{data.biggest_leak.category}</div>
                <div style={{ fontSize: 18, color: '#f87171', fontWeight: 700, marginTop: 2 }}>{data.biggest_leak.roi.toFixed(1)}%</div>
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div style={{ fontSize: 40, fontWeight: 700 }}>{(data.win_rate ?? 0).toFixed(1)}%</div>
              <div style={{ fontSize: 14, color: '#5A5C6F' }}>WIN RATE</div>
            </div>
          </div>
        </div>

        {/* Roast stats */}
        {roastStats.length > 0 && (
          <div style={{ marginBottom: 50 }}>
            <div style={{ fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#fbbf24', marginBottom: 16, fontWeight: 600 }}>THE RECEIPTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {roastStats.map((stat, i) => (
                <div key={i} style={{ background: '#1C1E2D', borderRadius: 12, padding: '16px 20px', fontSize: 17, color: '#A0A3B1', lineHeight: 1.5 }}>
                  {stat.emoji} {stat.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#5A5C6F', marginBottom: 4 }}>
            {data.record} across {data.total_bets} bets{data.date_range ? ` · ${data.date_range}` : ''}
          </div>
          {data.streak_count && data.streak_count >= 4 && (
            <div style={{ fontSize: 14, color: '#00C853', marginBottom: 12 }}>🔥 {data.streak_count}-week streak</div>
          )}
          <div style={{ fontSize: 22, color: '#F0F0F0', marginTop: 20, fontWeight: 600 }}>Get your autopsy report</div>
          <div style={{ fontSize: 18, color: '#00C853', marginTop: 4 }}>betautopsy.com</div>
        </div>
      </div>
    </div>
  );
});

function getArchEmoji(name: string): string {
  const map: Record<string, string> = {
    'The Natural': '🧊', 'Sharp Sleeper': '🎯', 'Heated Bettor': '🔥',
    'Chalk Grinder': '📋', 'Parlay Dreamer': '🎰', 'Sniper': '🎯',
    'Volume Warrior': '⚔️', 'Degen King': '👑', 'The Grinder': '💪',
  };
  return map[name] ?? '🧬';
}

function getArchColor(name: string): string {
  const map: Record<string, string> = {
    'The Natural': '#00C853', 'Sharp Sleeper': '#00C853', 'Heated Bettor': '#f97316',
    'Chalk Grinder': '#fbbf24', 'Parlay Dreamer': '#8b5cf6', 'Sniper': '#60a5fa',
    'Volume Warrior': '#a78bfa', 'Degen King': '#f87171', 'The Grinder': '#94a3b8',
  };
  return map[name] ?? '#94a3b8';
}

ShareCardStories.displayName = 'ShareCardStories';
export default ShareCardStories;
