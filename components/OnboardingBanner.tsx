'use client';

import Link from 'next/link';

interface OnboardingBannerProps {
  betCount: number;
  reportCount: number;
}

export default function OnboardingBanner({ betCount, reportCount }: OnboardingBannerProps) {
  // Don't render if user has both bets and reports
  if (betCount > 0 && reportCount > 0) return null;

  // betCount === 0: Pikkit CTA
  if (betCount === 0) {
    return (
      <div className="finding-card border-l-scalpel p-5">
        <h2 className="text-fg-bright font-bold text-lg mb-2">
          Get your bet history with Pikkit
        </h2>
        <p className="text-fg-muted text-sm mb-3">
          Pikkit syncs directly with your sportsbook accounts and exports your full bet history as a CSV.
          It&apos;s the fastest way to get your data into BetAutopsy.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <a
            href="https://links.pikkit.com/invite/surf40498"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Get Pikkit (Free)
          </a>
          <span className="text-fg-dim text-xs">
            Use our link for a cash bonus on signup
          </span>
        </div>
      </div>
    );
  }

  // betCount > 0, reportCount === 0: Ready to run
  return (
    <div className="finding-card border-l-scalpel p-5">
      <h2 className="text-fg-bright font-bold text-lg mb-2">
        Your bets are ready
      </h2>
      <p className="text-fg-muted text-sm mb-3">
        You have {betCount} bet{betCount !== 1 ? 's' : ''} loaded. Run your first autopsy to uncover the patterns hiding in your betting history.
      </p>
      <Link href="/reports?run=true" className="btn-primary text-sm">
        Run Autopsy {'\u2192'}
      </Link>
    </div>
  );
}
