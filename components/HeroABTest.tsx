'use client';

import { useState, useEffect } from 'react';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import SmartCTALink from '@/components/SmartCTALink';
import { PRICING_ENABLED } from '@/lib/feature-flags';

// Sub-CTA line. While `PRICING_ENABLED` is false every user is served the Pro
// tier for free, so quoting a price here contradicts what the product
// actually charges — the paywall, the pricing section, and the nav link are
// all hidden in that state.
function CtaSubtext() {
  return (
    <span className="text-fg-muted text-xs mt-3 animate-slide-up-d2">
      {PRICING_ENABLED ? (
        <>
          Free snapshot. Full reports $19.99.
        </>
      ) : (
        <>Free during beta. No credit card required.</>
      )}
    </span>
  );
}

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
  // content so the first paint carries a real H1 and body text. Once
  // hydrated, the client-side variant takes over seamlessly — and both live
  // variants pass `as="h1"` to TextGenerateEffect so the heading survives
  // hydration. It previously did not: TextGenerateEffect defaults to a
  // `div`, so the hydrated DOM had zero H1s and JS-rendering crawlers
  // (Googlebot included) saw a headline with no heading semantics.
  if (variant === null) {
    return (
      <>
        <h1 className="font-extrabold text-4xl md:text-6xl leading-[1.08] tracking-tight mb-2 text-fg-bright">
          See what your <span className="text-scalpel">betting data</span> is trying to tell you.
        </h1>
        <p className="font-mono text-base md:text-lg text-fg-muted font-light tracking-wide mt-4 mb-8">
          47 behavioral signals. 60 seconds. One forensic report.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <SmartCTALink intent="snapshot" className="btn-primary text-base !px-8 !py-3">Get Your Autopsy Report</SmartCTALink>
        </div>
        <CtaSubtext />
      </>
    );
  }

  return (
    <>
      {variant === 'A' ? (
        <>
          <TextGenerateEffect
            as="h1"
            words="See what your betting data is trying to tell you."
            className="text-4xl md:text-6xl text-fg-bright leading-[1.08] mb-2"
            duration={0.4}
            highlight="betting data"
          />
          <p className="font-mono text-base md:text-lg text-fg-muted tracking-wide mt-4 mb-8 animate-fade-in-d2">
            47 behavioral signals. 60 seconds. One forensic report.
          </p>
        </>
      ) : (
        <>
          <TextGenerateEffect
            as="h1"
            words="47 behavioral signals. 60 seconds. One upload."
            className="text-4xl md:text-6xl text-fg-bright leading-[1.08] mb-2"
            duration={0.4}
            highlight="47"
          />
          <p className="text-fg text-base md:text-lg max-w-2xl mt-4 mb-8 leading-relaxed animate-fade-in-d2">
            Find the patterns costing you money and get a plan to fix them.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up-d2">
        <SmartCTALink intent="snapshot" className="btn-primary text-base !px-8 !py-3" onClick={trackClick}>
          Get Your Autopsy Report
        </SmartCTALink>
      </div>
      <CtaSubtext />
    </>
  );
}
