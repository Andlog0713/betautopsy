'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Variant = 'A' | 'B';

function getVariantFromCookie(): Variant | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )hero_variant=(A|B)/);
  return match ? (match[1] as Variant) : null;
}

function setVariantCookie(variant: Variant) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `hero_variant=${variant}; expires=${expires}; path=/; SameSite=Lax`;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function HeroABTest() {
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    let v = getVariantFromCookie();
    if (!v) {
      v = Math.random() < 0.5 ? 'A' : 'B';
      setVariantCookie(v);
    }
    setVariant(v);

    if (window.gtag) {
      window.gtag('event', 'hero_ab_impression', { variant: v });
    }
  }, []);

  // Render Variant A during SSR to prevent layout shift
  const v = variant ?? 'A';

  const trackClick = () => {
    if (window.gtag) {
      window.gtag('event', 'hero_ab_cta_click', { variant: v });
    }
  };

  return (
    <>
      {v === 'A' ? (
        <>
          <h1 className="font-bold text-4xl md:text-6xl leading-[1.08] tracking-tight text-fg-bright mb-2 animate-fade-in">
            See what your <span className="text-scalpel">betting data</span> is trying to tell you.
          </h1>
          <p className="font-mono text-base md:text-lg text-fg-muted tracking-wide mt-4 mb-8 animate-fade-in-d1">
            47 behavioral metrics. 60 seconds. One forensic report.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-bold text-4xl md:text-6xl leading-[1.08] tracking-tight text-fg-bright mb-2 animate-fade-in">
            <span className="text-scalpel">47</span> behavioral metrics. 60 seconds. One upload.
          </h1>
          <p className="text-fg text-base md:text-lg max-w-2xl mb-8 leading-relaxed animate-fade-in-d1">
            Find the patterns costing you money and get a plan to fix them.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start animate-slide-up-d2">
        <Link href="/signup" className="btn-primary text-base !px-8 !py-3" onClick={trackClick}>
          Get Your Free Report
        </Link>
        <span className="text-fg-muted text-xs mt-3 sm:mt-4">
          No credit card required.
        </span>
      </div>
    </>
  );
}
