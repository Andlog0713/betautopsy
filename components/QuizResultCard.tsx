'use client';

import { forwardRef } from 'react';
import type { QuizResult } from '@/lib/quiz-engine';

function emotionColor(s: number): string {
  if (s <= 30) return '#00C9A7';
  if (s <= 55) return '#fbbf24';
  if (s <= 75) return '#f97316';
  return '#f87171';
}

function disciplineColor(s: number): string {
  if (s >= 75) return '#00C9A7';
  if (s >= 50) return '#fbbf24';
  if (s >= 30) return '#f97316';
  return '#f87171';
}

function gradeColor(g: string): string {
  if (g === 'A') return '#00C853';
  if (g === 'B') return '#2dd4bf';
  if (g === 'C') return '#fbbf24';
  if (g === 'D') return '#f97316';
  return '#ef4444';
}

const ARCHETYPE_BG: Record<string, string> = {
  'The Natural': 'radial-gradient(ellipse at 30% 20%, rgba(0,201,167,0.08) 0%, transparent 50%)',
  'Heated Bettor': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.05) 0px, transparent 40px)',
  'Parlay Dreamer': 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.08) 0%, transparent 50%)',
  'Degen King': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.06) 0px, transparent 30px)',
  'Sharp Sleeper': 'repeating-linear-gradient(0deg, rgba(0,201,167,0.04) 0px, transparent 3px, transparent 14px)',
  'Volume Warrior': 'radial-gradient(circle, rgba(90,92,111,0.04) 1px, transparent 1px)',
  'Chalk Grinder': 'repeating-linear-gradient(0deg, rgba(90,92,111,0.04) 0px, transparent 1px, transparent 20px)',
};

interface Props {
  result: QuizResult;
  roasts?: { emoji: string; text: string }[];
}

const QuizResultCard = forwardRef<HTMLDivElement, Props>(({ result, roasts }, ref) => {
  const ec = emotionColor(result.emotion_estimate);
  const dc = disciplineColor(result.discipline_estimate);
  const gc = gradeColor(result.grade);
  const bgPattern = ARCHETYPE_BG[result.archetype.name] ?? 'none';
  const topBias = result.biases[0];
  const severityColor = topBias?.severity === 'high' ? '#f87171' : topBias?.severity === 'medium' ? '#fbbf24' : '#00C9A7';
  const severityBg = topBias?.severity === 'high' ? 'rgba(248,113,113,0.15)' : topBias?.severity === 'medium' ? 'rgba(251,191,36,0.15)' : 'rgba(0,201,167,0.15)';

  const displayRoasts = (roasts ?? []).slice(0, 2);
  // Add fallback roast if we don't have enough
  const allRoasts = displayRoasts.length < 2
    ? [...displayRoasts, { emoji: '🎯', text: 'Took a quiz about betting instead of placing a bet. Growth.' }]
    : displayRoasts;

  const mono = "'JetBrains Mono', monospace";
  const sans = "'Inter', -apple-system, sans-serif";

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        boxSizing: 'border-box' as const,
        background: '#111318',
        backgroundImage: bgPattern,
        fontFamily: sans,
        color: '#F0F2F5',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
        padding: '56px 64px',
      }}
    >
      {/* Bottom gradient for archetype color bleed */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 400, background: `radial-gradient(ellipse at 50% 100%, ${result.archetype.color}08 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="32" height="50" viewBox="0 0 18 28" fill="none">
            <path d="M2,2 Q3.8,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M16,2 Q14.2,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="9" y1="8.5" x2="9" y2="26" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="9" cy="8.5" r="1.9" fill="#E8453C" />
          </svg>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ fontWeight: 900 }}>BET</span>
            <span style={{ fontWeight: 300, color: '#00C9A7' }}>AUTOPSY</span>
          </div>
        </div>
        <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#515968' }}>BET DNA REPORT</div>
      </div>

      {/* ── Archetype ── */}
      <div style={{ textAlign: 'center' as const, marginBottom: 36 }}>
        <div style={{ fontSize: 88, lineHeight: 1.1, marginBottom: 12 }}>{result.archetype.emoji}</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: result.archetype.color, lineHeight: 1.15, marginBottom: 14 }}>{result.archetype.name}</div>
        <div style={{ fontSize: 18, color: '#848D9A', maxWidth: 700, margin: '0 auto', lineHeight: 1.5 }}>{result.archetype.description}</div>
      </div>

      {/* ── Thin divider ── */}
      <div style={{ width: '60%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 auto 36px' }} />

      {/* ── Grade Stamp ── */}
      <div style={{ textAlign: 'center' as const, marginBottom: 40 }}>
        <div style={{
          display: 'inline-block',
          border: `3px solid ${gc}25`,
          padding: '12px 40px',
          transform: 'rotate(-6deg)',
        }}>
          <div style={{ fontFamily: mono, fontSize: 140, fontWeight: 800, color: gc, lineHeight: 1 }}>{result.grade}</div>
          <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: 4, textTransform: 'uppercase' as const, color: gc, opacity: 0.6, textAlign: 'center' as const }}>OVERALL GRADE</div>
        </div>
      </div>

      {/* ── Stats Card (bet slip style) ── */}
      <div style={{
        background: '#161820',
        borderRadius: 12,
        padding: '36px 44px',
        marginBottom: 40,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Row 1: Emotion Score */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#848D9A' }}>EMOTION SCORE</span>
            <span style={{ fontFamily: mono, fontSize: 36, fontWeight: 700, color: ec, lineHeight: 1 }}>{result.emotion_estimate}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${result.emotion_estimate}%`, borderRadius: 3, background: ec }} />
          </div>
        </div>

        {/* Dashed divider */}
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', marginBottom: 28 }} />

        {/* Row 2: Discipline */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#848D9A' }}>DISCIPLINE</span>
            <span style={{ fontFamily: mono, fontSize: 36, fontWeight: 700, color: dc, lineHeight: 1 }}>{result.discipline_estimate}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${result.discipline_estimate}%`, borderRadius: 3, background: dc }} />
          </div>
        </div>

        {/* Dashed divider */}
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', marginBottom: 28 }} />

        {/* Row 3: Top Bias */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#848D9A' }}>TOP BIAS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#F0F2F5' }}>{topBias?.name ?? 'None'}</span>
            <span style={{
              fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              padding: '4px 12px', borderRadius: 4,
              background: severityBg, color: severityColor,
              textTransform: 'uppercase' as const,
            }}>{topBias?.severity.toUpperCase() ?? 'LOW'}</span>
          </div>
        </div>
      </div>

      {/* ── Roast Zone ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#fbbf24', marginBottom: 16, fontWeight: 600 }}>THE RECEIPTS</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {allRoasts.map((roast, i) => (
            <div key={i} style={{
              background: '#161820',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{roast.emoji}</span>
              <span style={{ fontSize: 17, color: '#848D9A', lineHeight: 1.4 }}>{roast.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── CTA ── */}
      <div style={{ textAlign: 'center' as const }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#F0F2F5', marginBottom: 8 }}>What&apos;s YOUR Bet DNA?</div>
        <div style={{ fontSize: 14, color: '#515968', marginBottom: 8 }}>👇</div>
        <div style={{ fontSize: 20, color: '#00C9A7', fontWeight: 600 }}>betautopsy.com/quiz</div>
      </div>
    </div>
  );
});

QuizResultCard.displayName = 'QuizResultCard';
export default QuizResultCard;
