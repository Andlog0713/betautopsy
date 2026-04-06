'use client';

import { forwardRef } from 'react';
import type { Bet } from '@/types';
import type { BehavioralInsight, PatternComparison } from '@/lib/share-helpers';

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

const MONO = "'JetBrains Mono', monospace";
const SANS = "'Inter', -apple-system, sans-serif";

const ShareCard = forwardRef<HTMLDivElement, {
  data: ShareCardData;
  insight: BehavioralInsight;
  comparison: PatternComparison;
  roastLine: string;
}>(({ data, insight, comparison, roastLine }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1080,
        display: 'flex',
        fontFamily: SANS,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
      }}
    >
      {/* Left panel: Personality */}
      <div style={{
        width: '44%', height: '100%', background: '#00C9A7', color: '#0D1117',
        padding: '56px 48px', display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'auto' }}>
          <svg width="20" height="30" viewBox="0 0 18 28" fill="none">
            <path d="M2,2 Q3.8,5.2 9,8.5" stroke="#0D1117" strokeWidth="1.7" strokeLinecap="round"/>
            <path d="M16,2 Q14.2,5.2 9,8.5" stroke="#0D1117" strokeWidth="1.7" strokeLinecap="round"/>
            <line x1="9" y1="8.5" x2="9" y2="26" stroke="#0D1117" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="9" cy="8.5" r="1.9" fill="#E8453C"/>
          </svg>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ fontWeight: 900 }}>BET</span>
            <span style={{ fontWeight: 300 }}>AUTOPSY</span>
          </div>
        </div>

        {/* Archetype */}
        <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase' as const, opacity: 0.4, marginBottom: 16 }}>
            MY BETTING PERSONALITY
          </div>
          <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 0.92, letterSpacing: -1, marginBottom: 20 }}>
            {archName}
          </div>
          <div style={{ fontSize: 18, fontWeight: 400, opacity: 0.55, lineHeight: 1.4, maxWidth: 380 }}>
            {roastLine}
          </div>
        </div>

        <div style={{ marginTop: 'auto' }} />
      </div>

      {/* Right panel: Insights */}
      <div style={{
        width: '56%', height: '100%', background: '#0D1117', color: '#F0F2F5',
        padding: '56px 48px', display: 'flex', flexDirection: 'column',
      }}>
        {/* Top: Behavioral insight */}
        <div style={{ marginBottom: 'auto' }}>
          <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#00C9A7', marginBottom: 12 }}>
            {insight.contextLabel}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 72, fontWeight: 700, lineHeight: 0.9, letterSpacing: -2, marginBottom: 12 }}>
            {insight.heroStat}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>
            {insight.heroLabel}
          </div>
          <div style={{ fontSize: 14, color: '#515968', lineHeight: 1.5, maxWidth: 400 }}>
            {insight.verdict}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '32px 0' }} />

        {/* Bottom: Pattern comparison */}
        <div style={{ marginBottom: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#515968', marginBottom: 4 }}>
                {comparison.topLabel.replace(/^Your /i, '')}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
                {comparison.topValue}
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 16, color: '#515968', alignSelf: 'center' }}>vs</div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#515968', marginBottom: 4 }}>
                {comparison.bottomLabel.replace(/^Your /i, '')}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, color: '#E8453C', lineHeight: 1 }}>
                {comparison.bottomValue}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#515968', lineHeight: 1.5, maxWidth: 400, marginTop: 12 }}>
            {comparison.punchline}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Get your autopsy report</div>
          <div style={{ fontFamily: MONO, fontSize: 14, color: '#00C9A7' }}>betautopsy.com</div>
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;
