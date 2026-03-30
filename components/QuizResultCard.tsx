'use client';

import { forwardRef } from 'react';
import type { QuizResult } from '@/lib/quiz-engine';

function emotionColor(s: number): string {
  if (s <= 30) return '#00C9A7';
  if (s <= 55) return '#fbbf24';
  if (s <= 75) return '#f97316';
  return '#f87171';
}

const ARCHETYPE_BG: Record<string, string> = {
  'The Natural': 'radial-gradient(ellipse at 30% 20%, rgba(0,201,167,0.1) 0%, transparent 50%)',
  'Heated Bettor': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.07) 0px, transparent 40px)',
  'Parlay Dreamer': 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.1) 0%, transparent 50%)',
  'Degen King': 'repeating-linear-gradient(135deg, rgba(248,113,113,0.08) 0px, transparent 30px)',
};

interface Props {
  result: QuizResult;
  roasts?: { emoji: string; text: string }[];
}

const QuizResultCard = forwardRef<HTMLDivElement, Props>(({ result, roasts }, ref) => {
  const ec = emotionColor(result.emotion_estimate);
  const bgPattern = ARCHETYPE_BG[result.archetype.name] ?? 'none';
  const topBias = result.biases[0];
  const severityColor =
    topBias?.severity === 'high' ? '#f87171' : topBias?.severity === 'medium' ? '#fbbf24' : '#00C9A7';
  const severityBg =
    topBias?.severity === 'high'
      ? 'rgba(248,113,113,0.15)'
      : topBias?.severity === 'medium'
        ? 'rgba(251,191,36,0.15)'
        : 'rgba(0,201,167,0.15)';
  const displayRoasts = (roasts ?? []).slice(0, 2);

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        boxSizing: 'border-box' as const,
        background: '#111318',
        backgroundImage: bgPattern,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#F0F2F5',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
        padding: '64px 72px',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="36" height="56" viewBox="0 0 18 28" fill="none">
            <path d="M2,2 Q3.8,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M16,2 Q14.2,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="9" y1="8.5" x2="9" y2="26" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="9" cy="8.5" r="1.9" fill="#E8453C" />
          </svg>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ fontWeight: 900 }}>BET</span>
            <span style={{ fontWeight: 300, color: '#00C9A7' }}>AUTOPSY</span>
          </div>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            letterSpacing: 3,
            textTransform: 'uppercase' as const,
            color: '#848D9A',
          }}
        >
          BET DNA REPORT
        </div>
      </div>

      {/* ── Archetype (center) ── */}
      <div
        style={{
          textAlign: 'center' as const,
          flex: '0 0 auto',
          marginBottom: 72,
        }}
      >
        <div style={{ fontSize: 100, lineHeight: 1.1, marginBottom: 20 }}>{result.archetype.emoji}</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: result.archetype.color,
            lineHeight: 1.15,
            marginBottom: 20,
          }}
        >
          {result.archetype.name}
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#848D9A',
            maxWidth: 780,
            margin: '0 auto',
            lineHeight: 1.55,
          }}
        >
          {result.archetype.description}
        </div>
      </div>

      {/* ── Bet slip stats card ── */}
      <div
        style={{
          background: '#161820',
          borderRadius: 16,
          padding: '48px 56px',
          marginBottom: 64,
          border: '1px solid rgba(255,255,255,0.06)',
          position: 'relative' as const,
          overflow: 'hidden',
        }}
      >
        {/* Dashed perforation line at top */}
        <div
          style={{
            position: 'absolute' as const,
            top: 0,
            left: 24,
            right: 24,
            height: 0,
            borderTop: '2px dashed rgba(255,255,255,0.06)',
          }}
        />

        {/* EMOTION SCORE row */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16,
                letterSpacing: 2.5,
                textTransform: 'uppercase' as const,
                color: '#848D9A',
              }}
            >
              EMOTION SCORE
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 48,
                fontWeight: 700,
                color: ec,
                lineHeight: 1,
              }}
            >
              {result.emotion_estimate}
            </div>
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: 8,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${result.emotion_estimate}%`,
                borderRadius: 4,
                background: ec,
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 0,
            borderTop: '1px dashed rgba(255,255,255,0.08)',
            marginBottom: 40,
          }}
        />

        {/* TOP BIAS row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              letterSpacing: 2.5,
              textTransform: 'uppercase' as const,
              color: '#848D9A',
            }}
          >
            TOP BIAS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#F0F2F5' }}>
              {topBias?.name ?? 'None'}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1.5,
                padding: '6px 16px',
                borderRadius: 6,
                background: severityBg,
                color: severityColor,
                textTransform: 'uppercase' as const,
              }}
            >
              {topBias?.severity?.toUpperCase() ?? 'LOW'}
            </div>
          </div>
        </div>

        {/* Dashed perforation line at bottom */}
        <div
          style={{
            position: 'absolute' as const,
            bottom: 0,
            left: 24,
            right: 24,
            height: 0,
            borderTop: '2px dashed rgba(255,255,255,0.06)',
          }}
        />
      </div>

      {/* ── Roast lines ── */}
      {displayRoasts.length > 0 && (
        <div style={{ marginBottom: 64 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              letterSpacing: 3,
              textTransform: 'uppercase' as const,
              color: '#fbbf24',
              marginBottom: 28,
            }}
          >
            THE RECEIPTS
          </div>
          {displayRoasts.map((roast, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: i < displayRoasts.length - 1 ? 20 : 0,
                fontSize: 22,
                lineHeight: 1.5,
                color: '#C0C7D2',
              }}
            >
              <span style={{ flexShrink: 0, fontSize: 24 }}>{roast.emoji}</span>
              <span>{roast.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center' as const }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', marginBottom: 12 }}>
          What&apos;s YOUR Bet DNA?
        </div>
        <div style={{ fontSize: 20, color: '#00C9A7' }}>betautopsy.com/quiz</div>
      </div>
    </div>
  );
});

QuizResultCard.displayName = 'QuizResultCard';
export default QuizResultCard;
