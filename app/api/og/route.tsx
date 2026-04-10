import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Sports Betting Behavioral Analysis';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0D1117',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          color: '#F0F2F5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          {/* Incision Mark */}
          <svg width="36" height="52" viewBox="0 0 40 60" fill="none">
            <path d="M4,4 Q8.6,11.5 20,19" stroke="#00C9A7" strokeWidth="3.5" strokeLinecap="round"/>
            <path d="M36,4 Q31.4,11.5 20,19" stroke="#00C9A7" strokeWidth="3.5" strokeLinecap="round"/>
            <line x1="20" y1="19" x2="20" y2="56" stroke="#00C9A7" strokeWidth="3.5" strokeLinecap="round"/>
            <circle cx="20" cy="19" r="4" fill="#E8453C"/>
            <circle cx="4" cy="4" r="1.8" fill="#00C9A7" opacity="0.45"/>
            <circle cx="36" cy="4" r="1.8" fill="#00C9A7" opacity="0.45"/>
            <circle cx="20" cy="56" r="1.8" fill="#00C9A7" opacity="0.45"/>
          </svg>
          <span style={{ fontSize: 32, letterSpacing: 3 }}>
            <span style={{ fontWeight: 900, color: '#F0F2F5' }}>BET</span>
            <span style={{ fontWeight: 300, color: '#F0F2F5' }}>AUTOPSY</span>
          </span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: 900,
            color: '#F0F2F5',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#848D9A',
            marginTop: 32,
          }}
        >
          betautopsy.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
