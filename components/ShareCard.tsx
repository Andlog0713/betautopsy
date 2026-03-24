'use client';

import { forwardRef } from 'react';
import type { Bet } from '@/types';

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

const ARCHETYPE_BG: Record<string, string> = {
  'The Natural': 'radial-gradient(ellipse at 30% 20%, rgba(74,222,128,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(74,222,128,0.05) 0%, transparent 50%)',
  'Tilt Machine': 'repeating-linear-gradient(135deg, rgba(249,115,22,0.07) 0px, transparent 40px, rgba(248,113,113,0.06) 80px)',
  'Parlay Dreamer': 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(circle at 60% 70%, rgba(96,165,250,0.06) 0%, transparent 40%)',
  'Chalk Grinder': 'repeating-linear-gradient(0deg, rgba(154,148,131,0.05) 0px, transparent 1px, transparent 20px, rgba(154,148,131,0.05) 20px), repeating-linear-gradient(90deg, rgba(154,148,131,0.05) 0px, transparent 1px, transparent 20px, rgba(154,148,131,0.05) 20px)',
  'Sharp Sleeper': 'repeating-linear-gradient(0deg, rgba(74,222,128,0.06) 0px, transparent 3px, transparent 14px)',
  'Volume Warrior': 'radial-gradient(circle, rgba(154,148,131,0.06) 1px, transparent 1px)',
  'Sniper': 'linear-gradient(0deg, transparent 48%, rgba(154,148,131,0.06) 48%, rgba(154,148,131,0.06) 52%, transparent 52%), linear-gradient(90deg, transparent 48%, rgba(154,148,131,0.06) 48%, rgba(154,148,131,0.06) 52%, transparent 52%)',
  'Degen King': 'repeating-linear-gradient(135deg, rgba(249,115,22,0.08) 0px, transparent 30px, rgba(249,115,22,0.05) 60px)',
  'The Grinder': 'none',
};

function getBiggestHit(bets?: Bet[]): { profit: number; description: string; odds: number; bet_type: string } | null {
  if (!bets || bets.length === 0) return null;
  const wins = bets.filter((b) => b.result === 'win' && Number(b.profit) > 0);
  if (wins.length === 0) return null;
  const best = wins.sort((a, b) => Number(b.profit) - Number(a.profit))[0];
  return { profit: Number(best.profit), description: best.description, odds: best.odds, bet_type: best.bet_type };
}

function getWorstBeat(bets?: Bet[]): { profit: number; description: string; odds: number; bet_type: string } | null {
  if (!bets || bets.length === 0) return null;
  const losses = bets.filter((b) => b.result === 'loss');
  if (losses.length === 0) return null;
  // Pain score = what they would have won
  const withPain = losses.map((b) => {
    const stake = Number(b.stake);
    const potentialWin = b.odds > 0 ? stake * (b.odds / 100) : stake * (100 / Math.abs(b.odds));
    return { ...b, painScore: potentialWin };
  });
  const worst = withPain.sort((a, b) => b.painScore - a.painScore)[0];
  return { profit: Number(worst.profit), description: worst.description, odds: worst.odds, bet_type: worst.bet_type };
}

