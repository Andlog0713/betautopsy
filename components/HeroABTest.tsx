'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';

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

  const trackClick = () => {
    if (variant && window.gtag) {
      window.gtag('event', 'hero_ab_cta_click', { variant });
    }
  };

  // During SSR and pre-hydration, render variant A as visible, crawlable
  // content so Googlebot always sees a real H1 and body text. Once hydrated,
  // the client-side variant takes over seamlessly.
  if (variant === null) {
    return (
      <>
        <h1 className="font-bold text-4xl md:text-6xl leading-[1.08] tracking-tight mb-2 text-fg-bright">
          See what your betting data is trying to tell you.
        </h1>
        <p className="font-mono text-base md:text-lg text-fg-muted tracking-wide mt-4 mb-8">
          Upload your sports betting history and get a full behavioral analysis — cognitive biases, emotional patterns, and a personalized action plan to stop the leaks.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Link href="/signup" className="btn-primary text-base !px-8 !py-3">Get Your Autopsy Report</Link>
          <span className="text-fg-muted text-xs mt-3 sm:mt-4">
            Free snapshot. Full reports from $9.99.
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      {variant === 'A' ? (
        <>
          <TextGenerateEffect
            words="See what your betting data is trying to tell you."
            className="text-4xl md:text-6xl text-fg-bright leading-[1.08] mb-2"
            duration={0.4}
            highlight="betting data"
          />
          <p className="font-mono text-base md:text-lg text-fg-muted tracking-wide mt-4 mb-8 animate-fade-in-d2">
            47 behavioral metrics. 60 seconds. One forensic report.
          </p>
        </>
      ) : (
        <>
          <TextGenerateEffect
            words="47 behavioral metrics. 60 seconds. One upload."
            className="text-4xl md:text-6xl text-fg-bright leading-[1.08] mb-2"
            duration={0.4}
            highlight="47"
          />
          <p className="text-fg text-base md:text-lg max-w-2xl mt-4 mb-8 leading-relaxed animate-fade-in-d2">
            Find the patterns costing you money and get a plan to fix them.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start animate-slide-up-d2">
        <Link href="/signup" className="btn-primary text-base !px-8 !py-3" onClick={trackClick}>
          Get Your Autopsy Report
        </Link>
        <span className="text-fg-muted text-xs mt-3 sm:mt-4">
          Free snapshot. Full reports from $9.99.
        </span>
      </div>
    </>
  );
}
