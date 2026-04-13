import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { Logo } from '@/components/logo';
import LogoScroll from '@/components/LogoScroll';
import ResponsibleGambling from '@/components/ResponsibleGambling';
import GoPageView from './GoPageView';

// Paid-traffic metric counters refresh hourly so they stay fresh without
// hitting Supabase on every ad click.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'BetAutopsy: Find Your Betting Leaks',
  description:
    'Upload your betting history and get a forensic behavioral report. Find the patterns costing you money.',
  alternates: { canonical: '/go' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'BetAutopsy: Find Your Betting Leaks',
    description:
      'Upload your betting history. Get a forensic behavioral report in 60 seconds.',
    url: 'https://www.betautopsy.com/go',
    images: [{ url: '/og', width: 1200, height: 630 }],
  },
};

async function loadPlatformMetrics(): Promise<{ bets: number; reports: number } | null> {
  try {
    const supabase = createServiceRoleClient();
    const [betsRes, reportsRes] = await Promise.all([
      supabase.from('bets').select('id', { count: 'exact', head: true }),
      supabase.from('autopsy_reports').select('id', { count: 'exact', head: true }),
    ]);
    if (betsRes.error || reportsRes.error) return null;
    const bets = betsRes.count ?? 0;
    const reports = reportsRes.count ?? 0;
    if (bets <= 0 || reports <= 0) return null;
    return { bets, reports };
  } catch {
    return null;
  }
}

const PROMO_TEXT =
  '50% OFF · Full reports $9.99 · Code AUTOPSY50 · 50% OFF · Full reports $9.99 · Code AUTOPSY50';

const VALUE_ITEMS = [
  'Your betting grade from A+ to F',
  'Emotion Score: how much feelings drive your bets',
  'Every cognitive bias with exact dollar cost per quarter',
  'All betting sessions detected and graded A through F',
  'Your betting archetype (Surgeon, Heat Chaser, Grinder...)',
  'Personalized rules and action plan',
  '"Ask Your Autopsy" AI Q&A about your report',
];

function CheckIcon() {
  return (
    <svg
      className="text-scalpel w-4 h-4 mt-0.5 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="4 10 8 14 16 6" />
    </svg>
  );
}

