'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Signup CTA link for the /go paid-traffic landing page.
 *
 * Preserves every query param (UTM tags, fbclid, ttclid, gclid, any
 * custom attribution keys — passing everything is intentional) on
 * the `/signup` href.
 *
 * This used to live in the Server Component `GoLandingPage` via a
 * `searchParams` prop. Reading `searchParams` on a Server Component
 * marks the page dynamic, and `output: 'export'` (the Capacitor
 * mobile build) hard-fails on dynamic pages. Moving the reads into
 * a Client Component lets the page itself prerender statically.
 *
 * Behavior on web is unchanged for the user: `useSearchParams()`
 * populates after hydration (which is sub-100ms), and `/go` is
 * `robots: noindex/nofollow`, so there's no SEO concern about the
 * pre-hydration `/signup` fallback href.
 */

type LinkProps = Omit<React.ComponentProps<typeof Link>, 'href'>;

function SignupLinkInner(props: LinkProps) {
  const searchParams = useSearchParams();

  const href = useMemo(() => {
    // `useSearchParams()` returns a read-only `URLSearchParams`
    // already, so we can stringify it directly. Empty strings
    // become plain `/signup`.
    const qs = searchParams?.toString() ?? '';
    return qs ? `/signup?${qs}` : '/signup';
  }, [searchParams]);

  return <Link {...props} href={href} />;
}

export default function GoSignupLink(props: LinkProps) {
  // `useSearchParams()` requires a Suspense boundary on
  // statically-rendered pages in Next 14. The fallback uses the
  // plain `/signup` href — clicked before hydration, it still
  // lands the user in the right place, just without UTMs.
  return (
    <Suspense fallback={<Link {...props} href="/signup" />}>
      <SignupLinkInner {...props} />
    </Suspense>
  );
}
