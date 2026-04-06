'use client';

import { forwardRef } from 'react';
import type { ShareCardData } from './ShareCard';
import type { BehavioralInsight, PatternComparison } from '@/lib/share-helpers';

const MONO = "'JetBrains Mono', monospace";
const SANS = "'Inter', -apple-system, sans-serif";

function IncisionMark({ color = '#0D1117', size = 40 }: { color?: string; size?: number }) {
  const w = size * 0.6;
  const h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 28" fill="none">
      <path d="M2,2 Q3.8,5.2 9,8.5" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M16,2 Q14.2,5.2 9,8.5" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
      <line x1="9" y1="8.5" x2="9" y2="26" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="9" cy="8.5" r="1.9" fill="#E8453C"/>
    </svg>
  );
}

function Logo({ dark = false, size = 40 }: { dark?: boolean; size?: number }) {
  const markColor = dark ? '#0D1117' : '#00C9A7';
  const textColor = dark ? '#0D1117' : '#F0F2F5';
  const accentColor = dark ? '#0D1117' : '#00C9A7';
  const fontSize = Math.round(size * 0.7);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }}>
      <IncisionMark color={markColor} size={size} />
      <div style={{ fontFamily: SANS, fontSize, fontWeight: 700, letterSpacing: 1.5 }}>
        <span style={{ fontWeight: 900, color: textColor }}>BET</span>
        <span style={{ fontWeight: 300, color: accentColor }}>AUTOPSY</span>
      </div>
    </div>
  );
}

export interface StorySlideProps {
  data: ShareCardData;
  insight: BehavioralInsight;
  comparison: PatternComparison;
  roastLine: string;
}

// ── Slide 1: Personality ──

export const StorySlidePersonality = forwardRef<HTMLDivElement, StorySlideProps>(({ data, roastLine }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';

  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#00C9A7',
      fontFamily: SANS, color: '#0D1117', position: 'relative',
      display: 'flex', flexDirection: 'column', padding: '80px 80px 60px',
    }}>
      <Logo dark size={48} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#065F50', marginBottom: 24 }}>
          YOUR BETTING PERSONALITY IS
        </div>
        <div style={{ fontSize: 130, fontWeight: 900, lineHeight: 0.92, letterSpacing: -1.5, marginBottom: 32, color: '#0D1117' }}>
          {archName}
        </div>
        <div style={{ fontSize: 30, fontWeight: 400, color: '#064E42', lineHeight: 1.4, maxWidth: 800 }}>
          {roastLine}
        </div>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 18, color: '#065F50' }}>betautopsy.com</div>
    </div>
  );
});
StorySlidePersonality.displayName = 'StorySlidePersonality';

// ── Slide 2: Behavioral Insight ──

export const StorySlideBehavioral = forwardRef<HTMLDivElement, StorySlideProps>(({ insight }, ref) => {
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#0D1117',
      fontFamily: SANS, color: '#F0F2F5', position: 'relative',
      display: 'flex', flexDirection: 'column', padding: '80px 80px 60px',
    }}>
      <Logo size={48} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#00C9A7', marginBottom: 32 }}>
          {insight.contextLabel}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 180, fontWeight: 700, lineHeight: 0.9, letterSpacing: -3, marginBottom: 24, color: '#F0F2F5' }}>
          {insight.heroStat}
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.3, marginBottom: 32, maxWidth: 800, color: '#F0F2F5' }}>
          {insight.heroLabel}
        </div>
        <div style={{ fontSize: 24, fontWeight: 400, color: '#848D9A', lineHeight: 1.5, maxWidth: 750 }}>
          {insight.verdict}
        </div>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 18, color: '#515968' }}>betautopsy.com</div>
    </div>
  );
});
StorySlideBehavioral.displayName = 'StorySlideBehavioral';

// ── Slide 3: Pattern Comparison ──

export const StorySlideComparison = forwardRef<HTMLDivElement, StorySlideProps>(({ comparison }, ref) => {
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#E8453C',
      fontFamily: SANS, color: '#0D1117', position: 'relative',
      display: 'flex', flexDirection: 'column', padding: '80px 80px 60px',
    }}>
      <Logo dark size={48} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Top stat */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#7A1F1A', marginBottom: 12 }}>
            {comparison.topLabel}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 140, fontWeight: 700, lineHeight: 0.9, letterSpacing: -2, color: '#0D1117' }}>
            {comparison.topValue}
          </div>
        </div>

        {/* Bottom stat */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#7A1F1A', marginBottom: 12 }}>
            {comparison.bottomLabel}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 140, fontWeight: 700, lineHeight: 0.9, letterSpacing: -2, color: '#0D1117' }}>
            {comparison.bottomValue}
          </div>
        </div>

        {/* Punchline */}
        <div style={{ fontSize: 28, fontWeight: 500, color: '#FFFFFF', lineHeight: 1.4, maxWidth: 750 }}>
          {comparison.punchline}
        </div>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 18, color: '#7A1F1A' }}>betautopsy.com</div>
    </div>
  );
});
StorySlideComparison.displayName = 'StorySlideComparison';

// ── Slide 4: CTA ──

export const StorySlideCTA = forwardRef<HTMLDivElement, StorySlideProps>((_, ref) => {
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#0D1117',
      fontFamily: SANS, color: '#F0F2F5', position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '80px 80px 60px',
    }}>
      <IncisionMark color="#00C9A7" size={100} />
      <div style={{ fontSize: 52, fontWeight: 900, textAlign: 'center', marginTop: 48, lineHeight: 1.2, maxWidth: 700, color: '#F0F2F5' }}>
        What does your betting say about you?
      </div>
      <div style={{ fontFamily: MONO, fontSize: 36, color: '#00C9A7', marginTop: 32 }}>
        betautopsy.com
      </div>
    </div>
  );
});
StorySlideCTA.displayName = 'StorySlideCTA';

export const SLIDE_LABELS = ['Personality', 'Insight', 'Compare', 'CTA'] as const;
export const SLIDE_COMPONENTS = [StorySlidePersonality, StorySlideBehavioral, StorySlideComparison, StorySlideCTA] as const;
export default StorySlidePersonality;
