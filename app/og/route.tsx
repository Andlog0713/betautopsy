import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customTitle = searchParams.get('title');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0A0E12',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          color: '#EDEDF3',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, marginBottom: 40 }}>
          <span style={{ fontWeight: 900, color: '#EDEDF3' }}>BET</span>
          <span style={{ fontWeight: 300, color: '#FACC15' }}>AUTOPSY</span>
        </div>
        {customTitle ? (
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.3,
              maxWidth: 1000,
              color: '#EDEDF3',
            }}
          >
            {customTitle}
          </div>
        ) : (
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.3,
              maxWidth: 1000,
              display: 'flex',
              flexWrap: 'wrap',
              color: '#EDEDF3',
            }}
          >
            <span style={{ whiteSpace: 'pre' }}>See what your </span>
            <span style={{ color: '#FACC15', whiteSpace: 'pre' }}>betting data </span>
            <span>is trying to tell you.</span>
          </div>
        )}
        <div
          style={{
            fontSize: 20,
            color: '#FACC15',
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
