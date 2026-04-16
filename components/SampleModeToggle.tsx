'use client';

export type SampleMode = 'sportsbook' | 'dfs';

interface SampleModeToggleProps {
  mode: SampleMode;
  onChange: (mode: SampleMode) => void;
}

export default function SampleModeToggle({ mode, onChange }: SampleModeToggleProps) {
  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <div className="inline-flex rounded-full border border-border-subtle bg-surface-1 p-1">
        <button
          onClick={() => onChange('sportsbook')}
          className={`px-5 py-1.5 rounded-full font-mono text-xs tracking-wider transition-all duration-200 ${
            mode === 'sportsbook'
              ? 'bg-scalpel text-white shadow-sm'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          SPORTSBOOK
        </button>
        <button
          onClick={() => onChange('dfs')}
          className={`px-5 py-1.5 rounded-full font-mono text-xs tracking-wider transition-all duration-200 ${
            mode === 'dfs'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          PRIZEPICKS / DFS
        </button>
      </div>
      <p className="text-fg-dim text-[11px] font-light">
        Switch to see the analysis for your platform type
      </p>
    </div>
  );
}
