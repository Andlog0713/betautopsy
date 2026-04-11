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
    subtitle: 'The executive briefing',
    icon: ClipboardList,
    items: [
      'Your overall grade (A+ through F)',
      'Emotion Score, Discipline Score, and BetIQ',
      'Bankroll health assessment',
      'Total recoverable dollars — how much your leaks are costing you',
      'Your betting archetype (Surgeon, Heat Chaser, Parlay Dreamer, Grinder, or Gut Bettor)',
    ],
  },
  {
    num: '02',
    title: 'Findings',
    subtitle: 'What the data says about you',
    icon: AlertTriangle,
    items: [
      'Every cognitive bias detected in your data, ranked by severity',
      'Dollar cost per bias per quarter',
      'Sport-specific findings — which sports and bet types are leaking',
      'Behavioral patterns: loss chasing, Weekend Warrior, late-night betting',
      'Emotional trigger breakdown — 6 signals scored individually',
      'Clickable bias explainer cards with plain-language fixes',
    ],
  },
  {
    num: '03',
    title: 'Your Data',
    subtitle: 'The evidence, visualized',
    icon: BarChart3,
    items: [
      'Profit/loss chart over time',
      'Stake size timeline — highlights post-loss spikes',
      'ROI by category (which bet types are actually profitable)',
      'Session analysis with A-F grades',
      'Bet-by-bet behavioral annotations (disciplined, emotional, chasing, impulsive)',
      'Edge profile — where you have real edge vs where you\'re bleeding',
    ],
  },
  {
    num: '04',
    title: 'What It Costs',
    subtitle: 'Dollars attached to every pattern',
    icon: DollarSign,
    items: [
      'Leak prioritizer: your biases ranked by dollar impact',
      '"What if you flat-staked?" — simulated P&L with consistent sizing',
      '"What if you cut parlays?" — your numbers without long-shot bets',
      '"What if you only bet your profitable spots?" — edge-only simulation',
      'Specific dollar amounts attached to every behavioral pattern',
    ],
  },
  {
    num: '05',
    title: 'Protocol',
    subtitle: 'Your personalized action plan',
    icon: Stethoscope,
    items: [
      'RX prescriptions — specific actions generated from your data',
      'Your rules — guardrails built from your actual patterns',
      '"3 Moves" card: what to STOP and what to START',
      'Discipline Score breakdown (tracking, sizing, control, strategy)',
      'Ask Your Autopsy: ask questions about your report and get answers grounded in your data',
    ],
  },
];

const STEPS = [
  { num: '01', label: 'Upload your betting history', detail: 'CSV, screenshot, paste, or Pikkit' },
  { num: '02', label: 'We analyze 47 behavioral signals', detail: 'Biases, patterns, and emotional triggers' },
  { num: '03', label: 'Get your five-chapter forensic report', detail: 'With dollar costs and a personalized action plan' },
];

export default async function WhatsInsidePage() {
  const metrics = await loadPlatformMetrics();

  return (
    <>
      <NavBar />

      {/* ═══ HERO ═══ */}
      <section className="relative grid-paper overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00C9A7]/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-16 relative z-10">
          <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase mb-6">
            EXHIBIT A // REPORT OVERVIEW
          </p>
          <h1 className="font-bold text-4xl md:text-5xl leading-[1.1] tracking-tight text-fg-bright mb-4">
            See exactly what your report reveals
          </h1>
          <p className="text-fg-muted text-lg max-w-2xl mb-8 leading-relaxed">
            Every BetAutopsy report is a five-chapter forensic analysis of your betting behavior. Here&apos;s what&apos;s inside.
          </p>
          <Link href="/signup" className="btn-primary text-base !px-8 !py-3">
            Get Your Autopsy Report
          </Link>
        </div>
      </section>

      {/* ═══ CHAPTERS ═══ */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        {CHAPTERS.map((ch) => {
          const Icon = ch.icon;
          return (
            <AnimatedSection key={ch.num} delay={0.05}>
              <div className="case-card p-6 md:p-8 border-l-2 border-l-scalpel">
                <div className="md:flex md:gap-8">
                  {/* Left — chapter header */}
                  <div className="md:w-64 shrink-0 mb-4 md:mb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon size={18} className="text-scalpel" />
                      <span className="font-mono text-xs text-scalpel tracking-[2px]">CHAPTER {ch.num}</span>
                    </div>
                    <h2 className="font-bold text-xl text-fg-bright">{ch.title}</h2>
                    <p className="text-fg-muted text-sm mt-1">{ch.subtitle}</p>
                  </div>

                  {/* Right — bullet list */}
                  <ul className="flex-1 space-y-3">
                    {ch.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-scalpel mt-1.5 shrink-0">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><rect width="8" height="8" rx="1" /></svg>
                        </span>
                        <span className="text-fg text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
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
                  <p className="font-semibold text-fg-bright mb-1">{step.label}</p>
                  <p className="text-fg-muted text-sm">{step.detail}</p>
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
            <h2 className="font-bold text-2xl md:text-3xl tracking-tight text-fg-bright mb-4">
              Free snapshot. Full reports from $9.99.
            </h2>
            <p className="text-fg-muted mb-8">No credit card required for your first snapshot.</p>
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
