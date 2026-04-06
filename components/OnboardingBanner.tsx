'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingBannerProps {
  betCount: number;
  reportCount: number;
}

export default function OnboardingBanner({ betCount, reportCount }: OnboardingBannerProps) {
  const [showSteps, setShowSteps] = useState(false);

  // Default to expanded on desktop
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setShowSteps(true);
    }
  }, []);

  if (betCount > 0 && reportCount > 0) return null;

  if (betCount === 0) {
    return (
      <div className="finding-card border-l-scalpel p-5 space-y-4">
        <div>
          <h2 className="text-fg-bright font-semibold text-lg mb-2">
            Import your full betting history
          </h2>
          <p className="text-fg-muted text-sm mb-1">
            Pikkit syncs with your sportsbooks and exports your complete history as a CSV.
            Free for 7 days, that&apos;s all you need to get your data into BetAutopsy.
          </p>
          <p className="text-fg-muted text-xs">
            This is a <strong className="text-fg-bright">one-time import</strong>. After your history is in, you&apos;ll keep it updated by pasting new bets directly. No Pikkit needed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <a
            href="https://links.pikkit.com/invite/surf40498"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Get Pikkit (Free 7-Day Trial)
          </a>
          <span className="text-fg-muted text-xs">
            {'\uD83D\uDCB0'} Get $3–$100 cash from Pikkit when you sign up and sync a sportsbook with 10+ bets
          </span>
        </div>

        <div className="bg-surface-raised rounded-sm p-4 space-y-2">
          <button
            onClick={() => setShowSteps((prev) => !prev)}
            className="text-fg-bright text-sm font-medium w-full text-left flex items-center justify-between"
          >
            <span>{showSteps ? 'Hide instructions' : 'See step-by-step instructions'}</span>
            <span className="text-xs text-fg-muted">{showSteps ? '\u25B4' : '\u25BE'}</span>
          </button>
          {showSteps && (
            <ol className="text-fg-muted text-sm space-y-1.5 list-none pt-1">
              <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">01</span> Download Pikkit and create an account (use our link for a cash bonus)</li>
              <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">02</span> Connect your sportsbooks: DraftKings, FanDuel, BetMGM, etc. (takes 2 min)</li>
              <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">03</span> Start the free 7-day Pro trial (required to export your data)</li>
              <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">04</span> Wait for Pikkit to sync your bets (usually a few minutes)</li>
              <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">05</span> Go to Pikkit Pro {'\u2192'} Settings {'\u2192'} Data Exports {'\u2192'} Download CSV</li>
              <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">06</span> Upload that CSV here using the &quot;Upload CSV&quot; tab below</li>
            </ol>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="finding-card border-l-scalpel p-5">
      <h2 className="text-fg-bright font-semibold text-lg mb-2">
        Your bets are ready
      </h2>
      <p className="text-fg-muted text-sm mb-3">
        You have {betCount} bet{betCount !== 1 ? 's' : ''} loaded. Run your first autopsy to uncover the patterns hiding in your betting history.
      </p>
      <Link href="/reports?run=true" className="btn-primary text-sm">
        Run Autopsy →
      </Link>
    </div>
  );
}
