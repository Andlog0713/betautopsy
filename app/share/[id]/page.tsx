import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import SharedReport from './SharedReport';
import ShareRedirectMobile from './ShareRedirectMobile';

// ──────────────────────────────────────────────────────────────────
// Dual-target behavior
//
// Web build (default): unchanged. The page is a Server Component
// that reads the request's cookies, looks the share token up in
// Supabase, and renders `<SharedReport>` (or an expired-link
// fallback). `generateMetadata` also reads the token so social
// previews get the right title / OG image.
//
// Mobile build (`NEXT_PUBLIC_BUILD_TARGET=mobile`, `output:
// 'export'`): this route cannot be prerendered per-id — share ids
// are user-generated and nothing enumerates them at build time —
// and `cookies()` is unavailable during SSG. So we pre-render a
// single placeholder entry, set `dynamicParams = false`, and the
// page body swaps to a client component that redirects into the
// system browser once the Capacitor shell mounts it.
// ──────────────────────────────────────────────────────────────────

const IS_MOBILE_BUILD = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';

export function generateStaticParams() {
  // For the mobile static export, emit exactly one stub entry so
  // Next is willing to build the dynamic segment. The native app
  // never navigates to `/share/<real-id>` via the Next router —
  // share links are handled by `ShareRedirectMobile` bouncing to
  // the external web URL.
  if (IS_MOBILE_BUILD) return [{ id: '__placeholder__' }];
  return [];
}

// Block dynamic params in the mobile build so unknown ids don't try
// to SSR-fall-through (there's no runtime). Leaves web unaffected
// because web doesn't use `output: 'export'`.
export const dynamicParams = !IS_MOBILE_BUILD;

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

  // Mobile build has no request context, no cookies(), no Supabase
  // at SSG — just return a generic title. The client redirect never
  // needs OG metadata because the canonical share page on the web
  // handles all social unfurling.
  if (IS_MOBILE_BUILD) return { title: 'BetAutopsy' };

  const data = await getShareData(id);
  if (!data) return { title: 'BetAutopsy' };

  const title = data.archetype
    ? `My BetAutopsy: ${data.grade} | ${data.archetype.name}`
    : `My BetAutopsy: Grade ${data.grade}`;
  const desc = `Emotion Score: ${data.emotion_score}/100 | ROI: ${data.roi_percent >= 0 ? '+' : ''}${data.roi_percent.toFixed(1)}% | ${data.record}${data.archetype ? ` | ${data.archetype.description}` : ''}`;
  const ogImage = `${process.env.NEXT_PUBLIC_APP_URL || 'https://betautopsy.com'}/og/${id}`;

  return {
    title,
    description: desc,
    openGraph: { title, description: desc, siteName: 'BetAutopsy', images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: desc, images: [ogImage] },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  if (IS_MOBILE_BUILD) {
    // Consume `params` so Next still treats this as an async server
    // component, but never touch cookies/Supabase.
    await params;
    return <ShareRedirectMobile />;
  }

  const { id } = await params;
  const data = await getShareData(id);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-bold text-3xl tracking-tight mb-2 text-fg-bright">Link expired</h1>
          <p className="text-fg-muted">This share link is no longer available.</p>
          <Link href="/" className="btn-primary inline-block mt-4">Get Your Own Autopsy</Link>
        </div>
      </div>
    );
  }

  return <SharedReport data={data} />;
}
