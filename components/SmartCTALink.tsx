'use client';

import Link from 'next/link';
import { useAuthState } from '@/components/AuthProvider';

/**
 * Auth-aware CTA. Routes to the right destination based on whether the
 * user is signed in and whether they've already run a snapshot.
 *
 * Routing matrix:
 *
 *   intent="snapshot" — "Get Your Autopsy Report" / "Start Free"
 *     anon         → /signup?next=/reports?run=true
 *     no-snapshot  → /reports?run=true
 *     has-snapshot → /reports?id=<latest>
 *
 *   intent="report" — "Get your report" (Full Report card)
 *     anon         → /signup?next=/reports?run=true   (run snapshot first;
 *                                                      the inline paywall
 *                                                      converts better than
 *                                                      the pricing grid)
 *     no-snapshot  → /reports?run=true
 *     has-snapshot → /pricing
 *
 * intent="pro" removed 2026-08-17 (D1): Pro is no longer marketed on web,
 * so nothing renders a "Go Pro" CTA anymore. Existing Pro subscribers
 * still manage their subscription from /pricing directly - see
 * app/(dashboard)/pricing/page.tsx.
 *
 * While the auth check is in flight, we render a disabled
 * placeholder so a fast click during the loading window doesn't
 * ship an authed user to /signup (the safest default href).
 */
export type CTAIntent = 'snapshot' | 'report';

interface SmartCTALinkProps {
  intent: CTAIntent;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

function buildHref(intent: CTAIntent, auth: ReturnType<typeof useAuthState>): string {
  if (auth.status === 'anon') {
    return '/signup?next=' + encodeURIComponent('/reports?run=true');
  }

  if (auth.status === 'no-snapshot') {
    return '/reports?run=true';
  }

  if (auth.status === 'has-snapshot') {
    if (intent === 'snapshot') return `/reports?id=${auth.snapshotId}`;
    return '/pricing';
  }

  // status === 'loading' — fall back to /signup. Component renders as
  // a disabled button while loading so this href is never followed.
  return '/signup';
}

export default function SmartCTALink({ intent, className, children, onClick }: SmartCTALinkProps) {
  const auth = useAuthState();

  if (auth.status === 'loading') {
    return (
      <button
        type="button"
        disabled
        aria-busy="true"
        className={className}
        style={{ opacity: 0.7, cursor: 'wait' }}
      >
        {children}
      </button>
    );
  }

  return (
    <Link href={buildHref(intent, auth)} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
