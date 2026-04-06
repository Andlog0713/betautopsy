'use client';

import { forwardRef } from 'react';
import type { QuizResult } from '@/lib/quiz-engine';

function emotionColor(s: number): string {
  if (s <= 30) return '#00C9A7';
  if (s <= 55) return '#B8944A';
  if (s <= 75) return '#C4463A';
  return '#C4463A';
}

function disciplineColor(s: number): string {
  if (s >= 75) return '#00C9A7';
  if (s >= 50) return '#B8944A';
  if (s >= 30) return '#C4463A';
  return '#C4463A';
}

function gradeColor(g: string): string {
  if (g === 'A') return '#00C853';
  if (g === 'B') return '#2dd4bf';
  if (g === 'C') return '#B8944A';
  if (g === 'D') return '#C4463A';
  return '#ef4444';
}

const ARCHETYPE_BG: Record<string, string> = {
  'The Natural': 'radial-gradient(ellipse at 30% 20%, rgba(0,201,167,0.08) 0%, transparent 50%)',
  'Heated Bettor': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.05) 0px, transparent 40px)',
  'Parlay Dreamer': 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.08) 0%, transparent 50%)',
  'Degen King': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.06) 0px, transparent 30px)',
  'Sharp Sleeper': 'repeating-linear-gradient(0deg, rgba(0,201,167,0.04) 0px, transparent 3px, transparent 14px)',
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
  const severityColor = topBias?.severity === 'high' ? '#C4463A' : topBias?.severity === 'medium' ? '#B8944A' : '#00C9A7';
  const severityBg = topBias?.severity === 'high' ? 'rgba(248,113,113,0.15)' : topBias?.severity === 'medium' ? 'rgba(251,191,36,0.15)' : 'rgba(0,201,167,0.15)';

  // Ensure we always have 3 roast lines
  const baseRoasts = (roasts ?? []).slice(0, 3);
  const fallbacks = [
    { emoji: '🎯', text: 'Took a quiz about betting instead of placing a bet. Growth.' },
    { emoji: '📱', text: 'Has BetAutopsy bookmarked but won\'t upload their real history. Yet.' },
    { emoji: '🧠', text: 'Knows their weaknesses now. Whether they fix them is another story.' },
  ];
  const allRoasts = [...baseRoasts];
  while (allRoasts.length < 3) {
    allRoasts.push(fallbacks[allRoasts.length] ?? fallbacks[0]);
  }

  const mono = "'JetBrains Mono', monospace";
  const sans = "'Inter', -apple-system, sans-serif";

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        boxSizing: 'border-box' as const,
        background: '#111318',
        backgroundImage: bgPattern,
        fontFamily: sans,
        color: '#F0F2F5',
        position: 'relative',
        overflow: 'hidden',
        padding: '56px 64px 64px',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="28" height="44" viewBox="0 0 18 28" fill="none">
            <path d="M2,2 Q3.8,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M16,2 Q14.2,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="9" y1="8.5" x2="9" y2="26" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="9" cy="8.5" r="1.9" fill="#C4463A" />
          </svg>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ fontWeight: 900 }}>BET</span>
            <span style={{ fontWeight: 300, color: '#00C9A7' }}>AUTOPSY</span>
          </div>
        </div>
        <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#515968' }}>BET DNA REPORT</div>
      </div>

      {/* ── Archetype ── */}
      <div style={{ textAlign: 'center' as const, marginBottom: 24 }}>
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 8 }}>{result.archetype.emoji}</div>
        <div style={{ fontSize: 48, fontWeight: 800, color: result.archetype.color, lineHeight: 1.15, marginBottom: 10 }}>{result.archetype.name}</div>
        <div style={{ fontSize: 17, color: '#848D9A', maxWidth: 700, margin: '0 auto', lineHeight: 1.5 }}>{result.archetype.description}</div>
      </div>

      {/* ── Grade Stamp + Stats — side by side ── */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        {/* Grade stamp */}
        <div style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ border: `3px solid ${gc}25`, padding: '16px 32px', transform: 'rotate(-6deg)', textAlign: 'center' as const }}>
            <div style={{ fontFamily: mono, fontSize: 100, fontWeight: 800, color: gc, lineHeight: 1 }}>{result.grade}</div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' as const, color: gc, opacity: 0.6 }}>GRADE</div>
          </div>
        </div>

        {/* Stats card */}
        <div style={{ flex: 1, background: '#161820', borderRadius: 8, padding: '24px 32px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Emotion */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: '#848D9A' }}>EMOTION SCORE</span>
              <span style={{ fontFamily: mono, fontSize: 32, fontWeight: 700, color: ec, lineHeight: 1 }}>{result.emotion_estimate}</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${result.emotion_estimate}%`, borderRadius: 3, background: ec }} />
            </div>
          </div>
          {/* Divider */}
          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', marginBottom: 20 }} />
          {/* Discipline */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: '#848D9A' }}>DISCIPLINE</span>
              <span style={{ fontFamily: mono, fontSize: 32, fontWeight: 700, color: dc, lineHeight: 1 }}>{result.discipline_estimate}</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${result.discipline_estimate}%`, borderRadius: 3, background: dc }} />
            </div>
          </div>
          {/* Divider */}
          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', marginBottom: 20 }} />
          {/* Top Bias */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: '#848D9A' }}>TOP BIAS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#F0F2F5' }}>{topBias?.name ?? 'None'}</span>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '3px 10px', borderRadius: 3, background: severityBg, color: severityColor, textTransform: 'uppercase' as const }}>{topBias?.severity?.toUpperCase() ?? 'LOW'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Roast Zone ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: 3, color: '#B8944A', marginBottom: 12, fontWeight: 600 }}>THE RECEIPTS</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {allRoasts.map((roast, i) => (
            <div key={i} style={{ background: '#161820', borderRadius: 6, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{roast.emoji}</span>
              <span style={{ fontSize: 15, color: '#848D9A', lineHeight: 1.4 }}>{roast.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ textAlign: 'center' as const, padding: '24px 0 0' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#F0F2F5', marginBottom: 6 }}>What&apos;s YOUR Bet DNA?</div>
        <div style={{ fontSize: 12, color: '#515968', marginBottom: 6 }}>👇</div>
        <div style={{ fontSize: 18, color: '#00C9A7', fontWeight: 600 }}>betautopsy.com/quiz</div>
      </div>
    </div>
  );
});

QuizResultCard.displayName = 'QuizResultCard';
export default QuizResultCard;
