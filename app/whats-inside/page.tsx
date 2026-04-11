import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase-server';
import NavBar from '@/components/NavBar';
import AnimatedSection from '@/components/AnimatedSection';
import { BarChart3, AlertTriangle, DollarSign, ClipboardList, Stethoscope } from 'lucide-react';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What's in a BetAutopsy Report? | Full Breakdown",
  description:
    'See exactly what a BetAutopsy behavioral analysis report contains. Five chapters covering your biases, emotional patterns, session analysis, dollar costs, and a personalized action plan.',
  alternates: { canonical: '/whats-inside' },
  openGraph: {
    title: "What's in a BetAutopsy Report? | Full Breakdown",
    description:
      'See exactly what a BetAutopsy behavioral analysis report contains. Five chapters covering your biases, emotional patterns, session analysis, dollar costs, and a personalized action plan.',
    url: 'https://www.betautopsy.com/whats-inside',
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

const CHAPTERS = [
  {
    num: '01',
    title: 'Summary',
    subtitle: 'The verdict, up front.',
    icon: ClipboardList,
    items: [
      'Overall grade from A+ to F. No curve.',
      'Emotion Score — how much your feelings are running the show',
      'Discipline Score — process consistency across sizing, timing, and control',
      'Recoverable dollars — the exact amount your leaks are costing you per quarter',
      'Your betting archetype: Surgeon, Heat Chaser, Parlay Dreamer, Grinder, or Gut Bettor',
    ],
  },
  {
    num: '02',
    title: 'Findings',
    subtitle: 'The patterns you can\'t see yourself.',
    icon: AlertTriangle,
    items: [
      'Every cognitive bias detected in your data, ranked by severity',
      'The dollar cost of each bias per quarter — not vague, exact',
      'Sport-by-sport breakdown — where you\'re profitable vs where you\'re bleeding',
      'Behavioral flags: loss chasing, late-night betting, Weekend Warrior patterns',
      'Emotional trigger breakdown — 6 signals scored individually',
      'Plain-language explainer cards for every bias with specific fixes',
    ],
  },
  {
    num: '03',
    title: 'Your Data',
    subtitle: 'The evidence. Visualized.',
    icon: BarChart3,
    items: [
      'Profit/loss chart over time — see exactly where things went wrong',
      'Stake size timeline — highlights the post-loss spikes you didn\'t notice',
      'ROI by category — which bet types are actually making money',
      'Session grades (A-F) — your best and worst betting sessions, graded',
      'Bet-by-bet annotations: disciplined, emotional, chasing, impulsive',
      'Edge profile — where you have real edge vs where you\'re donating',
    ],
  },
  {
    num: '04',
    title: 'What It Costs',
    subtitle: 'A dollar amount on every bad habit.',
    icon: DollarSign,
    items: [
      'Leak prioritizer — your biases ranked by how much they\'re costing you',
      '"What if you flat-staked?" — your P&L recalculated with consistent sizing',
      '"What if you cut parlays?" — your numbers without the long-shot lottery tickets',
      '"What if you only bet your profitable spots?" — edge-only simulation',
      'No guessing. Specific dollar amounts attached to every pattern.',
    ],
  },
  {
    num: '05',
    title: 'Protocol',
    subtitle: 'What to actually do about it.',
    icon: Stethoscope,
    items: [
      'RX prescriptions generated from your actual data, not generic advice',
      'Your rules — guardrails built from the patterns in your history',
      '"3 Moves" card: what to stop doing and what to start',
      'Discipline Score breakdown across tracking, sizing, control, and strategy',
      'Ask Your Autopsy — ask questions about your report, get answers grounded in your data',
    ],
  },
];

const STEPS = [
  { num: '01', label: 'Upload your history', detail: 'CSV from DraftKings, FanDuel, or any sportsbook. Screenshot or paste works too.' },
  { num: '02', label: '47 signals analyzed', detail: 'Cognitive biases, emotional patterns, loss chasing, sizing consistency. 60 seconds.' },
  { num: '03', label: 'Five-chapter forensic report', detail: 'Dollar costs, behavioral grades, and a plan to stop the leaks.' },
];

export default async function WhatsInsidePage() {
  const metrics = await loadPlatformMetrics();

  return (
    <>
      <NavBar />

      {/* ═══ HEADER ═══ */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase mb-3">
          WHAT&apos;S INSIDE
        </p>
        <h1 className="font-extrabold text-3xl md:text-4xl tracking-tight text-fg-bright mb-6">
          What your report contains
        </h1>
        <div className="flex gap-6 md:gap-10">
          <div className="border-l-2 border-scalpel pl-4">
            <p className="font-mono text-3xl font-bold text-scalpel">5</p>
            <p className="text-sm font-light">chapters</p>
          </div>
          <div className="border-l-2 border-scalpel pl-4">
            <p className="font-mono text-3xl font-bold text-scalpel">47</p>
            <p className="text-sm font-light">behavioral signals</p>
          </div>
          <div className="border-l-2 border-scalpel pl-4">
            <p className="font-mono text-3xl font-bold text-scalpel">60s</p>
            <p className="text-sm font-light">to generate</p>
          </div>
        </div>
      </div>

      {/* ═══ CHAPTERS ═══ */}
      <section className="max-w-5xl mx-auto px-6 pt-6 pb-16 space-y-8">
        {CHAPTERS.map((ch) => {
          const Icon = ch.icon;
          return (
            <AnimatedSection key={ch.num} delay={0.05}>
              <div className="case-card p-6 md:p-8 border-l-2 border-l-scalpel">
                {/* Chapter header row */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-lg bg-scalpel/10 border border-scalpel/20 flex items-center justify-center shrink-0">
                    <Icon size={22} className="text-scalpel" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-scalpel tracking-[2px] block">CHAPTER {ch.num}</span>
                    <h2 className="font-extrabold text-xl text-fg-bright">{ch.title}</h2>
                  </div>
                  <p className="text-fg-dim text-sm font-light ml-auto hidden md:block">{ch.subtitle}</p>
                </div>

                {/* Bullet grid */}
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                  {ch.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-scalpel mt-1.5 shrink-0">
                        <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><rect width="6" height="6" rx="1" /></svg>
                      </span>
                      <span className="text-fg-bright text-sm leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          );
        })}
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <AnimatedSection delay={0.05}>
        <section className="bg-surface-1 border-y border-border-subtle py-16">
          <div className="max-w-5xl mx-auto px-6">
            <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase mb-8">
              PROTOCOL // HOW IT WORKS
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((step) => (
                <div key={step.num} className="case-card p-6">
                  <span className="font-mono text-xs text-scalpel tracking-[2px] block mb-3">STEP {step.num}</span>
                  <p className="font-bold text-fg-bright mb-1">{step.label}</p>
                  <p className="text-fg-muted text-sm font-light">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══ SOCIAL PROOF ═══ */}
      {metrics && (
        <AnimatedSection delay={0.05}>
          <section className="py-16">
            <div className="max-w-5xl mx-auto px-6 flex justify-center gap-16">
              <div className="text-center">
                <div className="font-mono text-3xl font-bold text-fg-bright">{metrics.bets.toLocaleString()}</div>
                <div className="font-mono text-[10px] text-fg-dim tracking-[2px] uppercase mt-1">Bets Analyzed</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-3xl font-bold text-fg-bright">{metrics.reports.toLocaleString()}</div>
                <div className="font-mono text-[10px] text-fg-dim tracking-[2px] uppercase mt-1">Reports Generated</div>
              </div>
            </div>
          </section>
        </AnimatedSection>
      )}

      {/* ═══ FINAL CTA ═══ */}
      <AnimatedSection delay={0.05}>
        <section className="py-20">
          <div className="max-w-xl mx-auto px-6 text-center">
            <h2 className="font-extrabold text-2xl md:text-3xl tracking-tight text-fg-bright mb-4">
              Your betting data has a story. Read it.
            </h2>
            <p className="text-fg-muted font-light mb-8">Free snapshot. Full reports from $9.99. No credit card to start.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="btn-primary text-base !px-8 !py-3">
                Get Your Autopsy Report
              </Link>
              <Link href="/quiz" className="btn-secondary text-base !px-8 !py-3">
                Or take the 2-min quiz
              </Link>
            </div>
          </div>
        </section>
      </AnimatedSection>
    </>
  );
}
