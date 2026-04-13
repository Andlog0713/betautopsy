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
  roasts?: { text: string }[];
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
    { text: 'Took a quiz about betting instead of placing a bet. Growth.' },
    { text: 'Has BetAutopsy bookmarked but won\'t upload their real history. Yet.' },
    { text: 'Knows their weaknesses now. Whether they fix them is another story.' },
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
          <svg width="28" height="44" viewBox="120 70 270 375" fill="none">
            <path fill="#00C9A7" d="M271.233,218.224 C271.264,284.173 271.323,350.121 271.293,416.07 C271.289,425.227 265.389,431.29 257.017,431.3 C248.47,431.309 242.7,425.148 242.695,415.605 C242.665,350.155 242.697,284.706 243.137,218.863 C252.83,223.202 262.049,222.684 271.233,218.224z"/>
            <path fill="#00C9A7" d="M228.125,189.213 C197.602,165.427 170.038,138.858 149.443,105.712 C145.955,100.099 145.474,94.404 149.217,88.852 C152.61,83.819 157.789,81.471 163.53,83.13 C167.066,84.151 171.15,86.534 173.028,89.533 C191.956,119.77 217.254,143.912 244.919,166.36 C235.464,171.356 230.404,179.239 228.125,189.213z"/>
            <path fill="#00C9A7" d="M268.529,166.358 C296.365,144.336 321.842,120.12 340.711,89.634 C345.241,82.317 353.859,80.54 360.721,84.907 C367.5,89.22 369.371,97.697 364.9,105.085 C350.366,129.095 331.677,149.602 310.912,168.278 C302.995,175.4 294.638,182.032 285.961,188.736 C283.701,178.21 277.62,171.139 268.529,166.358z"/>
            <path fill="#C4463A" d="M268.163,166.272 C277.62,171.139 283.701,178.21 285.652,188.902 C286.443,201.394 282.047,211.109 271.464,218.052 C262.049,222.684 252.83,223.202 243.169,218.347 C232.609,211.588 227.576,202.297 228.161,189.645 C230.404,179.239 235.464,171.356 245.221,166.573 C252.901,163.762 260.337,163.342 268.163,166.272z"/>
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
              <span style={{ fontSize: 15, color: '#848D9A', lineHeight: 1.4 }}>{roast.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ textAlign: 'center' as const, padding: '24px 0 0' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#F0F2F5', marginBottom: 6 }}>What&apos;s YOUR Bet DNA?</div>
        <div style={{ fontSize: 18, color: '#00C9A7', fontWeight: 600 }}>betautopsy.com/quiz</div>
      </div>
    </div>
  );
});

QuizResultCard.displayName = 'QuizResultCard';
export default QuizResultCard;
