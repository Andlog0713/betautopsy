'use client';

import { useEffect, useRef, useState } from 'react';
import SmartCTALink from '@/components/SmartCTALink';
import { PRICING_ENABLED } from '@/lib/feature-flags';

/**
 * Fixed-bottom CTA bar for the homepage's embedded demo report (id="sample"
 * section). Same pattern as components/SampleStickyBar.tsx (that one drives
 * /sample), but /sample's trigger is a flat 300px page-scroll threshold -
 * wrong here, since the report sits far down a much longer homepage. This
 * one triggers off the report section's own position instead: visible once
 * its top edge has scrolled above the viewport, hidden again if the user
 * scrolls back above it. The report itself is collapsed to a ~1200px
 * preview + its own CTA until expanded, so this bar's job is specifically
 * to keep a CTA within reach once a visitor expands it and scrolls the full
 * report - reaching one shouldn't require scrolling all the way to the
 * bottom of the page.
 *
 * Analytics fire under distinct event names from SampleStickyBar's so the
 * two surfaces stay distinguishable in reporting.
 */
export default function HomeReportStickyBar() {
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const viewFiredRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const section = document.getElementById('sample');
    if (!section) return;

    function onScroll() {
      const shouldShow = section!.getBoundingClientRect().top <= 0;
      if (shouldShow && !viewFiredRef.current) {
        window.gtag?.('event', 'home_report_sticky_cta_view', {
          source: 'home_report_sticky_bar',
        });
        viewFiredRef.current = true;
      }
      setVisible(shouldShow);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleClick() {
    window.gtag?.('event', 'home_report_sticky_cta_click', {
      source: 'home_report_sticky_bar',
    });
  }

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
      <div className="flex sm:hidden items-center justify-center h-full px-4">
        <SmartCTALink
          intent="snapshot"
          onClick={handleClick}
          className="btn-primary w-full text-center"
        >
          Get Your Autopsy
        </SmartCTALink>
      </div>

      <div className="hidden sm:flex items-center justify-between h-full px-6 max-w-5xl mx-auto">
        <p className="font-mono text-[10px] text-fg-bright tracking-[1.5px] uppercase">
          {PRICING_ENABLED
            ? 'FREE SNAPSHOT. FULL REPORTS $19.99.'
            : 'FREE DURING BETA. NO CREDIT CARD REQUIRED.'}
        </p>
        <SmartCTALink
          intent="snapshot"
          onClick={handleClick}
          className="btn-primary"
        >
          Get Your Autopsy
        </SmartCTALink>
      </div>
    </div>
  );
}
