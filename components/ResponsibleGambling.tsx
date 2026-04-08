import Link from 'next/link';

export default function ResponsibleGambling() {
  return (
    <div className="border-t border-border-subtle">
      <div className="max-w-4xl mx-auto py-6 px-4 text-center space-y-3">
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border text-fg-dim text-xs font-bold">
            18+
          </span>
        </div>
        <p className="text-xs text-fg-dim">
          BetAutopsy provides behavioral analysis tools only. We do not accept, place, or facilitate wagers of any kind. Must be 18+ to use this service.
        </p>
        <p className="text-xs text-fg-dim">
          We are not affiliated with, endorsed by, or officially connected to any sportsbook, DFS platform, prediction market, or sports league. Any third-party names, logos, or trademarks are property of their respective owners.
        </p>
        <p className="text-xs text-fg-muted">
          Gambling Problem? Call{' '}
          <a href="tel:18009426886" className="text-scalpel font-medium">1-800-GAMBLER</a>
          {' // '}
          <Link href="https://www.ncpgambling.org" className="text-scalpel hover:underline" target="_blank" rel="noopener noreferrer">ncpgambling.org</Link>
        </p>
      </div>
    </div>
  );
}
