import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import SharedReport from './SharedReport';

interface ShareData {
  grade: string;
  emotion_score: number;
  roi_percent: number;
  total_bets: number;
  record: string;
  best_edge: { category: string; roi: number } | null;
  biggest_leak: { category: string; roi: number } | null;
  sharp_score: number | null;
  archetype: { name: string; description: string } | null;
  date: string;
  report_json?: Record<string, unknown>;
}

async function getShareData(id: string): Promise<ShareData | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data } = await supabase
    .from('share_tokens')
    .select('data')
    .eq('id', id)
    .single();

  return data?.data as ShareData | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getShareData(id);
  if (!data) return { title: 'BetAutopsy' };

  const title = data.archetype
    ? `My BetAutopsy: ${data.grade} — ${data.archetype.name}`
    : `My BetAutopsy: Grade ${data.grade}`;
  const desc = `Emotion Score: ${data.emotion_score}/100 | ROI: ${data.roi_percent >= 0 ? '+' : ''}${data.roi_percent.toFixed(1)}% | ${data.record}${data.archetype ? ` | ${data.archetype.description}` : ''}`;
  const ogImage = `${process.env.NEXT_PUBLIC_APP_URL || 'https://betautopsy.com'}/api/og/${id}`;

  return {
    title,
    description: desc,
    openGraph: { title, description: desc, siteName: 'BetAutopsy', images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: desc, images: [ogImage] },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getShareData(id);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-bold text-3xl mb-2">Link expired</h1>
          <p className="text-fg-muted">This share link is no longer available.</p>
          <Link href="/" className="btn-primary inline-block mt-4">Get Your Own Autopsy</Link>
        </div>
      </div>
    );
  }

  return <SharedReport data={data} />;
}
