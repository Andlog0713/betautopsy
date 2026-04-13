import Link from 'next/link';

/**
 * Disclaimer for paid-traffic landing pages (TikTok, Meta, Snap ads).
 *
 * Ad platforms running gambling-adjacent creatives require the
 * 1-800-GAMBLER language on the landing page. Keep this text exactly
 * as-is unless you have legal sign-off to change it.
 *
 * Do NOT use this on organic/SEO pages — those use <ResponsibleGambling />
 * with the softer "behavioral analysis tool" framing.
 */
export default function PaidTrafficDisclaimer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border-subtle py-8 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-3">
        <p className="text-fg-dim text-xs leading-relaxed">
          For entertainment and educational purposes only. Not gambling advice. 18+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
        </p>
        <p className="font-mono text-[10px] text-fg-dim">
          © {year} Diagnostic Sports, LLC
          <span className="mx-2">·</span>
          <Link href="/privacy" className="hover:text-fg-muted">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-fg-muted">Terms</Link>
        </p>
      </div>
    </footer>
  );
}
