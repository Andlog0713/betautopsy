'use client';

import { forwardRef } from 'react';
import type { QuizResult } from '@/lib/quiz-engine';

function emotionColor(s: number): string {
  if (s <= 30) return '#00C853';
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
        background: '#0D1117',
        borderRadius: 20,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#F0F0F0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>
        Bet<span style={{ color: '#00C853' }}>Autopsy</span>
      </div>

      {/* Archetype */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#A0A3B1', marginBottom: 8 }}>
          YOUR BET DNA
        </div>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{result.archetype.emoji}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: result.archetype.color, lineHeight: 1.2, marginBottom: 8 }}>
          {result.archetype.name}
        </div>
        <div style={{ fontSize: 12, color: '#A0A3B1', maxWidth: 320, margin: '0 auto', lineHeight: 1.4 }}>
          {result.archetype.description}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {/* Emotion score */}
        <div style={{ background: '#1C1E2D', borderRadius: 12, padding: 12, textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: '#A0A3B1', marginBottom: 6 }}>EMOTION SCORE</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: ec }}>
            {result.emotion_estimate}
          </div>
          <div style={{ height: 4, background: '#0D1117', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${result.emotion_estimate}%`, borderRadius: 2, background: ec }} />
          </div>
        </div>

        {/* Top bias */}
        <div style={{ background: '#1C1E2D', borderRadius: 12, padding: 12, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: '#A0A3B1', marginBottom: 6 }}>TOP BIAS</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0', wordBreak: 'break-word' as const }}>
            {result.biases[0]?.name ?? 'None'}
          </div>
          <div style={{
            display: 'inline-block',
            fontSize: 9,
            padding: '2px 8px',
            borderRadius: 20,
            marginTop: 6,
            background: result.biases[0]?.severity === 'high' ? 'rgba(248,113,113,0.1)' : result.biases[0]?.severity === 'medium' ? 'rgba(251,191,36,0.1)' : 'rgba(0,200,83,0.1)',
            color: result.biases[0]?.severity === 'high' ? '#f87171' : result.biases[0]?.severity === 'medium' ? '#fbbf24' : '#00C853',
          }}>
            {result.biases[0]?.severity.toUpperCase() ?? 'LOW'}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', fontSize: 13, color: '#A0A3B1', marginBottom: 4 }}>
        What&apos;s YOUR Bet DNA?
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#00C853' }}>
        betautopsy.com/quiz
      </div>
    </div>
  );
});

QuizResultCard.displayName = 'QuizResultCard';
export default QuizResultCard;
