'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';

type Activity = {
  kind: 'archetype' | 'grade' | 'bias' | 'report';
  text: string;
  minutes_ago: number;
};

interface RealtimeActivityProps {
  /** Total bets analyzed across the platform — used as static fallback
   *  if no live activity is available in the last hour. */
  fallbackBets: string;
  /** Total reports generated across the platform — used as static
   *  fallback if no live activity is available. */
  fallbackReports: string;
}

function formatTime(minutes: number): string {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function RealtimeActivity({
  fallbackBets,
  fallbackReports,
}: RealtimeActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Fetch live activities from /api/recent-activity. Refresh every
  // 60 seconds so the ticker stays fresh without hammering the API.
  useEffect(() => {
    let cancelled = false;
    async function fetchActivities() {
      try {
        const res = await apiGet('/api/recent-activity');
        if (!res.ok) return;
        const data = (await res.json()) as { activities?: Activity[] };
        if (!cancelled && data.activities && data.activities.length > 0) {
          setActivities(data.activities);
        }
      } catch {
        /* silent — component falls back to static totals */
      }
    }
    fetchActivities();
    const id = setInterval(fetchActivities, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Rotate through activities every 4 seconds with a short fade.
  useEffect(() => {
    if (activities.length === 0) return;
    const id = setInterval(() => {
      setVisible(false);
      // Short pause for the fade-out before swapping the text.
      setTimeout(() => {
        setIndex((i) => (i + 1) % activities.length);
        setVisible(true);
      }, 250);
    }, 4000);
    return () => clearInterval(id);
  }, [activities.length]);

  const isLive = activities.length > 0;
  const current = isLive ? activities[index] : null;

  return (
    <div className="bg-surface-1 border-y border-border-subtle py-4">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-3">
        {/* Pulsing dot: teal when live data, dim gray when showing static fallback */}
        <span className="relative flex h-2 w-2 shrink-0">
          {isLive && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-scalpel opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isLive ? 'bg-scalpel' : 'bg-fg-dim'
            }`}
          />
        </span>
        {isLive && current ? (
          <p
            className={`font-mono text-xs sm:text-sm text-fg-muted transition-opacity duration-300 text-center ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="text-fg-bright">{current.text}</span>
            <span className="text-fg-dim mx-2">·</span>
            <span className="text-fg-dim">{formatTime(current.minutes_ago)}</span>
          </p>
        ) : (
          <p className="font-mono text-xs sm:text-sm text-fg-muted text-center">
            <span className="text-fg-bright font-bold">{fallbackBets}</span> bets analyzed
            <span className="text-fg-dim mx-2">·</span>
            <span className="text-fg-bright font-bold">{fallbackReports}</span> reports generated
            <span className="text-fg-dim mx-2">·</span>
            <span className="text-fg-bright font-bold">47</span> signals per report
          </p>
        )}
      </div>
    </div>
  );
}
