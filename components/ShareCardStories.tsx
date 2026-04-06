'use client';

import { forwardRef } from 'react';
import type { ShareCardData } from './ShareCard';
import type { BehavioralInsight, RoastStat } from '@/lib/share-helpers';

const SANS = "'Inter', -apple-system, sans-serif";

function LogoMark({ dark = false }: { dark?: boolean }) {
  const strokeColor = dark ? '#0D1117' : '#00FFCB';
  const strokeOp = dark ? 0.6 : 1;
  const dotColor = dark ? '#0D1117' : '#E8453C';
  return (
    <svg width="50" height="75" viewBox="0 0 40 60" fill="none">
      <path d="M4,4 Q8.6,11.5 20,19" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" strokeOpacity={strokeOp}/>
      <path d="M36,4 Q31.4,11.5 20,19" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" strokeOpacity={strokeOp}/>
      <line x1="20" y1="19" x2="20" y2="56" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" strokeOpacity={strokeOp}/>
      <circle cx="20" cy="19" r="4.5" fill={dotColor}/>
    </svg>
  );
}

function Logo({ dark = false }: { dark?: boolean }) {
  const textColor = dark ? '#0D1117' : '#F0F2F5';
  const accentColor = dark ? '#0D1117' : '#00FFCB';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <LogoMark dark={dark} />
      <span style={{ fontFamily: SANS, fontSize: 35, letterSpacing: 7, fontWeight: 800 }}>
        <span style={{ color: textColor }}>BET</span>
        <span style={{ fontWeight: 400, color: accentColor }}>AUTOPSY</span>
      </span>
    </div>
  );
}

export interface StorySlideProps {
  data: ShareCardData;
  insight: BehavioralInsight;
  roastLine: string;
  roastStats: RoastStat[];
}

function getBehavioralPunchline(discROI: number, emoROI: number): string {
  const gap = discROI - emoROI;
  if (gap > 20) return "You know what you're doing. Until you stop thinking.";
  if (gap > 10) return "Your disciplined bets carry you. Your emotional ones cost you.";
  if (gap > 0) return "Your emotions barely affect your results. That's rare.";
  return "Interesting. Your emotional bets actually outperform.";
}

// ── Slide 1: Personality (bg: #00FFCB) ──

export const StorySlidePersonality = forwardRef<HTMLDivElement, StorySlideProps>(({ data, roastLine }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#00FFCB',
      fontFamily: SANS, color: '#0D1117',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo dark />
      <div style={{ flex: 1 }} />
      <div>
        <div style={{ fontSize: 50, color: '#0D1117', opacity: 0.7, marginBottom: 60 }}>
          Your betting personality is
        </div>
        <div style={{ fontSize: 220, fontWeight: 900, lineHeight: 0.92, letterSpacing: -6 }}>
          {archName}
        </div>
        <div style={{ fontSize: 60, color: '#0D1117', opacity: 0.75, marginTop: 70, lineHeight: 1.5 }}>
          {roastLine}
        </div>
      </div>
      <div style={{ flex: 0.6 }} />
      <div style={{ fontSize: 40, color: '#0D1117', opacity: 0.5 }}>betautopsy.com</div>
    </div>
  );
});
StorySlidePersonality.displayName = 'StorySlidePersonality';

// ── Slide 2: Behavioral Split (bg: #0D1117) ──
// Shows disciplined vs emotional bet performance
// Falls back to behavioral insight if no annotation data

