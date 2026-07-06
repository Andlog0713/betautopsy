'use client';

/**
 * Client-side platform metrics display.
 *
 * Renders the static marketing counts (`fallbackBets` / `fallbackReports`)
 * in the hero of `/`, `/sample`, and `/go`. Kept as a Client Component so the
 * same markup renders on both the web and mobile (`output: 'export'`) builds
 * without reading Supabase at render time.
 *
 * The numbers are static display strings and render unconditionally — there is
 * no liveness probe and no fallback/override path. (Previously this component
 * gated the whole block on a `/api/recent-activity` fetch and rendered nothing
 * until it returned; that hid the numbers on first paint and while offline.)
 */

interface PlatformMetricsProps {
  variant: 'landing' | 'sample';
  /** Display string for total bets analyzed. */
  fallbackBets: string;
  /** Display string for total reports generated (landing variant only). */
  fallbackReports?: string;
}

export default function PlatformMetrics({
  variant,
  fallbackBets,
  fallbackReports,
}: PlatformMetricsProps) {
  if (variant === 'sample') {
    return (
      <div className="max-w-5xl mx-auto px-6 text-center">
        <div className="font-mono text-5xl md:text-6xl font-bold text-fg-bright">
          {fallbackBets}
        </div>
        <div className="font-mono text-xs text-fg-dim tracking-[2px] uppercase mt-3">
          Bets Analyzed
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex gap-10 animate-fade-in-d3">
      <div>
        <div className="font-mono text-2xl font-bold text-fg-bright">
          {fallbackBets}
        </div>
        <div className="font-mono text-[10px] text-fg-dim tracking-[2px] uppercase mt-1">
          Bets Analyzed
        </div>
      </div>
      {fallbackReports && (
        <div>
          <div className="font-mono text-2xl font-bold text-fg-bright">
            {fallbackReports}
          </div>
          <div className="font-mono text-[10px] text-fg-dim tracking-[2px] uppercase mt-1">
            Reports Generated
          </div>
        </div>
      )}
    </div>
  );
}
