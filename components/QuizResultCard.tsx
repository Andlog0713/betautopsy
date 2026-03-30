'use client';

import { forwardRef } from 'react';
import type { QuizResult } from '@/lib/quiz-engine';

function emotionColor(s: number): string {
  if (s <= 30) return '#00C9A7';
  if (s <= 55) return '#fbbf24';
  if (s <= 75) return '#f97316';
  return '#f87171';
}

const QuizResultCard = forwardRef<HTMLDivElement, { result: QuizResult }>(({ result }, ref) => {
  const ec = emotionColor(result.emotion_estimate);

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
        padding: 20,
        boxSizing: 'border-box' as const,
        background: '#111318',
        borderRadius: 2,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#F0F2F5',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <svg width="18" height="28" viewBox="0 0 18 28" fill="none">
          <path d="M2,2 Q3.8,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
          <path d="M16,2 Q14.2,5.2 9,8.5" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
          <line x1="9" y1="8.5" x2="9" y2="26" stroke="#00C9A7" strokeWidth="1.7" strokeLinecap="round"/>
          <circle cx="9" cy="8.5" r="1.9" fill="#E8453C"/>
        </svg>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          <span style={{ fontWeight: 900 }}>BET</span><span style={{ fontWeight: 300, color: '#00C9A7' }}>AUTOPSY</span>
        </div>
      </div>

      {/* Archetype */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#848D9A', marginBottom: 8 }}>
          YOUR BET DNA
        </div>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{result.archetype.emoji}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: result.archetype.color, lineHeight: 1.2, marginBottom: 8 }}>
          {result.archetype.name}
        </div>
        <div style={{ fontSize: 12, color: '#848D9A', maxWidth: 320, margin: '0 auto', lineHeight: 1.4 }}>
          {result.archetype.description}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {/* Emotion score */}
        <div style={{ background: '#161820', borderRadius: 2, padding: 12, textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: '#848D9A', marginBottom: 6 }}>EMOTION SCORE</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: ec }}>
            {result.emotion_estimate}
          </div>
          <div style={{ height: 4, background: '#111318', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${result.emotion_estimate}%`, borderRadius: 2, background: ec }} />
          </div>
        </div>

        {/* Top bias */}
        <div style={{ background: '#161820', borderRadius: 2, padding: 12, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: '#848D9A', marginBottom: 6 }}>TOP BIAS</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F2F5', wordBreak: 'break-word' as const }}>
            {result.biases[0]?.name ?? 'None'}
          </div>
          <div style={{
            display: 'inline-block',
            fontSize: 9,
            padding: '2px 8px',
            borderRadius: 2,
            marginTop: 6,
            background: result.biases[0]?.severity === 'high' ? 'rgba(248,113,113,0.1)' : result.biases[0]?.severity === 'medium' ? 'rgba(251,191,36,0.1)' : 'rgba(0,201,167,0.1)',
            color: result.biases[0]?.severity === 'high' ? '#f87171' : result.biases[0]?.severity === 'medium' ? '#fbbf24' : '#00C9A7',
          }}>
            {result.biases[0]?.severity.toUpperCase() ?? 'LOW'}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', fontSize: 13, color: '#848D9A', marginBottom: 4 }}>
        What&apos;s YOUR Bet DNA?
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#00C9A7' }}>
        betautopsy.com/quiz
      </div>
    </div>
  );
});

QuizResultCard.displayName = 'QuizResultCard';
export default QuizResultCard;
