import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'See what your betting data is trying to tell you.';

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
          color: '#fbf9ff',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, marginBottom: 40 }}>
          <span style={{ fontWeight: 900, color: '#fbf9ff' }}>BET</span>
          <span style={{ fontWeight: 300, color: '#00C9A7' }}>AUTOPSY</span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            lineHeight: 1.2,
            maxWidth: 900,
            color: '#fbf9ff',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#00C9A7',
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