export default async function GoLandingPage() {
  const platformMetrics = await loadPlatformMetrics();
  const year = new Date().getFullYear();
  const nf = new Intl.NumberFormat('en-US');

  return (
    <>
      <GoPageView />

      <style>{`
        @keyframes go-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .go-marquee-track {
          display: flex;
          align-items: center;
          width: max-content;
          animation: go-marquee 40s linear infinite;
          gap: 48px;
        }
        @media (max-width: 640px) {
          .go-marquee-track {
            animation-duration: 40s;
            gap: 32px;
          }
        }
      `}</style>

      {/* SECTION 1 — Promo marquee */}
      <a href="/signup" className="block bg-scalpel py-1.5 overflow-hidden">
        <div className="go-marquee-track">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="text-base font-mono text-[11px] font-bold tracking-wider whitespace-nowrap"
            >
              {PROMO_TEXT}
            </span>
          ))}
        </div>
      </a>

      {/* SECTION 2 — Sticky mini header */}
      <header className="sticky top-0 z-20 bg-base/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" aria-label="BetAutopsy home">
            <Logo size="xs" />
          </Link>
          <Link
            href="/signup"
            className="btn-primary text-sm !px-5 !py-2 !min-h-0"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* SECTION 3 — Hero */}
      <section className="relative grid-paper overflow-hidden pt-16 pb-12 md:pt-20 md:pb-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="font-extrabold text-3xl md:text-5xl leading-[1.1] tracking-tight text-fg-bright">
            Find out what your <span className="text-scalpel">betting patterns</span> are costing you.
          </h1>
          <p className="mt-4 text-fg-muted text-base md:text-lg font-light">
            Upload your history. Get a forensic behavioral report in 60 seconds.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="btn-primary text-base !px-10 !py-3.5"
            >
              Get Your Free Report
            </Link>
          </div>
          <p className="mt-3 text-fg-dim text-xs font-mono">
            Free snapshot. No credit card. Takes 2 minutes.
          </p>

          {platformMetrics && (
            <div className="mt-6 flex justify-center gap-10">
              <div>
                <div className="font-mono text-xl font-bold text-fg-bright">
                  {nf.format(platformMetrics.bets)}
                </div>
                <div className="font-mono text-[10px] text-fg-dim tracking-[2px] uppercase mt-1">
                  Bets Analyzed
                </div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-fg-bright">
                  {nf.format(platformMetrics.reports)}
                </div>
                <div className="font-mono text-[10px] text-fg-dim tracking-[2px] uppercase mt-1">
                  Reports Generated
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4 — Trust bar */}
      <div className="border-y border-border-subtle py-4 overflow-hidden">
        <LogoScroll />
      </div>

      {/* SECTION 5 — How it works */}
      <section className="bg-surface-1 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="case-header text-center mb-8">HOW IT WORKS</div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="case-card p-5">
              <div className="font-mono text-xs text-scalpel tracking-[2px]">01</div>
              <div className="font-bold text-fg-bright text-sm mt-2">Upload</div>
              <p className="text-fg-muted text-xs font-light mt-1.5">
                CSV, screenshot, or paste from any sportsbook or DFS app
              </p>
            </div>
            <div className="case-card p-5">
              <div className="font-mono text-xs text-scalpel tracking-[2px]">02</div>
              <div className="font-bold text-fg-bright text-sm mt-2">Analyze</div>
              <p className="text-fg-muted text-xs font-light mt-1.5">
                47 behavioral signals scanned in under 60 seconds
              </p>
            </div>
            <div className="case-card p-5">
              <div className="font-mono text-xs text-scalpel tracking-[2px]">03</div>
              <div className="font-bold text-fg-bright text-sm mt-2">Fix the leaks</div>
              <p className="text-fg-muted text-xs font-light mt-1.5">
                Every bias named, dollar cost attached, action plan included
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — What you get */}
      <section className="py-12">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="font-extrabold text-xl md:text-2xl text-fg-bright text-center mb-8">
            What your report reveals
          </h2>
          <ul className="space-y-3">
            {VALUE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-fg-bright text-sm">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-center">
            <Link href="/signup" className="btn-primary">
              See What Your Data Says →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 7 — Pricing */}
      <section className="py-12 bg-surface-1 border-y border-border-subtle">
        <div className="max-w-sm mx-auto px-4">
          <div className="case-card p-8 text-center">
            <div className="inline-flex bg-scalpel/10 border border-scalpel/20 px-3 py-1 rounded-sm font-mono text-[10px] text-scalpel font-bold tracking-wider mb-4">
              50% OFF for the next 100 customers
            </div>
            <div>
              <span className="line-through text-fg-dim font-mono text-xl">$19.99</span>
              <span className="font-mono text-4xl font-bold text-fg-bright ml-2">$9.99</span>
            </div>
            <p className="text-fg-muted text-xs font-mono mt-1">
              Pay once. No subscription.
            </p>
            <Link href="/signup" className="btn-primary w-full mt-6">
              Get Your Report
            </Link>
            <p className="text-fg-dim text-xs mt-3">
              Free snapshot included. See your grade and top bias before you pay.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8 — Final CTA */}
      <section className="py-16 text-center px-4">
        <h2 className="font-extrabold text-xl md:text-2xl text-fg-bright">
          Your betting data has a story. Read it.
        </h2>
        <div className="mt-6">
          <Link
            href="/signup"
            className="btn-primary text-base !px-10 !py-3.5"
          >
            Get Your Free Report
          </Link>
        </div>
      </section>

      {/* SECTION 9 — Minimal footer */}
      <footer className="py-6 border-t border-border-subtle text-center px-4">
        <p className="font-mono text-[10px] text-fg-dim">
          © {year} Diagnostic Sports, LLC
        </p>
        <p className="font-mono text-[10px] text-fg-dim mt-1">
          <Link href="/privacy" className="hover:text-fg-muted">Privacy</Link>
          {' · '}
          <Link href="/terms" className="hover:text-fg-muted">Terms</Link>
        </p>
      </footer>
      <ResponsibleGambling />
    </>
  );
}
