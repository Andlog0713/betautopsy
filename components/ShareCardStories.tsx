'use client';

import { forwardRef } from 'react';
import type { ShareCardData } from './ShareCard';
import type { BehavioralInsight, PatternComparison } from '@/lib/share-helpers';

const SANS = "'Inter', -apple-system, sans-serif";

// Logo mark matching reference: viewBox 40x60, strokeWidth 4
function LogoMark({ dark = false }: { dark?: boolean }) {
  const strokeColor = dark ? '#0D1117' : '#00C9A7';
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
  const accentColor = dark ? '#0D1117' : '#00C9A7';
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
  comparison: PatternComparison;
  roastLine: string;
}

// ── Slide 1: Personality (bg: #00C9A7) ──

export const StorySlidePersonality = forwardRef<HTMLDivElement, StorySlideProps>(({ data, roastLine }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';

  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#00C9A7',
      fontFamily: SANS, color: '#0D1117',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo dark />
      <div style={{ flex: 1 }} />
      <div>
        <div style={{ fontSize: 50, color: '#0D1117', opacity: 0.7, marginBottom: 60 }}>
          Your betting personality is
        </div>
        <div style={{ fontSize: 220, fontWeight: 900, lineHeight: 0.92, letterSpacing: -6, color: '#0D1117' }}>
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

// ── Slide 2: Behavioral Insight (bg: #0D1117) ──

export const StorySlideBehavioral = forwardRef<HTMLDivElement, StorySlideProps>(({ insight }, ref) => {
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#0D1117',
      fontFamily: SANS, color: '#F0F2F5',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo />
      <div style={{ flex: 1 }} />
      <div>
        <div style={{ fontSize: 55, color: '#00C9A7', marginBottom: 50 }}>
          {insight.contextLabel}
        </div>
        <div style={{ fontSize: 320, fontWeight: 900, lineHeight: 0.85, letterSpacing: -10 }}>
          {insight.heroStat}
        </div>
        <div style={{ fontSize: 80, fontWeight: 700, marginTop: 50, lineHeight: 1.3 }}>
          {insight.heroLabel}
        </div>
        <div style={{ fontSize: 55, color: '#848D9A', marginTop: 70, lineHeight: 1.5 }}>
          {insight.verdict}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 40, color: '#848D9A' }}>betautopsy.com</div>
    </div>
  );
});
StorySlideBehavioral.displayName = 'StorySlideBehavioral';

// ── Slide 3: Pattern Comparison (bg: #E8453C) ──

export const StorySlideComparison = forwardRef<HTMLDivElement, StorySlideProps>(({ comparison }, ref) => {
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#E8453C',
      fontFamily: SANS, color: '#fff',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo dark />
      <div style={{ flex: 1 }} />
      <div>
        <div style={{ fontSize: 50, color: '#0D1117', marginBottom: 40, fontWeight: 500 }}>
          {comparison.topLabel}
        </div>
        <div style={{ fontSize: 280, fontWeight: 900, lineHeight: 0.9, letterSpacing: -8, color: '#fff' }}>
          {comparison.topValue}
        </div>
        <div style={{ fontSize: 50, color: '#0D1117', marginTop: 80, marginBottom: 40, fontWeight: 500 }}>
          {comparison.bottomLabel}
        </div>
        <div style={{ fontSize: 280, fontWeight: 900, lineHeight: 0.9, letterSpacing: -8, color: '#fff' }}>
          {comparison.bottomValue}
        </div>
        <div style={{ fontSize: 55, color: '#fff', marginTop: 70, lineHeight: 1.5, fontWeight: 400, opacity: 0.85 }}>
          {comparison.punchline}
        </div>
      </div>
      <div style={{ flex: 0.8 }} />
      <div style={{ fontSize: 40, color: 'rgba(255,255,255,0.35)' }}>betautopsy.com</div>
    </div>
  );
});
StorySlideComparison.displayName = 'StorySlideComparison';

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
        <path d="M4,4 Q8.6,11.5 20,19" stroke="#00C9A7" strokeWidth="3.7" strokeLinecap="round"/>
        <path d="M36,4 Q31.4,11.5 20,19" stroke="#00C9A7" strokeWidth="3.7" strokeLinecap="round"/>
        <line x1="20" y1="19" x2="20" y2="56" stroke="#00C9A7" strokeWidth="3.7" strokeLinecap="round"/>
        <circle cx="20" cy="19" r="4" fill="#E8453C"/>
      </svg>
      <div style={{ fontSize: 130, fontWeight: 900, lineHeight: 1.15, letterSpacing: -2, marginBottom: 80 }}>
        What does your betting say about you?
      </div>
      <div style={{ fontSize: 55, color: '#00C9A7', fontWeight: 600 }}>
        betautopsy.com
      </div>
    </div>
  );
});
StorySlideCTA.displayName = 'StorySlideCTA';

export const SLIDE_LABELS = ['Personality', 'Insight', 'Compare', 'CTA'] as const;
export const SLIDE_COMPONENTS = [StorySlidePersonality, StorySlideBehavioral, StorySlideComparison, StorySlideCTA] as const;
export default StorySlidePersonality;
