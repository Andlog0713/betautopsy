import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase-server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import DemoReportWrapper from '@/components/DemoReportWrapper';
import AnimatedSection from '@/components/AnimatedSection';
import SampleStickyBar from '@/components/SampleStickyBar';
import { BarChart3, AlertTriangle, DollarSign, ClipboardList, Stethoscope } from 'lucide-react';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Sample Autopsy Report | BetAutopsy',
  description:
    'See exactly what a full BetAutopsy behavioral analysis looks like. 5 chapters, 47 signals, real data.',
  alternates: { canonical: '/sample' },
  openGraph: {
    title: 'Sample Autopsy Report | BetAutopsy',
    description:
      'See exactly what a full BetAutopsy behavioral analysis looks like. 5 chapters, 47 signals, real data.',
    url: 'https://www.betautopsy.com/sample',
    images: [{ url: '/og?title=Sample+Autopsy+Report', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sample Autopsy Report | BetAutopsy',
    description:
      'See exactly what a full BetAutopsy behavioral analysis looks like. 5 chapters, 47 signals, real data.',
    images: ['/og?title=Sample+Autopsy+Report'],
  },
};

async function loadPlatformMetrics(): Promise<{ bets: number } | null> {
  try {
    const supabase = createServiceRoleClient();
    const betsRes = await supabase.from('bets').select('id', { count: 'exact', head: true });
    if (betsRes.error) return null;
    const bets = betsRes.count ?? 0;
    if (bets <= 0) return null;
    return { bets };
  } catch {
    return null;
  }
}

const CHAPTERS = [
  { num: '01', title: 'Summary',      subtitle: 'The verdict, up front — grade, emotion score, archetype, recoverable dollars.', icon: ClipboardList },
  { num: '02', title: 'Findings',     subtitle: 'Every cognitive bias detected in your data, ranked by severity and dollar cost.', icon: AlertTriangle },
  { num: '03', title: 'Your Data',    subtitle: 'P&L, stake sizing, ROI by category, session grades, bet-by-bet annotations.',    icon: BarChart3 },
  { num: '04', title: 'What It Costs', subtitle: 'Dollar amounts on every bad habit and "what if" simulations for each leak.',    icon: DollarSign },
  { num: '05', title: 'Protocol',     subtitle: 'RX prescriptions and personal rules generated from your actual betting history.', icon: Stethoscope },
];

export default async function SamplePage() {
  const metrics = await loadPlatformMetrics();

  return (
    <>
      <NavBar />

      {/* ═══ HEADER ═══ */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase mb-3">
          SAMPLE REPORT // EXHIBIT A
        </p>
        <h1 className="font-extrabold text-3xl md:text-4xl tracking-tight text-fg-bright mb-3">
          A real autopsy report
        </h1>
        <p className="text-fg-muted font-light mb-6 max-w-2xl">
          This is the full, unredacted sample. 280 bets analyzed across 5 chapters. Scroll through
          the whole thing — when you&apos;re ready, upload your own history and get yours.
        </p>
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

      {/* ═══ THE SAMPLE REPORT ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-16">
        <DemoReportWrapper ungated />
      </section>

      {/* ═══ WHAT YOUR REPORT COVERS (slim chapter list) ═══ */}
      <AnimatedSection delay={0.05}>
        <section className="bg-surface-1 border-y border-border-subtle py-16">
          <div className="max-w-5xl mx-auto px-6">
            <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase mb-8">
              WHAT YOUR REPORT COVERS
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {CHAPTERS.map((ch) => {
                const Icon = ch.icon;
                return (
                  <div key={ch.num} className="case-card p-5 flex items-start gap-4 border-l-2 border-l-scalpel">
                    <div className="w-10 h-10 rounded-lg bg-scalpel/10 border border-scalpel/20 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-scalpel" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-scalpel tracking-[2px] block">CHAPTER {ch.num}</span>
                      <p className="font-bold text-fg-bright">{ch.title}</p>
                      <p className="text-fg-muted text-sm font-light mt-0.5">{ch.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══ SOCIAL PROOF ═══ */}
      {metrics && (
        <AnimatedSection delay={0.05}>
          <section className="py-16">
            <div className="max-w-5xl mx-auto px-6 text-center">
              <div className="font-mono text-5xl md:text-6xl font-bold text-fg-bright">
                {metrics.bets.toLocaleString()}
              </div>
              <div className="font-mono text-xs text-fg-dim tracking-[2px] uppercase mt-3">
                Bets Analyzed
              </div>
            </div>
          </section>
        </AnimatedSection>
      )}

      {/* ═══ FINAL CTA ═══ */}
      <AnimatedSection delay={0.05}>
        <section className="pt-8 pb-20">
          <div className="max-w-xl mx-auto px-6 text-center">
            <h2 className="font-extrabold text-2xl md:text-3xl tracking-tight text-fg-bright mb-4">
              Your betting data has a story. Read it.
            </h2>
            <p className="text-fg-muted font-light mb-8">
              Free snapshot. Full reports <span className="line-through opacity-60">$19.99</span> $9.99. 50% off. No credit card to start.
            </p>
            <Link href="/signup" className="btn-primary text-base !px-8 !py-3">
              Upload your bets
            </Link>
          </div>
        </section>
      </AnimatedSection>

      <Footer />
      <SampleStickyBar />
    </>
  );
}
