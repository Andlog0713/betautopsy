'use client';

import { forwardRef } from 'react';
import type { ShareCardData } from './ShareCard';
import type { BehavioralInsight, RoastStat } from '@/lib/share-helpers';

const SANS = "'Inter', -apple-system, sans-serif";

function LogoMark({ dark = false }: { dark?: boolean }) {
  const strokeColor = dark ? '#0A0E12' : '#FACC15';
  const strokeOp = dark ? 0.6 : 1;
  const dotColor = dark ? '#0A0E12' : '#FF4D4D';
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
  const textColor = dark ? '#0A0E12' : '#F0F2F5';
  const accentColor = dark ? '#0A0E12' : '#FACC15';
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

// ── Slide 1: Personality (bg: #FACC15 brand yellow) ──

export const StorySlidePersonality = forwardRef<HTMLDivElement, StorySlideProps>(({ data, roastLine }, ref) => {
  const archName = data.archetype?.name ?? 'The Grinder';
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#FACC15',
      fontFamily: SANS, color: '#0A0E12',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo dark />
      <div style={{ flex: 1 }} />
      <div>
        <div style={{ fontSize: 50, color: '#0A0E12', opacity: 0.7, marginBottom: 60 }}>
          Your betting personality is
        </div>
        <div style={{ fontSize: 220, fontWeight: 900, lineHeight: 0.92, letterSpacing: -6 }}>
          {archName}
        </div>
        <div style={{ fontSize: 60, color: '#0A0E12', opacity: 0.75, marginTop: 70, lineHeight: 1.5 }}>
          {roastLine}
        </div>
      </div>
      <div style={{ flex: 0.6 }} />
      <div style={{ fontSize: 40, color: '#0A0E12', opacity: 0.5 }}>betautopsy.com</div>
    </div>
  );
});
StorySlidePersonality.displayName = 'StorySlidePersonality';

// ── Slide 2: Behavioral Split (bg: #0A0E12) ──
// Shows disciplined vs emotional bet performance
// Falls back to behavioral insight if no annotation data

export const StorySlideBehavioral = forwardRef<HTMLDivElement, StorySlideProps>(({ data, insight }, ref) => {
  const hasAnnotations = data.disciplinedRecord && data.emotionalRecord;

  if (!hasAnnotations) {
    // Fallback: behavioral insight (post-loss acceleration, session escalation, or emotion score)
    return (
      <div ref={ref} style={{
        width: 1080, height: 1920, background: '#0A0E12',
        fontFamily: SANS, color: '#F0F2F5',
        display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
      }}>
        <Logo />
        <div style={{ flex: 1 }} />
        <div>
          <div style={{ fontSize: 55, color: '#FACC15', marginBottom: 50 }}>{insight.contextLabel}</div>
          <div style={{ fontSize: 320, fontWeight: 900, lineHeight: 0.85, letterSpacing: -10 }}>{insight.heroStat}</div>
          <div style={{ fontSize: 80, fontWeight: 700, marginTop: 50, lineHeight: 1.3 }}>{insight.heroLabel}</div>
          <div style={{ fontSize: 55, color: '#F0F2F5', marginTop: 70, lineHeight: 1.5 }}>{insight.verdict}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 40, color: '#F0F2F5' }}>betautopsy.com</div>
      </div>
    );
  }

  const disc = data.disciplinedRecord!;
  const emo = data.emotionalRecord!;
  const punchline = getBehavioralPunchline(disc.roi, emo.roi);

  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#0A0E12',
      fontFamily: SANS, color: '#F0F2F5',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo />
      <div style={{ flex: 1 }} />
      <div>
        {/* Disciplined */}
        <div style={{ fontSize: 50, color: '#00DC82', marginBottom: 30 }}>{"When you're disciplined"}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 30 }}>
          <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4 }}>{disc.bets}</div>
          <div style={{ fontSize: 60, fontWeight: 400, color: '#F0F2F5' }}>bets</div>
        </div>
        <div style={{ fontSize: 80, fontWeight: 700, color: '#00DC82', marginTop: 10 }}>
          {disc.roi >= 0 ? '+' : ''}{disc.roi}% ROI
        </div>

        <div style={{ flex: 0, height: 80 }} />

        {/* Emotional */}
        <div style={{ fontSize: 50, color: '#FF4D4D', marginTop: 80, marginBottom: 30 }}>{"When you're emotional"}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 30 }}>
          <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4 }}>{emo.bets}</div>
          <div style={{ fontSize: 60, fontWeight: 400, color: '#F0F2F5' }}>bets</div>
        </div>
        <div style={{ fontSize: 80, fontWeight: 700, color: '#FF4D4D', marginTop: 10 }}>
          {emo.roi >= 0 ? '+' : ''}{emo.roi}% ROI
        </div>

        {/* Punchline */}
        <div style={{ fontSize: 55, color: '#F0F2F5', marginTop: 80, lineHeight: 1.5 }}>
          {punchline}
        </div>
      </div>
      <div style={{ flex: 0.8 }} />
      <div style={{ fontSize: 40, color: '#F0F2F5' }}>betautopsy.com</div>
    </div>
  );
});
StorySlideBehavioral.displayName = 'StorySlideBehavioral';

