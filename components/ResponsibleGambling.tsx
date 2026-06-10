import Link from 'next/link';
import {
  CRISIS_LIFELINE,
  CRISIS_LIFELINE_URL,
  PROBLEM_GAMBLING_HELPLINE,
  PROBLEM_GAMBLING_HELPLINE_TEL,
  SUPPORT_PAGE_PATH,
} from '@/lib/support-resources';

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
          Need support? Call or text{' '}
          <a href={`tel:${PROBLEM_GAMBLING_HELPLINE_TEL}`} className="text-scalpel font-medium">{PROBLEM_GAMBLING_HELPLINE}</a>
          {' // '}
          <Link href={SUPPORT_PAGE_PATH} className="text-scalpel hover:underline">support resources</Link>
          {' // '}
          crisis support{' '}
          <Link href={CRISIS_LIFELINE_URL} className="text-scalpel hover:underline" target="_blank" rel="noopener noreferrer">{CRISIS_LIFELINE}</Link>
        </p>
      </div>
    </div>
  );
}