function getBadges(data: ShareCardData): string[] {
  const badges: string[] = [];
  if ((data.win_rate ?? 0) > 55) badges.push('Sharper than most');
  if (data.emotion_score < 20) badges.push('Ice in their veins');
  if (data.emotion_score > 70) badges.push('Bets with their heart');
  if ((data.parlay_percent ?? 0) > 60) badges.push('Parlay warrior');
  if ((data.parlay_percent ?? 0) < 10 && data.total_bets > 10) badges.push('Straight bets only');
  if (data.roi_percent > 10) badges.push('Actually profitable');
  if (data.roi_percent > -5 && data.roi_percent < 0) badges.push('On the edge');
  if (data.total_bets > 500) badges.push('Volume king');
  if (data.total_bets < 30 && data.total_bets > 0) badges.push('Sniper mentality');
  const hit = getBiggestHit(data.bets);
  if (hit && hit.odds > 500) badges.push('Hit a longshot');
  return badges.slice(0, 3);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

const S = { // shared inline styles
  mono: { fontFamily: "'JetBrains Mono', monospace" } as React.CSSProperties,
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" } as React.CSSProperties,
  label: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#A0A3B1' },
};

const ShareCard = forwardRef<HTMLDivElement, { data: ShareCardData }>(({ data }, ref) => {
  const gc = gradeColor(data.grade);
  const ec = emotionColor(data.emotion_score);
  const archName = data.archetype?.name ?? 'The Grinder';
  const bgPattern = ARCHETYPE_BG[archName] ?? 'none';
  const hit = getBiggestHit(data.bets);
  const beat = getWorstBeat(data.bets);
  const badges = getBadges(data);

  return (
    <div
      ref={ref}
      style={{
        width: 440,
        padding: 32,
        background: '#0f0e0c',
        borderRadius: 20,
        fontFamily: "'DM Sans', sans-serif",
        color: '#F0F0F0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Archetype-specific background */}
      <div style={{ position: 'absolute', inset: 0, background: bgPattern, backgroundSize: archName === 'Volume Warrior' ? '20px 20px' : undefined, pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ position: 'relative' }}>
        {/* Logo */}
        <div style={{ ...S.serif, fontSize: 16, marginBottom: 24 }}>
          Bet<span style={{ color: '#f97316' }}>Autopsy</span>
        </div>

        {/* Archetype */}
        {data.archetype && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>YOUR BET DNA</div>
            <div style={{ ...S.serif, fontSize: 26, color: '#f97316', lineHeight: 1.2 }}>{data.archetype.name}</div>
            <div style={{ fontSize: 12, color: '#A0A3B1', marginTop: 4 }}>{data.archetype.description}</div>
          </div>
        )}

        {/* Two-column layout: The Good / The Real */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0, marginBottom: 20 }}>
          {/* Left: The Good */}
          <div style={{ paddingRight: 16 }}>
            <div style={{ ...S.label, marginBottom: 10, color: '#00C853' }}>THE GOOD</div>
            {/* Grade */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ ...S.serif, fontSize: 52, fontWeight: 'bold', color: gc, lineHeight: 1 }}>{data.grade}</div>
              <div style={{ fontSize: 9, color: '#A0A3B1', marginTop: 2 }}>GRADE</div>
            </div>
            {/* Best Edge */}
            {data.best_edge && (
              <div style={{ background: 'rgba(74,222,128,0.06)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: '#00C853' }}>Best Edge</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{data.best_edge.category}</div>
                <div style={{ ...S.mono, fontSize: 11, color: '#00C853' }}>+{data.best_edge.roi.toFixed(1)}%</div>
              </div>
            )}
            {/* Sharp Score */}
            {data.sharp_score !== null && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#A0A3B1', marginBottom: 3 }}>
                  <span>Sharp Score</span>
                  <span style={{ ...S.mono, color: '#00C853' }}>{data.sharp_score}</span>
                </div>
                <div style={{ height: 4, background: '#1f1e1c', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.sharp_score}%`, borderRadius: 2, background: '#00C853' }} />
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ background: 'linear-gradient(180deg, transparent, rgba(95,89,79,0.3), transparent)' }} />

          {/* Right: The Real */}
          <div style={{ paddingLeft: 16 }}>
            <div style={{ ...S.label, marginBottom: 10, color: '#f87171' }}>THE REAL</div>
            {/* Emotion Score */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#A0A3B1', marginBottom: 3 }}>
                <span>Emotion Score</span>
                <span style={{ ...S.mono, color: ec }}>{data.emotion_score}/100</span>
              </div>
              <div style={{ height: 5, background: '#1f1e1c', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.emotion_score}%`, borderRadius: 3, background: ec }} />
              </div>
            </div>
            {/* Biggest Leak */}
            {data.biggest_leak && (
              <div style={{ background: 'rgba(248,113,113,0.06)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: '#f87171' }}>Biggest Leak</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{data.biggest_leak.category}</div>
                <div style={{ ...S.mono, fontSize: 11, color: '#f87171' }}>{data.biggest_leak.roi.toFixed(1)}%</div>
              </div>
            )}
            {/* Win Rate */}
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <div style={{ ...S.mono, fontSize: 22, fontWeight: 600 }}>{(data.win_rate ?? 0).toFixed(1)}%</div>
              <div style={{ fontSize: 9, color: '#A0A3B1' }}>WIN RATE</div>
            </div>
          </div>
        </div>

        {/* Personality Badges — between columns and hits */}
        {badges.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'center' }}>
            {badges.map((b) => (
              <span key={b} style={{ fontSize: 10, color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 20, padding: '3px 10px' }}>
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Biggest Hit */}
        {hit && (
          <div style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: '#00C853', marginBottom: 4 }}>BIGGEST HIT</div>
            <div style={{ ...S.mono, fontSize: 20, fontWeight: 700, color: '#00C853' }}>+${Math.round(hit.profit).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#A0A3B1', marginTop: 2 }}>{truncate(hit.description, 60)}</div>
            <div style={{ fontSize: 10, color: '#5A5C6F', marginTop: 2 }}>
              {hit.bet_type} at {hit.odds > 0 ? `+${hit.odds}` : hit.odds}
            </div>
          </div>
        )}

        {/* Worst Bad Beat */}
        {beat && (
          <div style={{ background: 'rgba(248,113,113,0.03)', border: '1px solid rgba(248,113,113,0.08)', borderRadius: 10, padding: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#f87171', marginBottom: 2 }}>WORST BAD BEAT</div>
            <div style={{ ...S.mono, fontSize: 14, color: '#f87171' }}>-${Math.abs(Math.round(beat.profit)).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: '#5A5C6F', marginTop: 2 }}>{truncate(beat.description, 55)} · {beat.odds > 0 ? `+${beat.odds}` : beat.odds}</div>
          </div>
        )}

        {/* Bottom section */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#5A5C6F', marginBottom: 6 }}>
          {data.record} across {data.total_bets} bets
          {data.date_range ? ` · ${data.date_range}` : ''}
        </div>

        {/* Discipline + Streak row */}
        {((data.discipline_score && data.discipline_score > 0) || (data.streak_count && data.streak_count > 1)) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 10, fontSize: 11 }}>
            {data.discipline_score && data.discipline_score > 0 && (
              <span style={{ color: '#A0A3B1' }}>Discipline: <span style={{ ...S.mono, color: '#F0F0F0' }}>{data.discipline_score}/100</span></span>
            )}
            {data.streak_count && data.streak_count > 1 && (
              <span style={{ color: '#A0A3B1' }}>🔥 {data.streak_count}-report streak</span>
            )}
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', fontSize: 12, color: '#A0A3B1', marginTop: 8 }}>
          betautopsy.com — find out what your bets say about you
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;
