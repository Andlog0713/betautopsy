'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SampleModeToggle, { type SampleMode } from '@/components/SampleModeToggle';
import DemoReportWrapper from '@/components/DemoReportWrapper';
import { DEMO_ANALYSIS, DEMO_DFS_ANALYSIS, DEMO_DFS_BETS } from '@/lib/demo-data';

const LS_KEY = 'sample_demo_view';

function resolveInitialMode(viewParam: string | null): SampleMode {
  // Query param wins over localStorage so Meta ads always land correctly
  if (viewParam === 'dfs' || viewParam === 'prizepicks') return 'dfs';
  if (viewParam === 'sportsbook') return 'sportsbook';

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === 'dfs') return 'dfs';
  }

  return 'sportsbook';
}

export default function SamplePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get('view');
  const paramStripped = useRef(false);

  const [mode, setMode] = useState<SampleMode>(() => resolveInitialMode(viewParam));

  // On mount: resolve from query param, then strip it so subsequent
  // reloads fall through to localStorage (which reflects user's toggle).
  useEffect(() => {
    if (viewParam && !paramStripped.current) {
      const resolved = resolveInitialMode(viewParam);
      setMode(resolved);
      paramStripped.current = true;
      router.replace('/sample', { scroll: false });
    }
  }, [viewParam, router]);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_KEY, mode);
  }, [mode]);

  const isDfs = mode === 'dfs';

  return (
    <>
      {/* ═══ HEADER (mode-dependent copy + stats only — eyebrow/h1 are
          static and render server-side in app/sample/page.tsx, outside
          this useSearchParams-gated Suspense boundary, so they're present
          in the statically-generated HTML crawlers and pre-hydration
          visitors get) ═══ */}
      <div className="max-w-5xl mx-auto px-6 pb-4">
        <p className="text-fg-muted font-light mb-6 max-w-2xl">
          {isDfs
            ? 'This is the full, unredacted sample. 200 PrizePicks entries analyzed across 5 chapters. Scroll through the whole thing — when you\'re ready, upload your own history and get yours.'
            : `This is the full, unredacted sample. ${DEMO_ANALYSIS.summary.total_bets} bets analyzed across 5 chapters. Scroll through the whole thing — when you're ready, upload your own history and get yours.`}
        </p>
        {/* Third tile used to be a "<2min to generate" stat. Dropped per
            review: next to two quantity claims ("5", "47") that build
            momentum toward "look how much you get," a wait-time duration
            is a different kind of claim - it reads as a tonal shift into
            "here's how long you'll wait" rather than reinforcing depth.
            The honest "under 2 minutes" figure still lives in
            lib/report-timing.ts and the sentence-form copy elsewhere
            (hero subhead, FAQ) where it's informative context rather than
            a bragging stat. */}
        <div className="flex gap-6 md:gap-10 mb-6">
          <div className="border-l-2 border-scalpel pl-4">
            <p className="font-mono text-3xl font-bold text-scalpel">5</p>
            <p className="text-sm font-light">chapters</p>
          </div>
          <div className="border-l-2 border-scalpel pl-4">
            <p className="font-mono text-3xl font-bold text-scalpel">47</p>
            <p className="text-sm font-light">behavioral signals</p>
          </div>
        </div>

        <SampleModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* ═══ THE SAMPLE REPORT ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-16">
        <DemoReportWrapper
          ungated
          {...(isDfs ? { analysis: DEMO_DFS_ANALYSIS, bets: DEMO_DFS_BETS } : {})}
        />
      </section>
    </>
  );
}
