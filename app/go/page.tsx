import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { Logo } from '@/components/logo';
import PaidTrafficDisclaimer from '@/components/PaidTrafficDisclaimer';
import GoPageView from './GoPageView';

// Paid-traffic metric counters refresh hourly so they stay fresh without
// hitting Supabase on every ad click. Case file number is also derived from
// the ISR cache window, so it stays stable across visitors within the hour.
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

// Deterministic 5-digit case file number derived from today's date. Stable
// across visitors within the same day (and within the ISR cache window).
function getCaseFileNumber(): string {
  const today = new Date().toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < today.length; i++) {
    h = (h * 31 + today.charCodeAt(i)) >>> 0;
  }
  return String(10000 + (h % 90000));
}

// Preserve ALL incoming query params on the signup CTA so UTM tags, ad-click
// IDs (fbclid, ttclid, gclid), and custom attribution params survive the
// landing-page bounce. Passing everything (not just utm_*) is intentional.
type SearchParams = Record<string, string | string[] | undefined>;

function buildSignupHref(searchParams: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  const s = qs.toString();
  return s ? `/signup?${s}` : '/signup';
}

const ANXIETY_CARDS = [
  {
    label: 'LOSS CHASING',
    body: "You bet bigger after losses. We measure exactly how much bigger and what it costs.",
  },
  {
    label: 'PARLAY ADDICTION',
    body: "Long shots feel exciting. We show you the real ROI on your parlays vs. straight bets.",
  },
  {
    label: 'EMOTIONAL SIZING',
    body: "Your stake jumps after bad beats. We flag every spike and calculate the damage.",
  },
  {
    label: 'LATE-NIGHT BETTING',
    body: "Bets placed after 11pm have a pattern. We grade every session by time and outcome.",
  },
  {
    label: 'FAVORITE BIAS',
    body: "Always backing the favorite? We show you where the public side is bleeding you.",
  },
  {
    label: 'FALSE CONFIDENCE',
    body: "Winning streaks change your behavior. We detect when confidence becomes recklessness.",
  },
];

const STEPS = [
  {
    num: '01',
    label: 'UPLOAD',
    body: 'Drop your CSV or paste from any sportsbook. DraftKings, FanDuel, BetMGM, PrizePicks all work.',
  },
  {
    num: '02',
    label: 'ANALYZE',
    body: '47 behavioral signals scanned. Biases named. Dollar costs calculated. Under 60 seconds.',
  },
  {
    num: '03',
    label: 'READ YOUR REPORT',
    body: '5 chapters: Summary, Findings, Evidence, Cost Analysis, Action Plan. Every pattern explained.',
  },
];

