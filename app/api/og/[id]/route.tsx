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
  if (g.startsWith('A')) return '#00C9A7';
  if (g.startsWith('B')) return '#D29922';
  if (g.startsWith('C')) return '#E8453C';
  return '#E8453C';
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
  const roiColor = d.roi_percent >= 0 ? '#00C9A7' : '#E8453C';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#0D1117', display: 'flex', flexDirection: 'row', padding: 60, color: '#F0F2F5' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 24 }}>
            {/* Incision Mark */}
            <svg width="24" height="36" viewBox="0 0 40 60" fill="none">
              <path d="M4,4 Q8.6,11.5 20,19" stroke="#00C9A7" strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M36,4 Q31.4,11.5 20,19" stroke="#00C9A7" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="20" y1="19" x2="20" y2="56" stroke="#00C9A7" strokeWidth="3.5" strokeLinecap="round"/>
              <circle cx="20" cy="19" r="4" fill="#E8453C"/>
            </svg>
            <span style={{ letterSpacing: 2 }}>
              <span style={{ fontWeight: 900, color: '#F0F2F5' }}>BET</span>
              <span style={{ fontWeight: 300, color: '#F0F2F5' }}>AUTOPSY</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 14, color: '#848D9A', letterSpacing: 3 }}>BET DNA</div>
            <div style={{ fontSize: 44, color: gc, marginTop: 8 }}>{archName}</div>
            <div style={{ fontSize: 16, color: '#848D9A', marginTop: 8 }}>{archDesc}</div>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: '#848D9A' }}>Record</span>
              <span style={{ fontSize: 18, color: '#F0F2F5', marginTop: 2 }}>{d.record}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: '#848D9A' }}>Emotion</span>
              <span style={{ fontSize: 18, color: '#F0F2F5', marginTop: 2 }}>{d.emotion_score}/100</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: '#848D9A' }}>Bets</span>
              <span style={{ fontSize: 18, color: '#F0F2F5', marginTop: 2 }}>{d.total_bets}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 13, color: '#515968' }}>betautopsy.com</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 260 }}>
          <div style={{ fontSize: 13, color: '#848D9A', letterSpacing: 3, marginBottom: 8 }}>GRADE</div>
          <div style={{ fontSize: 130, fontWeight: 700, color: gc, lineHeight: 1 }}>{d.grade}</div>
          <div style={{ fontSize: 13, color: '#848D9A', marginTop: 20 }}>ROI</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: roiColor, marginTop: 4 }}>{roiStr}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
