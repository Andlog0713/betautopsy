"use client";
import { Tabs } from "./ui/tabs";

export function ProductShowcase() {
  const tabs = [
    {
      title: "Upload",
      value: "upload",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-md border border-border-subtle bg-surface-1 p-6 md:p-10">
          <p className="text-lg md:text-2xl font-semibold text-fg-bright mb-2 tracking-tight">
            Drop your CSV and let the autopsy begin
          </p>
          <p className="text-sm text-fg-muted mb-6">
            FanDuel, DraftKings, BetMGM, PrizePicks via Pikkit, and more. Takes 30 seconds.
          </p>
          <div className="border-2 border-dashed border-border-subtle rounded-md p-8 md:p-12 text-center hover:border-scalpel/20 transition-colors">
            <svg className="mx-auto mb-3 text-fg-dim" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-fg-muted">Drag & drop your CSV here</p>
            <p className="text-xs text-fg-dim mt-1">or click to browse</p>
          </div>
        </div>
      ),
    },
    {
      title: "Analyze",
      value: "analyze",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-md border border-border-subtle bg-surface-1 p-6 md:p-10">
          <p className="text-lg md:text-2xl font-semibold text-fg-bright mb-2 tracking-tight">
            47 behavioral metrics. Zero judgment.
          </p>
          <p className="text-sm text-fg-muted mb-6">
            Emotional patterns, loss-chasing, stake escalation, hidden edges. About 60 seconds.
          </p>
          <div className="space-y-3">
            {[
              { label: "Emotion Patterns", width: "85%" },
              { label: "Loss Chasing", width: "60%" },
              { label: "Bankroll Discipline", width: "75%" },
              { label: "Hidden Edges", width: "45%" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-fg-muted mb-1.5">
                  <span className="font-mono">{item.label}</span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-scalpel rounded-full transition-all duration-1000"
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Report",
      value: "report",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-md border border-border-subtle bg-surface-1 p-6 md:p-10">
          <p className="text-lg md:text-2xl font-semibold text-fg-bright mb-2 tracking-tight">
            A forensic breakdown of your betting DNA
          </p>
          <p className="text-sm text-fg-muted mb-6">
            Five chapters. BetIQ Score, tilt patterns, discipline grade, edges, dollar-amount recovery plan.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg-muted">BetIQ Score</span>
              <span className="text-xl font-bold font-mono text-fg-bright">72 <span className="text-sm text-fg-dim font-normal">/ 100</span></span>
            </div>
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full bg-scalpel rounded-full" style={{ width: "72%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg-muted">Tilt Index</span>
              <span className="text-sm font-medium font-mono text-caution">High</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <span className="text-sm text-fg-muted">Total Recoverable</span>
              <span className="text-xl font-bold font-mono text-scalpel">$2,062</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="h-[22rem] md:h-[30rem] [perspective:1000px] relative flex flex-col max-w-4xl mx-auto w-full items-start justify-start">
      <Tabs tabs={tabs} />
    </div>
  );
}
