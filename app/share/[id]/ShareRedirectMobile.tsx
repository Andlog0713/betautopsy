'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isMobileApp } from '@/lib/platform';

/**
 * Mobile-build stand-in for the shared report page.
 *
 * The real `/share/[id]` flow (on web) is a Server Component that
 * calls `cookies()` and reads `share_tokens` via a request-bound
 * Supabase client. That pattern can't run under `output: 'export'`:
 * there is no request at prerender time, and `generateStaticParams`
 * can't enumerate user-generated share IDs. So the mobile build
 * ships this client component instead.
 *
 * When it mounts inside the Capacitor native webview, it pulls the
 * share id off `window.location.pathname` and opens the canonical
 * web URL in the system browser (so the user sees the full report,
 * auth cookies and all). When a share link somehow lands here in a
 * regular browser — which shouldn't happen, because only the mobile
 * build rewrites `/share/[id]` to this component — we fall back to
 * a manual link.
 */
export default function ShareRedirectMobile() {
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // `/share/<id>` → `<id>`. Strip a trailing slash and query just
    // in case the router hands us a normalized path.
    const match = window.location.pathname.match(/\/share\/([^/?#]+)/);
    const id = match?.[1];
    if (!id) return;

    const canonical = `https://www.betautopsy.com/share/${id}`;
    setShareUrl(canonical);

    if (isMobileApp()) {
      // Inside Capacitor: bounce straight to the system browser.
      // Using `window.open` with `_system` is the Capacitor-era
      // convention; plain `window.location.href` would open inside
      // the webview and defeat the point.
      try {
        window.open(canonical, '_system');
      } catch {
        window.location.href = canonical;
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-2xl tracking-tight mb-2 text-fg-bright">
          Opening your report…
        </h1>
        <p className="text-fg-muted text-sm mb-6">
          Share reports open on the web so the full layout renders
          correctly. If your browser didn&apos;t launch automatically,
          tap the link below.
        </p>
        {shareUrl ? (
          <a href={shareUrl} className="btn-primary inline-block">
            Open Report in Browser
          </a>
        ) : (
          <Link href="/" className="btn-primary inline-block">
            Back to BetAutopsy
          </Link>
        )}
      </div>
    </div>
  );
}
