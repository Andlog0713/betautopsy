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
        flexDirection: 'row',
        fontFamily: SANS,
      }}
    >
      {/* Left teal panel */}
      <div style={{
        width: 475, background: '#00C9A7',
        padding: '80px 56px', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="36" height="52" viewBox="0 0 40 60" fill="none">
            <path d="M4,4 Q8.6,11.5 20,19" stroke="#0D1117" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6"/>
            <path d="M36,4 Q31.4,11.5 20,19" stroke="#0D1117" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6"/>
            <line x1="20" y1="19" x2="20" y2="56" stroke="#0D1117" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6"/>
            <circle cx="20" cy="19" r="4.5" fill="#0D1117"/>
          </svg>
          <span style={{ fontSize: 24, letterSpacing: 4, fontWeight: 800, color: '#0D1117' }}>
            <span>BET</span><span style={{ fontWeight: 400 }}>AUTOPSY</span>
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div>
          <div style={{ fontSize: 28, color: '#0D1117', opacity: 0.5, marginBottom: 28 }}>
            My betting personality
          </div>
          <div style={{ fontSize: 90, fontWeight: 900, color: '#0D1117', lineHeight: 0.92, letterSpacing: -3, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {archName}
          </div>
          <div style={{ fontSize: 32, color: '#0D1117', opacity: 0.5, marginTop: 36, lineHeight: 1.5 }}>
            {roastLine}
          </div>
        </div>
        <div style={{ flex: 0.4 }} />
      </div>

      {/* Right dark panel */}
      <div style={{
        flex: 1, background: '#0D1117',
        padding: '80px 64px', display: 'flex', flexDirection: 'column', color: '#F0F2F5',
      }}>
        <div style={{ flex: 0.2 }} />

        {/* Insight 1 */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ fontSize: 28, color: '#00C9A7', marginBottom: 20 }}>
            {insight.contextLabel}
          </div>
          <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 0.9, letterSpacing: -5 }}>
            {insight.heroStat}
          </div>
          <div style={{ fontSize: 38, color: '#848D9A', marginTop: 20, lineHeight: 1.3 }}>
            {insight.heroLabel}
          </div>
        </div>

        {/* Insight 2 */}
        <div>
          <div style={{ fontSize: 28, color: '#E8453C', marginBottom: 20 }}>
            Win rate comparison
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 36 }}>
            <div>
              <div style={{ fontSize: 100, fontWeight: 900, letterSpacing: -3 }}>
                {comparison.topValue}
              </div>
              <div style={{ fontSize: 26, color: '#848D9A', marginTop: 6 }}>
                {comparison.topLabel.replace(/^Your /i, '').replace(/^win rate /i, '')}
              </div>
            </div>
            <div style={{ fontSize: 48, color: '#848D9A' }}>vs</div>
            <div>
              <div style={{ fontSize: 100, fontWeight: 900, color: '#E8453C', letterSpacing: -3 }}>
                {comparison.bottomValue}
              </div>
              <div style={{ fontSize: 26, color: '#848D9A', marginTop: 6 }}>
                {comparison.bottomLabel.replace(/^Your /i, '').replace(/^win rate /i, '')}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* CTA */}
        <div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>Get your autopsy</div>
          <div style={{ fontSize: 28, color: '#00C9A7', marginTop: 8 }}>betautopsy.com</div>
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;
