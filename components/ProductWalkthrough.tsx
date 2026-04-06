'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  {
    id: 'upload',
    label: 'Upload Your Data',
    headline: 'Drop your CSV and let the autopsy begin',
    description:
      'Export your betting history from any sportsbook or DFS platform. Pikkit, FanDuel, DraftKings, BetMGM, PrizePicks, and more.',
  },
  {
    id: 'analyze',
    label: 'AI Analysis',
    headline: '47 behavioral metrics. Zero judgment.',
    description:
      'Our engine scans every bet for emotional patterns, tilt sequences, bankroll discipline, and hidden edges. Takes about 60 seconds.',
  },
  {
    id: 'report',
    label: 'Your Report',
    headline: 'A forensic breakdown of your betting DNA',
    description:
      'Five chapters covering your BetIQ Score, tilt patterns, discipline grade, profitable edges, and a dollar-amount recovery plan.',
  },
] as const;

const BAR_WIDTHS = [85, 60, 75, 45];

function UploadVisual() {
  return (
    <div className="border-2 border-dashed border-white/[0.08] rounded-sm p-12 flex flex-col items-center justify-center text-center">
      <svg
        className="w-10 h-10 text-fg-dim mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="text-fg-dim text-sm font-mono">Drag &amp; drop your CSV here</p>
      <p className="text-fg-dim/50 text-xs font-mono mt-2">or click to browse</p>
    </div>
  );
}

function AnalyzeVisual() {
  return (
    <div className="bg-surface rounded-sm p-6 space-y-4">
      {BAR_WIDTHS.map((w, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-fg-dim tracking-wider">
              {['EMOTION PATTERNS', 'TILT SEQUENCES', 'BANKROLL DISCIPLINE', 'HIDDEN EDGES'][i]}
            </span>
            <span className="font-mono text-[10px] text-scalpel">{w}%</span>
          </div>
          <div className="h-2 bg-white/[0.04] rounded-sm overflow-hidden">
            <motion.div
              className="h-full bg-scalpel/40 rounded-sm"
              initial={{ width: 0 }}
              animate={{ width: `${w}%` }}
              transition={{ duration: 0.8, delay: 0.15 * i, ease: 'easeOut' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportVisual() {
  return (
    <div className="bg-surface rounded-sm p-6 space-y-5">
      {/* BetIQ Score */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-mono text-xs text-fg-dim tracking-wider">BETIQ SCORE</span>
          <span className="font-mono text-lg font-bold text-fg-bright">72 <span className="text-fg-dim font-normal text-xs">/ 100</span></span>
        </div>
        <div className="h-2 bg-white/[0.04] rounded-sm overflow-hidden">
          <div className="h-full bg-scalpel rounded-sm" style={{ width: '72%' }} />
        </div>
      </div>
      {/* Tilt Index */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs text-fg-dim tracking-wider">TILT INDEX</span>
        <span className="font-mono text-lg font-bold" style={{ color: '#D29922' }}>High</span>
      </div>
      {/* Total Recoverable */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs text-fg-dim tracking-wider">TOTAL RECOVERABLE</span>
        <span className="font-mono text-2xl font-bold" style={{ color: '#3FB950' }}>$2,062</span>
      </div>
    </div>
  );
}

const VISUALS: Record<string, () => JSX.Element> = {
  upload: UploadVisual,
  analyze: AnalyzeVisual,
  report: ReportVisual,
};

export default function ProductWalkthrough() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];
  const Visual = VISUALS[tab.id];

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-2 mb-8">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(i)}
            className={`relative px-4 py-2 font-mono text-xs tracking-wider ${
              active === i ? 'text-fg-bright font-semibold' : 'text-fg-dim hover:text-fg-muted'
            }`}
          >
            {active === i && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-scalpel/[0.12] rounded-sm -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h3 className="text-xl font-bold text-fg-bright mb-3 leading-snug">{tab.headline}</h3>
              <p className="text-sm text-fg leading-relaxed">{tab.description}</p>
            </div>
            <Visual />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
