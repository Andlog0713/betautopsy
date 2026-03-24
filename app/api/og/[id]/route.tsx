import { ImageResponse } from 'next/og';

export const runtime = 'edge';

interface ShareData {
  grade: string;
  emotion_score: number;
  roi_percent: number;
  total_bets: number;
  record: string;
  best_edge: { category: string; roi: number } | null;
  biggest_leak: { category: string; roi: number } | null;
  archetype: { name: string; description: string } | null;
}

function gradeColor(g: string): string {
  if (g.startsWith('A')) return '#00C853';
  if (g.startsWith('B')) return '#fbbf24';
  if (g.startsWith('C')) return '#f97316';
  return '#f87171';
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch share data via Supabase REST API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eekubnadizmtuhnxzcig.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  let d: ShareData;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/share_tokens?select=data&id=eq.${id}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const rows = await res.json();
    if (!rows || !Array.isArray(rows) || !rows[0]?.data) {
      return new Response('Not found', { status: 404 });
    }
    d = rows[0].data as ShareData;
  } catch {
    return new Response('Error fetching data', { status: 500 });
  }
  const gc = gradeColor(d.grade);

  const archName = d.archetype?.name ?? '';
  const archDesc = d.archetype?.description ?? '';
  const roiStr = `${d.roi_percent >= 0 ? '+' : ''}${d.roi_percent.toFixed(1)}%`;
  const roiColor = d.roi_percent >= 0 ? '#00C853' : '#f87171';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#0f0e0c', display: 'flex', flexDirection: 'row', padding: 60, color: '#F0F0F0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: 40 }}>
          <div style={{ display: 'flex', fontSize: 28 }}>
            <span style={{ color: '#F0F0F0' }}>Bet</span>
            <span style={{ color: '#f97316' }}>Autopsy</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 14, color: '#A0A3B1', letterSpacing: 3 }}>BET DNA</div>
            <div style={{ fontSize: 44, color: '#f97316', marginTop: 8 }}>{archName}</div>
            <div style={{ fontSize: 16, color: '#A0A3B1', marginTop: 8 }}>{archDesc}</div>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: '#A0A3B1' }}>Record</span>
              <span style={{ fontSize: 18, color: '#F0F0F0', marginTop: 2 }}>{d.record}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: '#A0A3B1' }}>Emotion</span>
              <span style={{ fontSize: 18, color: '#F0F0F0', marginTop: 2 }}>{d.emotion_score}/100</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: '#A0A3B1' }}>Bets</span>
              <span style={{ fontSize: 18, color: '#F0F0F0', marginTop: 2 }}>{d.total_bets}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 13, color: '#5A5C6F' }}>betautopsy.com</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 260 }}>
          <div style={{ fontSize: 13, color: '#A0A3B1', letterSpacing: 3, marginBottom: 8 }}>GRADE</div>
          <div style={{ fontSize: 130, fontWeight: 700, color: gc, lineHeight: 1 }}>{d.grade}</div>
          <div style={{ fontSize: 13, color: '#A0A3B1', marginTop: 20 }}>ROI</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: roiColor, marginTop: 4 }}>{roiStr}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
