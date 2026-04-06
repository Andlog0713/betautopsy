'use client';

import { forwardRef } from 'react';
import type { Bet } from '@/types';
import type { BehavioralInsight, RoastStat } from '@/lib/share-helpers';

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
  // Behavioral split from bet_annotations
  disciplinedRecord?: { bets: number; roi: number };
  emotionalRecord?: { bets: number; roi: number };
}

const SANS = "'Inter', -apple-system, sans-serif";

const ShareCard = forwardRef<HTMLDivElement, {
  data: ShareCardData;
  insight: BehavioralInsight;
  roastLine: string;
  roastStats: RoastStat[];
}>(({ data, insight, roastLine, roastStats }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';
  const archFontSize = archName.length > 14 ? 72 : archName.length > 10 ? 80 : 90;
  const hasAnnotations = data.disciplinedRecord && data.emotionalRecord;
  const roast = roastStats[0];

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
        padding: '80px 48px', display: 'flex', flexDirection: 'column',
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
          <div style={{ fontSize: 26, color: '#0D1117', opacity: 0.7, marginBottom: 24 }}>
            My betting personality
          </div>
          <div style={{ fontSize: archFontSize, fontWeight: 900, color: '#0D1117', lineHeight: 0.95, letterSpacing: -2 }}>
            {archName}
          </div>
          <div style={{ fontSize: 28, color: '#0D1117', opacity: 0.7, marginTop: 32, lineHeight: 1.45 }}>
            {roastLine}
          </div>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {/* Right dark panel */}
      <div style={{
        flex: 1, background: '#0D1117',
        padding: '80px 56px', display: 'flex', flexDirection: 'column', color: '#F0F2F5',
      }}>
        {/* Behavioral split or fallback insight */}
        {hasAnnotations ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 22, color: '#00C9A7', marginBottom: 10, fontWeight: 600 }}>{"When you're disciplined"}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: -2 }}>{data.disciplinedRecord!.bets}</div>
                <div style={{ fontSize: 28, color: '#848D9A' }}>bets</div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#00C9A7', marginTop: 4 }}>
                {data.disciplinedRecord!.roi >= 0 ? '+' : ''}{data.disciplinedRecord!.roi}% ROI
              </div>
            </div>
            <div>
              <div style={{ fontSize: 22, color: '#E8453C', marginBottom: 10, fontWeight: 600 }}>{"When you're emotional"}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: -2 }}>{data.emotionalRecord!.bets}</div>
                <div style={{ fontSize: 28, color: '#848D9A' }}>bets</div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#E8453C', marginTop: 4 }}>
                {data.emotionalRecord!.roi >= 0 ? '+' : ''}{data.emotionalRecord!.roi}% ROI
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 22, color: '#00C9A7', marginBottom: 12, fontWeight: 600 }}>{insight.contextLabel}</div>
            <div style={{ fontSize: 100, fontWeight: 900, lineHeight: 0.9, letterSpacing: -3 }}>{insight.heroStat}</div>
            <div style={{ fontSize: 30, color: '#F0F2F5', marginTop: 16, lineHeight: 1.3, fontWeight: 500 }}>{insight.heroLabel}</div>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />

        {/* Roast stat */}
        {roast ? (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 24, color: '#D0D5DD', lineHeight: 1.4 }}>
              {roast.emoji} {roast.text}
            </div>
          </div>
        ) : null}

        {/* CTA */}
        <div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>Get your autopsy</div>
          <div style={{ fontSize: 24, color: '#00C9A7', marginTop: 6 }}>betautopsy.com</div>
        </div>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;