export const StorySlideBehavioral = forwardRef<HTMLDivElement, StorySlideProps>(({ data, insight }, ref) => {
  const hasAnnotations = data.disciplinedRecord && data.emotionalRecord;

  if (!hasAnnotations) {
    // Fallback: behavioral insight (post-loss acceleration, session escalation, or emotion score)
    return (
      <div ref={ref} style={{
        width: 1080, height: 1920, background: '#0D1117',
        fontFamily: SANS, color: '#F0F2F5',
        display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
      }}>
        <Logo />
        <div style={{ flex: 1 }} />
        <div>
          <div style={{ fontSize: 55, color: '#00FFCB', marginBottom: 50 }}>{insight.contextLabel}</div>
          <div style={{ fontSize: 320, fontWeight: 900, lineHeight: 0.85, letterSpacing: -10 }}>{insight.heroStat}</div>
          <div style={{ fontSize: 80, fontWeight: 700, marginTop: 50, lineHeight: 1.3 }}>{insight.heroLabel}</div>
          <div style={{ fontSize: 55, color: '#848D9A', marginTop: 70, lineHeight: 1.5 }}>{insight.verdict}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 40, color: '#848D9A' }}>betautopsy.com</div>
      </div>
    );
  }

  const disc = data.disciplinedRecord!;
  const emo = data.emotionalRecord!;
  const punchline = getBehavioralPunchline(disc.roi, emo.roi);

  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#0D1117',
      fontFamily: SANS, color: '#F0F2F5',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo />
      <div style={{ flex: 1 }} />
      <div>
        {/* Disciplined */}
        <div style={{ fontSize: 50, color: '#00FFCB', marginBottom: 30 }}>{"When you're disciplined"}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 30 }}>
          <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4 }}>{disc.bets}</div>
          <div style={{ fontSize: 60, fontWeight: 400, color: '#848D9A' }}>bets</div>
        </div>
        <div style={{ fontSize: 80, fontWeight: 700, color: '#00FFCB', marginTop: 10 }}>
          {disc.roi >= 0 ? '+' : ''}{disc.roi}% ROI
        </div>

        <div style={{ flex: 0, height: 80 }} />

        {/* Emotional */}
        <div style={{ fontSize: 50, color: '#E8453C', marginTop: 80, marginBottom: 30 }}>{"When you're emotional"}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 30 }}>
          <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4 }}>{emo.bets}</div>
          <div style={{ fontSize: 60, fontWeight: 400, color: '#848D9A' }}>bets</div>
        </div>
        <div style={{ fontSize: 80, fontWeight: 700, color: '#E8453C', marginTop: 10 }}>
          {emo.roi >= 0 ? '+' : ''}{emo.roi}% ROI
        </div>

        {/* Punchline */}
        <div style={{ fontSize: 55, color: '#848D9A', marginTop: 80, lineHeight: 1.5 }}>
          {punchline}
        </div>
      </div>
      <div style={{ flex: 0.8 }} />
      <div style={{ fontSize: 40, color: '#848D9A' }}>betautopsy.com</div>
    </div>
  );
});
StorySlideBehavioral.displayName = 'StorySlideBehavioral';

// ── Slide 3: The Receipt (bg: #E8453C) ──
// Shows ONE specific, funny, relatable roast stat

export const StorySlideReceipt = forwardRef<HTMLDivElement, StorySlideProps>(({ roastStats }, ref) => {
  const stat = roastStats[0];
  const hasRoast = stat && stat.text;

  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#E8453C',
      fontFamily: SANS, color: '#fff',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo dark />
      <div style={{ flex: 0.5 }} />
      <div>
        <div style={{ fontSize: 40, color: '#0D1117', marginBottom: 60 }}>THE RECEIPTS</div>
        {hasRoast ? (
          <>
            <div style={{ fontSize: 120, marginBottom: 50 }}>{stat.emoji}</div>
            <div style={{ fontSize: 90, fontWeight: 900, lineHeight: 1.25, letterSpacing: -2 }}>
              {stat.text}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 90, fontWeight: 900, lineHeight: 1.25, letterSpacing: -2 }}>
            Your betting history has stories. This is one of them.
          </div>
        )}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 40, color: 'rgba(255,255,255,0.35)' }}>betautopsy.com</div>
    </div>
  );
});
StorySlideReceipt.displayName = 'StorySlideReceipt';

// ── Slide 4: CTA (bg: #0D1117) ──

export const StorySlideCTA = forwardRef<HTMLDivElement, StorySlideProps>((_, ref) => {
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#0D1117',
      fontFamily: SANS, color: '#F0F2F5',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '120px 90px',
    }}>
      <svg width="180" height="270" viewBox="0 0 40 60" fill="none" style={{ marginBottom: 140 }}>
        <path d="M4,4 Q8.6,11.5 20,19" stroke="#00FFCB" strokeWidth="3.7" strokeLinecap="round"/>
        <path d="M36,4 Q31.4,11.5 20,19" stroke="#00FFCB" strokeWidth="3.7" strokeLinecap="round"/>
        <line x1="20" y1="19" x2="20" y2="56" stroke="#00FFCB" strokeWidth="3.7" strokeLinecap="round"/>
        <circle cx="20" cy="19" r="4" fill="#E8453C"/>
      </svg>
      <div style={{ fontSize: 130, fontWeight: 900, lineHeight: 1.15, letterSpacing: -2, marginBottom: 80 }}>
        What does your betting say about you?
      </div>
      <div style={{ fontSize: 55, color: '#00FFCB', fontWeight: 600 }}>betautopsy.com</div>
    </div>
  );
});
StorySlideCTA.displayName = 'StorySlideCTA';

export const SLIDE_LABELS = ['Personality', 'Insight', 'Receipt', 'CTA'] as const;
export const SLIDE_COMPONENTS = [StorySlidePersonality, StorySlideBehavioral, StorySlideReceipt, StorySlideCTA] as const;
export default StorySlidePersonality;
