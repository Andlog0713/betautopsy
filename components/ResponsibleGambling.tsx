import Link from 'next/link';

export default function ResponsibleGambling() {
  return (
    <div className="border-t border-border-subtle">
      <div className="max-w-4xl mx-auto py-6 px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border text-fg-dim text-xs font-bold">
            21+
          </span>
          <span className="text-fg-muted text-sm">
            Gambling Problem? Call{' '}
            <a href="tel:18009426886" className="text-scalpel font-medium">1-800-GAMBLER</a>
          </span>
        </div>
        <p className="text-xs text-fg-dim mt-2">
          BetAutopsy provides behavioral analysis tools only. We are not a sportsbook and do not accept or facilitate wagers. Must be 21+ in applicable jurisdictions.
        </p>
        <p className="text-xs text-fg-dim/60 mt-2">
          <Link href="https://www.ncpgambling.org" className="hover:text-fg-muted" target="_blank" rel="noopener noreferrer">ncpgambling.org</Link>
          {' '}&middot;{' '}
          <Link href="https://www.1800gambler.net" className="hover:text-fg-muted" target="_blank" rel="noopener noreferrer">1800gambler.net</Link>
        </p>
      </div>
    </div>
  );
}