const OBJECTION_KILLERS = [
  'Data never sold or shared',
  'Works with any sportsbook',
  'No credit card required',
  'Report ready in 60 seconds',
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

export default async function GoLandingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const metrics = await loadPlatformMetrics();
  const signupHref = buildSignupHref(searchParams);
  const caseNum = getCaseFileNumber();
  const nf = new Intl.NumberFormat('en-US');

  // Fallbacks so the social-proof bar never shows zeros if Supabase fails.
  const betsDisplay = metrics ? nf.format(metrics.bets) : '15,004';
  const reportsDisplay = metrics ? nf.format(metrics.reports) : '105';

  return (
    <>
      <GoPageView />

      {/* ═══ STICKY MINI HEADER ═══ */}
      <header className="sticky top-0 z-20 bg-base border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" aria-label="BetAutopsy home">
            <Logo size="xs" variant="horizontal" theme="dark" />
          </Link>
          <Link
            href={signupHref}
            className="btn-primary text-sm !px-5 !py-2 !min-h-0"
          >
            Get Your Free Report
          </Link>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative grid-paper overflow-hidden pt-10 pb-12 md:pt-16 md:pb-16">
        {/* Subtle teal glow behind the headline */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00C9A7]/10 rounded-full blur-[120px] pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase mb-4">
            CASE FILE #{caseNum} // BEHAVIORAL ANALYSIS
          </p>
          <h1 className="font-extrabold text-[28px] sm:text-4xl md:text-5xl leading-[1.1] tracking-tight text-fg-bright">
            Find out what your betting patterns are{' '}
            <span className="text-scalpel">really costing you.</span>
          </h1>
          <p className="mt-4 text-fg-muted text-base md:text-lg font-light">
            Upload your history. Get a 5-chapter forensic report in 60 seconds.
          </p>
          <div className="mt-7">
            <Link
              href={signupHref}
              className="btn-primary text-base !px-10 !py-3.5"
            >
              Get Your Free Report
            </Link>
          </div>
          <p className="mt-3 text-fg-dim text-xs font-mono">
            No credit card. Takes 2 minutes.
          </p>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <div className="bg-surface-1 border-y border-border-subtle py-4">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-center font-mono text-xs text-fg-muted leading-relaxed">
            <span className="text-fg-bright font-bold">{betsDisplay}</span> bets analyzed
            <span className="text-fg-dim mx-2 md:mx-3">·</span>
            <span className="text-fg-bright font-bold">{reportsDisplay}</span> reports generated
            <span className="text-fg-dim mx-2 md:mx-3">·</span>
            <span className="text-fg-bright font-bold">47</span> signals per report
          </p>
        </div>
      </div>

      {/* ═══ WHAT WE FIND — anxiety list ═══ */}
      <section className="py-14">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-extrabold text-2xl md:text-3xl text-fg-bright text-center mb-2">
            What we find in your data
          </h2>
          <p className="text-fg-muted text-sm text-center font-light mb-8">
            The patterns bettors never see until it&apos;s too late.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {ANXIETY_CARDS.map((c) => (
              <div
                key={c.label}
                className="case-card p-5 border-l-2 border-l-bleed"
              >
                <p className="font-mono text-[11px] text-bleed tracking-[2px] mb-2">
                  {c.label}
                </p>
                <p className="text-fg-bright text-sm leading-relaxed">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MID-PAGE CTA ═══ */}
      <section className="pb-4 text-center px-4">
        <Link
          href={signupHref}
          className="btn-primary text-base !px-10 !py-3.5"
        >
          Get Your Free Report
        </Link>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="bg-surface-1 border-y border-border-subtle py-14 mt-8">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-extrabold text-xl md:text-2xl text-fg-bright text-center mb-8">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="case-card p-6 border-l-2 border-l-scalpel"
              >
                <div className="font-mono text-xs text-scalpel tracking-[2px]">
                  {s.num}
                </div>
                <div className="font-bold text-fg-bright text-sm mt-2">
                  {s.label}
                </div>
                <p className="text-fg-muted text-xs font-light mt-2 leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SAMPLE REPORT PREVIEW — static mockup ═══ */}
      <section className="py-14">
        <div className="max-w-2xl mx-auto px-4">
          <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase text-center mb-4">
            SAMPLE // WHAT YOU GET
          </p>
          <div className="case-card p-6">
            {/* Case header */}
            <div className="flex items-center justify-between mb-5">
              <p className="font-mono text-[11px] text-fg-dim tracking-[2px]">
                CASE #BA-20260413
              </p>
              <span className="severity-high">HIGH SEVERITY</span>
            </div>

            {/* Overall grade */}
            <div className="mb-5">
              <p className="font-mono text-[9px] text-fg-dim tracking-[1.5px] mb-1">
                OVERALL GRADE
              </p>
              <p className="font-mono text-5xl font-extrabold text-caution leading-none">
                C+
              </p>
            </div>

            {/* Vitals strip */}
            <div className="vitals-strip grid-cols-3 mb-5">
              <div className="vitals-cell">
                <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">
                  EMOTION
                </span>
                <span className="font-mono text-lg font-bold text-caution">
                  67
                </span>
                <span className="font-mono text-xs text-fg-muted">/100</span>
              </div>
              <div className="vitals-cell">
                <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">
                  RECORD
                </span>
                <span className="font-mono text-lg font-bold text-fg-bright">
                  847-913
                </span>
              </div>
              <div className="vitals-cell">
                <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px] block mb-1">
                  NET P&amp;L
                </span>
                <span className="font-mono text-lg font-bold text-loss">
                  -$2,847
                </span>
              </div>
            </div>

            {/* Top finding (sharp) */}
            <div className="border-l-2 border-l-bleed pl-4 mb-5">
              <p className="font-mono text-[10px] text-fg-dim tracking-[2px] mb-1">
                TOP FINDING
              </p>
              <p className="text-fg-bright font-bold flex items-center gap-2">
                Loss Chasing
                <span className="severity-high">HIGH</span>
              </p>
              <p className="text-fg-muted text-sm mt-1">
                Estimated quarterly cost:{' '}
                <span className="text-bleed font-mono font-bold">$1,240</span>
              </p>
            </div>

            {/* Blurred section with teal-bordered overlay */}
            <div className="relative">
              <div
                style={{ filter: 'blur(4px)' }}
                aria-hidden="true"
                className="opacity-70 select-none pointer-events-none space-y-3"
              >
                <div className="border-l-2 border-l-caution pl-4">
                  <p className="font-mono text-[10px] text-fg-dim tracking-[2px] mb-1">
                    FINDING #2
                  </p>
                  <p className="text-fg-bright font-bold">Parlay Overuse</p>
                  <p className="text-fg-muted text-sm">
                    Estimated quarterly cost: $820
                  </p>
                </div>
                <div className="border-l-2 border-l-caution pl-4">
                  <p className="font-mono text-[10px] text-fg-dim tracking-[2px] mb-1">
                    FINDING #3
                  </p>
                  <p className="text-fg-bright font-bold">Emotional Sizing</p>
                  <p className="text-fg-muted text-sm">
                    Estimated quarterly cost: $615
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-base border border-scalpel/40 rounded-md px-5 py-3 text-center">
                  <p className="font-mono text-[11px] text-scalpel tracking-wider">
                    + 3 MORE BIASES DETECTED
                  </p>
                  <p className="text-fg-muted text-xs mt-0.5">
                    Get your free report to see all findings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ OBJECTION KILLERS ═══ */}
      <section className="bg-surface-1 border-y border-border-subtle py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {OBJECTION_KILLERS.map((text) => (
              <div key={text} className="flex items-start gap-2">
                <CheckIcon />
                <span className="font-mono text-[11px] text-fg-muted leading-snug">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-fg-bright text-xl md:text-2xl font-extrabold leading-snug">
            The average bettor loses{' '}
            <span className="text-scalpel font-mono">9%</span> to the house.
          </p>
          <p className="text-fg-muted text-base md:text-lg font-light mt-2">
            Most of it is behavioral, not bad luck.
          </p>
          <div className="mt-7">
            <Link
              href={signupHref}
              className="btn-primary text-base !px-10 !py-3.5"
            >
              Get Your Free Report
            </Link>
          </div>
          <p className="mt-3 text-fg-dim text-xs font-mono">
            No credit card. Takes 2 minutes.
          </p>
        </div>
      </section>

      {/* ═══ DISCLAIMER ═══ */}
      <PaidTrafficDisclaimer />
    </>
  );
}
