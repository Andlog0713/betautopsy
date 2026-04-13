'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DEMO_ANALYSIS, DEMO_BETS } from '@/lib/demo-data';

const AutopsyReport = dynamic(() => import('@/components/AutopsyReport'), {
  loading: () => <div className="h-96 bg-surface-1 rounded-sm animate-pulse" />,
});

interface DemoReportWrapperProps {
  /** When true, skips the collapsed gate + overlay and renders the full
   *  report immediately. Used on /sample where the page IS the sample. */
  ungated?: boolean;
}

export default function DemoReportWrapper({ ungated = false }: DemoReportWrapperProps) {
  const [expanded, setExpanded] = useState(ungated);
  const isOpen = ungated || expanded;

  return (
    <div className="relative">
      {/* ── Report Container ── */}
      <div
        className={`relative overflow-hidden transition-all duration-700 ease-out ${
          isOpen ? 'max-h-none' : 'max-h-[1200px]'
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
        <div className="relative z-0 px-4 md:px-6">
          <AutopsyReport
            analysis={DEMO_ANALYSIS}
            bets={DEMO_BETS}
            tier="pro"
            readOnly
          />
        </div>

        {/* ── Gradient Fade + CTA (when collapsed) ── */}
        {!isOpen && (
          <div className="absolute bottom-0 left-0 right-0 z-20">
            {/* Tall gradient fade */}
            <div className="h-80 bg-gradient-to-t from-base via-base/90 to-transparent" />

            {/* CTA area */}
            <div className="bg-base pb-4 text-center space-y-4">
              <button
                onClick={() => setExpanded(true)}
                className="text-sm text-fg-muted hover:text-fg transition-colors"
              >
                ↓ Click to see the full expanded report
              </button>
              <div>
                <p className="text-fg-bright text-lg font-medium mb-2">
                  This is a sample. Yours will be even more personal.
                </p>
                <Link
                  href="/signup"
                  className="btn-primary text-lg !px-10 !py-3.5 inline-block"
                >
                  Get Your Autopsy Report
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom CTA (when expanded) ── */}
      {isOpen && (
        <div className="mt-8 text-center space-y-3">
          <p className="text-fg-muted text-sm">
            That was a sample report with 280 bets. Imagine what yours would reveal.
          </p>
          <Link
            href="/signup"
            className="btn-primary text-lg !px-10 !py-3.5 inline-block"
          >
            Get Your Autopsy Report
          </Link>
        </div>
      )}
    </div>
  );
}
