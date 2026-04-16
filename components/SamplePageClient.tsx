'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import SampleModeToggle, { type SampleMode } from '@/components/SampleModeToggle';
import DemoReportWrapper from '@/components/DemoReportWrapper';
import { DEMO_DFS_ANALYSIS, DEMO_DFS_BETS } from '@/lib/demo-data';

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
  const viewParam = searchParams.get('view');

  const [mode, setMode] = useState<SampleMode>(() => resolveInitialMode(viewParam));

  // Sync query param on mount (handles SSR/hydration)
  useEffect(() => {
    const resolved = resolveInitialMode(viewParam);
    setMode(resolved);
  }, [viewParam]);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_KEY, mode);
  }, [mode]);

  const isDfs = mode === 'dfs';

  return (
    <>
      {/* ═══ HEADER ═══ */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <p className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase mb-3">
          SAMPLE REPORT // EXHIBIT A
        </p>
        <h1 className="font-extrabold text-3xl md:text-4xl tracking-tight text-fg-bright mb-3">
          A real autopsy report
        </h1>
        <p className="text-fg-muted font-light mb-6 max-w-2xl">
          {isDfs
            ? 'This is the full, unredacted sample. 200 PrizePicks entries analyzed across 5 chapters. Scroll through the whole thing — when you\'re ready, upload your own history and get yours.'
            : 'This is the full, unredacted sample. 280 bets analyzed across 5 chapters. Scroll through the whole thing — when you\'re ready, upload your own history and get yours.'}
        </p>
        <div className="flex gap-6 md:gap-10 mb-6">
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
