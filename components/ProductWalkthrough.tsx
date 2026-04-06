'use client';

import { motion } from 'framer-motion';

const STEPS = [
  {
    num: '01',
    title: 'Upload',
    headline: 'Export from any sportsbook or tracking app',
    description: 'FanDuel, DraftKings, BetMGM, Caesars, bet365, PrizePicks — or any CSV. Pikkit users can export directly. Takes 30 seconds.',
    visual: 'csv',
  },
  {
    num: '02',
    title: 'Analyze',
    headline: '47 behavioral metrics in 60 seconds',
    description: 'We scan every bet for emotional patterns, tilt sequences, stake escalation, and hidden edges. No judgment — just the data.',
    visual: 'scan',
  },
  {
    num: '03',
    title: 'Report',
    headline: 'A forensic breakdown with dollar amounts',
    description: 'Five chapters: BetIQ Score, tilt patterns, discipline grade, profitable edges, and a concrete recovery plan.',
    visual: 'report',
  },
] as const;

const SCAN_BARS = [
  { label: 'EMOTION PATTERNS', width: 85 },
  { label: 'TILT SEQUENCES', width: 60 },
  { label: 'BANKROLL DISCIPLINE', width: 75 },
  { label: 'HIDDEN EDGES', width: 45 },
];

function CsvVisual() {
  // Fake CSV preview table — shows what the data looks like
  const rows = [
    ['NFL', 'KC -3.5', 'Win', '+$50'],
    ['NBA', 'LAL ML', 'Loss', '-$100'],
    ['NFL', 'Parlay 4-leg', 'Loss', '-$25'],
    ['NBA', 'BOS -7', 'Win', '+$45'],
  ];
  return (
    <div className="bg-surface rounded-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-scalpel/40" />
        <span className="font-mono text-[10px] text-fg-dim tracking-wider">betting_history.csv</span>
      </div>
      <div className="p-3">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              {['Sport', 'Bet', 'Result', 'P&L'].map(h => (
                <th key={h} className="font-mono text-[10px] text-fg-dim tracking-wider pb-2 pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-white/[0.03]">
                {row.map((cell, j) => (
                  <td key={j} className={`font-mono text-xs py-1.5 pr-3 ${
                    cell.startsWith('+') ? 'text-win' : cell.startsWith('-') ? 'text-loss' : 'text-fg-muted'
                  }`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="font-mono text-[10px] text-fg-dim mt-2">+ 276 more rows</div>
      </div>
    </div>
  );
}

function ScanVisual() {
  return (
    <div className="bg-surface rounded-sm p-4 space-y-3">
      {SCAN_BARS.map((bar, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-fg-dim tracking-wider">{bar.label}</span>
            <span className="font-mono text-[10px] text-scalpel">{bar.width}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-sm overflow-hidden">
            <motion.div
              className="h-full bg-scalpel/40 rounded-sm"
              initial={{ width: 0 }}
              whileInView={{ width: `${bar.width}%` }}
              viewport={{ once: true }}
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
    <div className="bg-surface rounded-sm p-4 space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-mono text-[10px] text-fg-dim tracking-wider">BETIQ SCORE</span>
          <span className="font-mono text-base font-bold text-fg-bright">72 <span className="text-fg-dim font-normal text-[10px]">/ 100</span></span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-sm overflow-hidden">
          <motion.div
            className="h-full bg-scalpel rounded-sm"
            initial={{ width: 0 }}
            whileInView={{ width: '72%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] text-fg-dim tracking-wider">TILT INDEX</span>
        <span className="font-mono text-base font-bold" style={{ color: '#D29922' }}>High</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] text-fg-dim tracking-wider">TOTAL RECOVERABLE</span>
        <span className="font-mono text-xl font-bold" style={{ color: '#3FB950' }}>$2,062</span>
      </div>
    </div>
  );
}

const VISUALS = [CsvVisual, ScanVisual, ReportVisual];

export default function ProductWalkthrough() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {STEPS.map((step, i) => {
        const Visual = VISUALS[i];
        return (
          <div key={step.num} className="relative">
            {/* Step number + connector */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-sm bg-scalpel/[0.12] flex items-center justify-center shrink-0">
                <span className="font-mono text-sm font-bold text-scalpel">{step.num}</span>
              </div>
              <h3 className="font-bold text-lg text-fg-bright">{step.title}</h3>
              {i < 2 && (
                <div className="hidden md:block flex-1 h-px bg-white/[0.06] ml-2" />
              )}
            </div>
            {/* Visual */}
            <Visual />
            {/* Description */}
            <p className="text-sm text-fg leading-relaxed mt-4">{step.description}</p>
          </div>
        );
      })}
    </div>
  );
}
