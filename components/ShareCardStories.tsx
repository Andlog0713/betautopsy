'use client';

import { forwardRef } from 'react';
import type { ShareCardData } from './ShareCard';
import type { RoastStat } from '@/lib/share-helpers';

const ARCHETYPE_BG: Record<string, string> = {
  'The Natural': 'radial-gradient(ellipse at 30% 20%, rgba(0,200,83,0.1) 0%, transparent 50%)',
  'Heated Bettor': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.07) 0px, transparent 40px, rgba(248,113,113,0.04) 80px)',
  'Parlay Dreamer': 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.1) 0%, transparent 50%)',
  'Chalk Grinder': 'repeating-linear-gradient(0deg, rgba(90,92,111,0.06) 0px, transparent 1px, transparent 20px)',
  'Sharp Sleeper': 'repeating-linear-gradient(0deg, rgba(0,200,83,0.07) 0px, transparent 3px, transparent 14px)',
  'Volume Warrior': 'radial-gradient(circle, rgba(90,92,111,0.06) 1px, transparent 1px)',
  'Sniper': 'linear-gradient(0deg, transparent 48%, rgba(90,92,111,0.06) 48%, rgba(90,92,111,0.06) 52%, transparent 52%)',
  'Degen King': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.08) 0px, transparent 30px, rgba(248,113,113,0.05) 60px)',
  'The Grinder': 'none',
  'Multiplier Chaser': 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.1) 0%, transparent 50%)',
  'All-or-Nothing Player': 'repeating-linear-gradient(135deg, rgba(249,115,22,0.07) 0px, transparent 40px)',
  'Loyalty Bettor': 'radial-gradient(ellipse at 30% 20%, rgba(96,165,250,0.08) 0%, transparent 50%)',
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

function getArchEmoji(name: string): string {
  const map: Record<string, string> = {
    'The Natural': '🧊', 'Sharp Sleeper': '🎯', 'Heated Bettor': '🔥',
    'Chalk Grinder': '📋', 'Parlay Dreamer': '🎰', 'Sniper': '🎯',
    'Volume Warrior': '⚔️', 'Degen King': '👑', 'The Grinder': '💪',
    'Multiplier Chaser': '🎰', 'All-or-Nothing Player': '⚡', 'Loyalty Bettor': '🫡',
  };
  return map[name] ?? '🧬';
}

function getArchColor(name: string): string {
  const map: Record<string, string> = {
    'The Natural': '#00C853', 'Sharp Sleeper': '#00C853', 'Heated Bettor': '#f97316',
    'Chalk Grinder': '#fbbf24', 'Parlay Dreamer': '#8b5cf6', 'Sniper': '#60a5fa',
    'Volume Warrior': '#a78bfa', 'Degen King': '#f87171', 'The Grinder': '#94a3b8',
    'Multiplier Chaser': '#8b5cf6', 'All-or-Nothing Player': '#f97316', 'Loyalty Bettor': '#60a5fa',
  };
  return map[name] ?? '#94a3b8';
}

