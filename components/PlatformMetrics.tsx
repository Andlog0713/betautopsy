'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';

/**
 * Client-side platform metrics display.
 *
 * Previously this lived inline in the hero sections of `/`, `/sample`,
 * and `/go` as a Server Component that called `createServiceRoleClient()`
 * and queried Supabase at render time. That pattern blocks the mobile
 * (`output: 'export'`) build because it reads `SUPABASE_SERVICE_ROLE_KEY`
 * from `process.env` and hits the database during SSG.
 *
 * Now it's a Client Component that fetches the public, edge-cached
 * `/api/recent-activity` endpoint on mount purely as a liveness probe.
 * The displayed numbers come from `fallbackBets` / `fallbackReports`
 * props — same defaults as `<RealtimeActivity>` — so the hero reads
 * the same on both builds. When the fetch fails (e.g. offline in the
 * mobile app), the whole block renders nothing rather than showing
 * stale zeros.
 */

type Activity = {
  kind: 'archetype' | 'grade' | 'bias' | 'report';
  text: string;
  minutes_ago: number;
};

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet('/api/recent-activity');
        if (!res.ok) return;
        // We don't actually need the payload — a 200 is enough to
        // confirm connectivity. Parse it anyway so the edge cache
        // counts the hit and we surface any JSON-shape regressions.
        const data = (await res.json()) as { activities?: Activity[] };
        if (cancelled) return;
        if (data && Array.isArray(data.activities)) {
          setReady(true);
        }
      } catch {
        /* silent — stays hidden on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

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
