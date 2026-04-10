import { forwardRef } from 'react';
import { getArchetypeByName } from '@/lib/archetypes';
import type { ShareCardData } from './ShareCard';

const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

/**
 * 1080×1080 archetype-specific share card for social media.
 * Split-panel: left = archetype color + emoji + name, right = dark stats panel.
 * Falls back to null render if archetype data is missing — caller should use
 * the default ShareCard in that case.
 */
const ArchetypeShareCard = forwardRef<HTMLDivElement, { data: ShareCardData }>(
  ({ data }, ref) => {
    const arch = data.archetype?.name
      ? getArchetypeByName(data.archetype.name)
      : null;

    if (!arch) return null;

    // Determine if archetype color is light enough to need dark text
    const needsDarkText = arch.color === '#D29922' || arch.color === '#00C9A7';
    const leftText = needsDarkText ? '#0D1117' : '#F0F2F5';
    const leftTextMuted = needsDarkText ? 'rgba(13,17,23,0.7)' : 'rgba(240,242,245,0.7)';

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1080,
          display: 'flex',
          flexDirection: 'row',
          fontFamily: FONT_HEADING,
          borderRadius: 2,
          overflow: 'hidden',
          background: '#0D1117',
        }}
      >
        {/* Left panel — archetype color */}
        <div
          style={{
            width: 475,
            background: arch.color,
            padding: '72px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div style={{ fontFamily: FONT_HEADING, fontSize: 22, letterSpacing: 1.5 }}>
            <span style={{ fontWeight: 900, color: leftText }}>BET</span>
            <span style={{ fontWeight: 300, color: leftTextMuted }}>AUTOPSY</span>
          </div>

          {/* Archetype hero */}
          <div>
            <div style={{ fontSize: 120, lineHeight: 1 }}>{arch.emoji}</div>
            <div
              style={{
                fontWeight: 800,
                fontSize: arch.name.length > 16 ? 52 : 60,
                lineHeight: 1.05,
                color: leftText,
                marginTop: 20,
                letterSpacing: -1,
              }}
            >
              {arch.name}
            </div>
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.5,
                color: leftTextMuted,
                marginTop: 12,
                maxWidth: 360,
              }}
            >
              {arch.oneLiner}
            </div>
          </div>

          {/* Bottom spacer to push content up */}
          <div style={{ fontSize: 14, color: leftTextMuted, fontFamily: FONT_MONO, letterSpacing: 2 }}>
            BEHAVIORAL PROFILE
          </div>
        </div>

        {/* Right panel — dark stats */}
        <div
          style={{
            flex: 1,
            background: '#0D1117',
            padding: '72px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Stats */}
          <div>
            {/* Overall Grade */}
            <div style={{ marginBottom: 56 }}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 14,
                  color: '#7A8494',
                  letterSpacing: 3,
                  marginBottom: 8,
                }}
              >
                OVERALL GRADE
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 80,
                  fontWeight: 700,
                  color: '#F0F2F5',
                  lineHeight: 1,
                }}
              >
                {data.grade}
              </div>
            </div>

            {/* Emotion Score */}
            <div style={{ marginBottom: 56 }}>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 14,
                  color: '#7A8494',
                  letterSpacing: 3,
                  marginBottom: 8,
                }}
              >
                EMOTION SCORE
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 56,
                    fontWeight: 700,
                    color: data.emotion_score <= 30 ? '#00C9A7' : data.emotion_score <= 55 ? '#D29922' : '#E8453C',
                    lineHeight: 1,
                  }}
                >
                  {Math.round(data.emotion_score)}
                </span>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 24,
                    color: '#5A6474',
                  }}
                >
                  / 100
                </span>
              </div>
            </div>

            {/* Discipline Score */}
            {data.discipline_score != null && (
              <div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 14,
                    color: '#7A8494',
                    letterSpacing: 3,
                    marginBottom: 8,
                  }}
                >
                  DISCIPLINE SCORE
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 56,
                      fontWeight: 700,
                      color: data.discipline_score >= 60 ? '#00C9A7' : data.discipline_score >= 40 ? '#D29922' : '#E8453C',
                      lineHeight: 1,
                    }}
                  >
                    {Math.round(data.discipline_score)}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 24,
                      color: '#5A6474',
                    }}
                  >
                    / 100
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom branding */}
          <div>
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: '#00C9A7', letterSpacing: 1 }}>
                betautopsy.com
              </div>
              <div style={{ fontFamily: FONT_HEADING, fontSize: 16, letterSpacing: 1 }}>
                <span style={{ fontWeight: 900, color: '#F0F2F5' }}>BET</span>
                <span style={{ fontWeight: 300, color: '#00C9A7' }}>AUTOPSY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ArchetypeShareCard.displayName = 'ArchetypeShareCard';
export default ArchetypeShareCard;
