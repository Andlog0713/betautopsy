import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

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
  sharp_score: number | null;
}

function gradeColor(g: string): string {
  if (g.startsWith('A')) return '#4ade80';
  if (g.startsWith('B')) return '#fbbf24';
  if (g.startsWith('C')) return '#f97316';
  return '#f87171';
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Use supabase-js directly (not SSR) since this is an edge function with no cookies
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from('share_tokens')
    .select('data')
    .eq('id', id)
    .single();

  if (!data?.data) {
    return new Response('Not found', { status: 404 });
  }

  const d = data.data as ShareData;
  const gc = gradeColor(d.grade);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #0f0e0c 0%, #1a1917 100%)',
          display: 'flex',
          padding: 60,
          fontFamily: 'sans-serif',
          color: '#e7e6e1',
        }}
      >
        {/* Left side */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          {/* Logo */}
          <div style={{ fontSize: 28, display: 'flex' }}>
            <span>Bet</span>
            <span style={{ color: '#f97316' }}>Autopsy</span>
          </div>

          {/* Archetype */}
          {d.archetype ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#9a9483' }}>
                BET DNA
              </div>
              <div style={{ fontSize: 48, color: '#f97316', marginTop: 8 }}>
                {d.archetype.name}
              </div>
              <div style={{ fontSize: 18, color: '#9a9483', marginTop: 8, maxWidth: 500 }}>
                {d.archetype.description}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}

          {/* Bottom stats */}
          <div style={{ display: 'flex', gap: 40, fontSize: 16, color: '#9a9483' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Record</span>
              <span style={{ color: '#e7e6e1', fontSize: 20, fontWeight: 600, marginTop: 4 }}>{d.record}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Emotion</span>
              <span style={{ color: '#e7e6e1', fontSize: 20, fontWeight: 600, marginTop: 4 }}>{d.emotion_score}/100</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Total Bets</span>
              <span style={{ color: '#e7e6e1', fontSize: 20, fontWeight: 600, marginTop: 4 }}>{d.total_bets}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 14 }}>betautopsy.com</span>
            </div>
          </div>
        </div>

        {/* Right side — Grade + ROI */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 280 }}>
          <div style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#9a9483', marginBottom: 12 }}>
            GRADE
          </div>
          <div style={{ fontSize: 140, fontWeight: 700, color: gc, lineHeight: 1 }}>
            {d.grade}
          </div>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: '#9a9483' }}>ROI</div>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              color: d.roi_percent >= 0 ? '#4ade80' : '#f87171',
              marginTop: 4,
            }}>
              {d.roi_percent >= 0 ? '+' : ''}{d.roi_percent.toFixed(1)}%
            </div>
          </div>
          {d.best_edge ? (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#4ade80' }}>Best Edge</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{d.best_edge.category}</div>
              <div style={{ fontSize: 14, color: '#4ade80' }}>+{d.best_edge.roi.toFixed(1)}%</div>
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
