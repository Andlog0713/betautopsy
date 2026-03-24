import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';

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

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-mint-500';
  if (grade.startsWith('B')) return 'text-mint-500/70';
  if (grade.startsWith('C')) return 'text-amber-400';
  if (grade.startsWith('D')) return 'text-orange-400';
  return 'text-red-400';
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getShareData(id);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-bold text-3xl mb-2">Link expired</h1>
          <p className="text-ink-600">This share link is no longer available.</p>
          <Link href="/" className="btn-primary inline-block mt-4">Get Your Own Autopsy</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="card p-8 space-y-6">
          {/* Logo */}
          <div className="text-center">
            <span className="font-bold text-xl">
              Bet<span className="text-flame-500">Autopsy</span>
            </span>
          </div>

          {/* Archetype */}
          {data.archetype && (
            <div className="text-center">
              <p className="text-ink-600 text-xs uppercase tracking-wider">Bet DNA</p>
              <p className="font-bold text-lg text-flame-500">{data.archetype.name}</p>
              <p className="text-ink-600 text-xs mt-1">{data.archetype.description}</p>
            </div>
          )}

          {/* Grade */}
          <div className="text-center">
            <p className="text-ink-600 text-xs uppercase tracking-wider mb-1">Overall Grade</p>
            <span className={`font-bold text-7xl font-bold ${gradeColor(data.grade)}`}>
              {data.grade}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-ink-600 text-xs">Emotion Score</p>
              <p className="font-mono text-lg font-semibold text-[#F0F0F0]">{data.emotion_score}/100</p>
            </div>
            <div className="text-center">
              <p className="text-ink-600 text-xs">ROI</p>
              <p className={`font-mono text-lg font-semibold ${data.roi_percent >= 0 ? 'text-mint-500' : 'text-red-400'}`}>
                {data.roi_percent >= 0 ? '+' : ''}{data.roi_percent.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-ink-600 text-xs">Record</p>
              <p className="font-mono text-lg font-semibold text-[#F0F0F0]">{data.record}</p>
            </div>
            <div className="text-center">
              <p className="text-ink-600 text-xs">Total Bets</p>
              <p className="font-mono text-lg font-semibold text-[#F0F0F0]">{data.total_bets}</p>
            </div>
          </div>

          {/* Edge & Leak */}
          {(data.best_edge || data.biggest_leak) && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-ink-700/30">
              {data.best_edge && (
                <div className="text-center">
                  <p className="text-ink-600 text-xs">Best Edge</p>
                  <p className="text-mint-500 text-sm font-medium">{data.best_edge.category}</p>
                  <p className="font-mono text-xs text-mint-500">+{data.best_edge.roi.toFixed(1)}%</p>
                </div>
              )}
              {data.biggest_leak && (
                <div className="text-center">
                  <p className="text-ink-600 text-xs">Biggest Leak</p>
                  <p className="text-red-400 text-sm font-medium">{data.biggest_leak.category}</p>
                  <p className="font-mono text-xs text-red-400">{data.biggest_leak.roi.toFixed(1)}%</p>
                </div>
              )}
            </div>
          )}

          {/* Sharp Score */}
          {data.sharp_score !== null && (
            <div className="pt-2 border-t border-ink-700/30">
              <div className="flex items-center justify-between mb-1">
                <p className="text-ink-600 text-xs">Sharp Score</p>
                <p className="font-mono text-sm text-cyan-400">{data.sharp_score}/100</p>
              </div>
              <div className="h-2 bg-ink-900 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${data.sharp_score}%` }} />
              </div>
            </div>
          )}

          {/* Date */}
          <p className="text-ink-700 text-xs text-center">
            Generated {new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          {/* CTA */}
          <Link href="/signup" className="btn-primary w-full text-center block">
            Get Your Own Autopsy — Free
          </Link>
        </div>

        <p className="text-ink-700 text-xs text-center mt-6">
          BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice.
        </p>
      </div>
    </div>
  );
}