// ── Slide 3: The Receipt (bg: #FF4D4D) ──
// Shows ONE specific, funny, relatable roast stat

export const StorySlideReceipt = forwardRef<HTMLDivElement, StorySlideProps>(({ roastStats }, ref) => {
  const stat = roastStats[0];
  const hasRoast = stat && stat.text;

  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#FF4D4D',
      fontFamily: SANS, color: '#fff',
      display: 'flex', flexDirection: 'column', padding: '120px 90px 100px',
    }}>
      <Logo dark />
      <div style={{ flex: 0.5 }} />
      <div>
        <div style={{ fontSize: 40, color: '#0A0E12', marginBottom: 60 }}>THE RECEIPTS</div>
        {hasRoast ? (
          <>
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
      <div style={{ fontSize: 40, color: 'rgba(255,255,255,0.75)' }}>betautopsy.com</div>
    </div>
  );
});
StorySlideReceipt.displayName = 'StorySlideReceipt';

// ── Slide 4: CTA (bg: #0A0E12) ──

export const StorySlideCTA = forwardRef<HTMLDivElement, StorySlideProps>((_, ref) => {
  return (
    <div ref={ref} style={{
      width: 1080, height: 1920, background: '#0A0E12',
      fontFamily: SANS, color: '#F0F2F5',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '120px 90px',
    }}>
      <svg width="180" height="180" viewBox="310 110 305 305" fill="none" style={{ marginBottom: 140 }}>
        <path fill="#FACC15" d="M324.645 128.243C326.245 128.816 338.911 139.108 341.313 140.989C380.166 171.663 418.416 203.092 456.042 235.259C455.606 249.463 455.993 265.963 455.989 280.356L456.002 370.545C456.004 383.669 456.336 398.162 455.879 411.129L455.518 411.048C453.001 407.401 448.515 398.95 446.072 394.723L426.176 360.435L426.221 264.719C408.136 241.715 389.974 217.123 372.396 193.687C361.978 179.871 351.689 165.959 341.53 151.952C335.908 144.212 329.956 136.162 324.645 128.243Z"/>
        <path fill="#FACC15" d="M599.898 128.243C598.299 128.816 585.633 139.108 583.23 140.989C544.377 171.663 506.127 203.092 468.501 235.259C468.937 249.463 468.55 265.963 468.554 280.356L468.541 370.545C468.539 383.669 468.207 398.162 468.665 411.129L469.025 411.048C471.542 407.401 476.028 398.95 478.471 394.723L498.368 360.435L498.322 264.719C516.407 241.715 534.569 217.123 552.147 193.687C562.565 179.871 572.854 165.959 583.013 151.952C588.635 144.212 594.587 136.162 599.898 128.243Z"/>
      </svg>
      <div style={{ fontSize: 130, fontWeight: 900, lineHeight: 1.15, letterSpacing: -2, marginBottom: 80 }}>
        What does your betting say about you?
      </div>
      <div style={{ fontSize: 55, color: '#FACC15', fontWeight: 600 }}>betautopsy.com</div>
    </div>
  );
});
StorySlideCTA.displayName = 'StorySlideCTA';

export const SLIDE_LABELS = ['Personality', 'Insight', 'Receipt', 'CTA'] as const;
export const SLIDE_COMPONENTS = [StorySlidePersonality, StorySlideBehavioral, StorySlideReceipt, StorySlideCTA] as const;
export default StorySlidePersonality;
