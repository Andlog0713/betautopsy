'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DEMO_ANALYSIS, DEMO_BETS } from '@/lib/demo-data';

const AutopsyReport = dynamic(() => import('@/components/AutopsyReport'), {
  loading: () => <div className="h-96 bg-ink-800 rounded-lg animate-pulse" />,
});

export default function DemoReportWrapper() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
      {/* ── Floating "DEMO" badge ── */}
      <div className="sticky top-20 z-30 flex justify-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink-800/95 border border-flame-500/30 backdrop-blur-sm shadow-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flame-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-flame-500" />
          </span>
          <span className="text-sm font-medium text-[#F0F0F0]">
            Interactive Demo
          </span>
          <span className="text-xs text-ink-600">
            — real report, sample data
          </span>
        </div>
      </div>

      {/* ── Report Container ── */}
      <div
        className={`relative overflow-hidden transition-all duration-700 ease-out ${
          expanded ? 'max-h-none' : 'max-h-[900px]'
        }`}
      >
        {/* Subtle watermark pattern */}
        <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 80px,
              currentColor 80px,
              currentColor 80.5px
            )`,
          }}
        />

        {/* The actual report */}
        <div className="relative z-0">
          <AutopsyReport
            analysis={DEMO_ANALYSIS}
            bets={DEMO_BETS}
            tier="pro"
            readOnly
          />
        </div>

        {/* ── Gradient Fade + CTA (when collapsed) ── */}
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 z-20">
            {/* Tall gradient fade */}
            <div className="h-64 bg-gradient-to-t from-ink-900 via-ink-900/95 to-transparent" />

            {/* CTA area */}
            <div className="bg-ink-900 pb-4 text-center space-y-4">
              <button
                onClick={() => setExpanded(true)}
                className="text-sm text-ink-500 hover:text-ink-400 transition-colors"
              >
                ↓ Keep scrolling to explore the full demo report
              </button>
              <div>
                <p className="text-[#F0F0F0] text-lg font-medium mb-2">
                  This is a sample. Yours will be even more personal.
                </p>
                <Link
                  href="/signup"
                  className="btn-primary text-lg !px-10 !py-3.5 shadow-lg shadow-flame-500/20 inline-block"
                >
                  Get Your Free Autopsy
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom CTA (when expanded) ── */}
      {expanded && (
        <div className="mt-8 text-center space-y-3">
          <p className="text-ink-600 text-sm">
            That was a sample report with 280 bets. Imagine what yours would reveal.
          </p>
          <Link
            href="/signup"
            className="btn-primary text-lg !px-10 !py-3.5 shadow-lg shadow-flame-500/20 inline-block"
          >
            Get Your Free Autopsy
          </Link>
        </div>
      )}
    </div>
  );
}
