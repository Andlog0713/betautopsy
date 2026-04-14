'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * Fixed-bottom CTA bar for the /sample page. Appears after the user scrolls
 * past 300px, slides up (or fades in for reduced-motion users), captures
 * conversion interest from readers who get hooked mid-scroll and lose the
 * top CTA.
 *
 * Analytics:
 * - Fires `sample_sticky_cta_view` once on first appearance (useRef guard)
 * - Fires `sample_sticky_cta_click` on button click before navigation
 *
 * The /sample page itself is a server component. This client component is
 * imported into it as a child, which is valid Next.js composition and keeps
 * the sample page SSR + SEO-friendly.
 */
export default function SampleStickyBar() {
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const viewFiredRef = useRef(false);

  // Detect prefers-reduced-motion once on mount. We use matchMedia instead
  // of Tailwind's motion-reduce: variants because we need the JS state for
  // the scroll-visibility logic anyway, and it keeps all animation decisions
  // centralized in this component.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
  }, []);

  // Scroll listener: show after 300px, fire view event on first show.
  // CRITICAL: fire gtag OUTSIDE the setVisible call. React StrictMode
  // double-invokes functional state setters in dev, which would cause the
  // view event to fire twice if we put it inside a setVisible((prev) => ...)
  // callback. Read the ref, fire the event imperatively, then call setVisible
  // with the raw boolean.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onScroll() {
      const shouldShow = window.scrollY > 300;
      if (shouldShow && !viewFiredRef.current) {
        window.gtag?.('event', 'sample_sticky_cta_view', {
          source: 'sample_sticky_bar',
        });
        viewFiredRef.current = true;
      }
      setVisible(shouldShow);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    // Run once on mount to handle the edge case where the user lands
    // mid-scroll (restored scroll position, back button, deep link).
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleClick() {
    window.gtag?.('event', 'sample_sticky_cta_click', {
      source: 'sample_sticky_bar',
    });
  }

  // Choose animation style: translate for full-motion, opacity for reduced.
  // Reduced-motion users get a simple fade with no transform at all.
  const visibilityClass = reducedMotion
    ? visible
      ? 'opacity-100'
      : 'opacity-0 pointer-events-none'
    : visible
      ? 'translate-y-0'
      : 'translate-y-full';

  const transitionClass = reducedMotion
    ? 'transition-opacity duration-300'
    : 'transition-transform duration-300';

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-50 bg-base border-t border-border-subtle h-14 sm:h-16 ${transitionClass} ${visibilityClass}`}
      aria-hidden={!visible}
    >
      {/* Mobile: centered full-width button, label hidden entirely. */}
      <div className="flex sm:hidden items-center justify-center h-full px-4">
        <Link
          href="/signup"
          onClick={handleClick}
          className="btn-primary w-full text-center"
        >
          Get Your Autopsy
        </Link>
      </div>

      {/* Desktop: flex row, value-prop label on left, CTA button on right. */}
      <div className="hidden sm:flex items-center justify-between h-full px-6 max-w-5xl mx-auto">
        <p className="font-mono text-[10px] text-fg-dim tracking-[1.5px] uppercase">
          FREE SNAPSHOT. FULL REPORTS $9.99 (50% OFF).
        </p>
        <Link
          href="/signup"
          onClick={handleClick}
          className="btn-primary"
        >
          Get Your Autopsy
        </Link>
      </div>
    </div>
  );
}