const ShareCardStories = forwardRef<HTMLDivElement, { data: ShareCardData; roastStats: RoastStat[] }>(({ data, roastStats }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';
  const archColor = getArchColor(archName);
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
        padding: '80px 64px',
      }}
    >
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: bgPattern, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 44, fontWeight: 700 }}>
            Bet<span style={{ color: '#00C853' }}>Autopsy</span>
          </div>
        </div>

        {/* Archetype — big and bold */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 100, marginBottom: 16 }}>{getArchEmoji(archName)}</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: archColor, lineHeight: 1.1, marginBottom: 16 }}>{archName}</div>
          <div style={{ fontSize: 26, color: '#A0A3B1', maxWidth: 800, margin: '0 auto', lineHeight: 1.5 }}>
            {data.archetype?.description ?? ''}
          </div>
        </div>

        {/* Stats row — big numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 48 }}>
          <div style={{ background: '#1C1E2D', borderRadius: 16, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#5A5C6F', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 8, fontWeight: 600 }}>GRADE</div>
            <div style={{ fontSize: 80, fontWeight: 800, color: gc, lineHeight: 1 }}>{data.grade}</div>
          </div>
          <div style={{ background: '#1C1E2D', borderRadius: 16, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#5A5C6F', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 8, fontWeight: 600 }}>EMOTION</div>
            <div style={{ fontSize: 80, fontWeight: 800, color: ec, lineHeight: 1 }}>{data.emotion_score}</div>
          </div>
          <div style={{ background: '#1C1E2D', borderRadius: 16, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, color: '#5A5C6F', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 8, fontWeight: 600 }}>WIN RATE</div>
            <div style={{ fontSize: 60, fontWeight: 800, color: '#F0F0F0', lineHeight: 1 }}>{(data.win_rate ?? 0).toFixed(0)}%</div>
          </div>
        </div>

        {/* Edge + Leak row — always lead with the positive */}
        <div style={{ display: 'grid', gridTemplateColumns: (data.best_edge && data.biggest_leak) ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 48 }}>
          {data.best_edge && (
            <div style={{ background: 'rgba(0,200,83,0.08)', borderRadius: 16, padding: 24, border: '1px solid rgba(0,200,83,0.2)' }}>
              <div style={{ fontSize: 16, color: '#00C853', fontWeight: 600, marginBottom: 8 }}>BEST EDGE</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{data.best_edge.category}</div>
              <div style={{ fontSize: 24, color: '#00C853', fontWeight: 700, marginTop: 4 }}>+{data.best_edge.roi.toFixed(1)}%</div>
            </div>
          )}
          {!data.best_edge && data.sharp_score !== null && (
            <div style={{ background: 'rgba(0,200,83,0.08)', borderRadius: 16, padding: 24, border: '1px solid rgba(0,200,83,0.2)' }}>
              <div style={{ fontSize: 16, color: '#00C853', fontWeight: 600, marginBottom: 8 }}>SHARP SCORE</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#00C853' }}>{data.sharp_score}/100</div>
            </div>
          )}
          {data.biggest_leak && (
            <div style={{ background: 'rgba(248,113,113,0.08)', borderRadius: 16, padding: 24, border: '1px solid rgba(248,113,113,0.2)' }}>
              <div style={{ fontSize: 16, color: '#f87171', fontWeight: 600, marginBottom: 8 }}>BIGGEST LEAK</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{data.biggest_leak.category}</div>
              <div style={{ fontSize: 24, color: '#f87171', fontWeight: 700, marginTop: 4 }}>{data.biggest_leak.roi.toFixed(1)}%</div>
            </div>
          )}
        </div>

        {/* Biggest Win — positive highlight before the roasts */}
        {(() => {
          if (!data.bets || data.bets.length === 0) return null;
          const wins = data.bets.filter((b) => b.result === 'win' && Number(b.profit) > 0);
          if (wins.length === 0) return null;
          const best = wins.sort((a, b) => Number(b.profit) - Number(a.profit))[0];
          const profit = Math.round(Number(best.profit));
          if (profit < 50) return null;
          return (
            <div style={{ background: 'rgba(0,200,83,0.06)', borderRadius: 16, padding: 24, border: '1px solid rgba(0,200,83,0.15)', marginBottom: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 16, color: '#00C853', fontWeight: 600, marginBottom: 8 }}>BIGGEST WIN</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#00C853' }}>+${profit.toLocaleString()}</div>
            </div>
          );
        })()}

        {/* Roast stats */}
        {roastStats.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 18, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#fbbf24', marginBottom: 20, fontWeight: 600 }}>THE RECEIPTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {roastStats.map((stat, i) => (
                <div key={i} style={{ background: '#1C1E2D', borderRadius: 14, padding: '20px 24px', fontSize: 22, color: '#A0A3B1', lineHeight: 1.5 }}>
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
          <div style={{ fontSize: 18, color: '#5A5C6F', marginBottom: 8 }}>
            {data.record} · {data.total_bets} bets{data.date_range ? ` · ${data.date_range}` : ''}
          </div>
          {data.streak_count && data.streak_count >= 4 && (
            <div style={{ fontSize: 20, color: '#00C853', marginBottom: 12 }}>🔥 {data.streak_count}-week streak</div>
          )}
          <div style={{ fontSize: 28, color: '#F0F0F0', marginTop: 24, fontWeight: 700 }}>Get your autopsy report</div>
          <div style={{ fontSize: 24, color: '#00C853', marginTop: 8 }}>betautopsy.com</div>
        </div>
      </div>
    </div>
  );
});

ShareCardStories.displayName = 'ShareCardStories';
export default ShareCardStories;
