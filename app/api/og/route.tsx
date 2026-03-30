import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'AI-Powered Sports Betting Behavioral Analysis';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0f0e0c',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          color: '#F0F0F0',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, marginBottom: 40 }}>
          <span style={{ color: '#F0F0F0' }}>Bet</span>
          <span style={{ color: '#f97316' }}>Autopsy</span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: 900,
            color: '#F0F0F0',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#A0A3B1',
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
