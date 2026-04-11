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
        <h1 className="font-extrabold text-4xl md:text-6xl leading-[1.08] tracking-tight mb-2 text-[#fbf9ff]">
          See what your <span className="text-scalpel">betting data</span> is trying to tell you.
        </h1>
        <p className="font-mono text-base md:text-lg text-fg-muted font-light tracking-wide mt-4 mb-8">
          47 behavioral metrics. 60 seconds. One forensic report.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/signup" className="btn-primary text-base !px-8 !py-3">Get Your Autopsy Report</Link>
          <Link href="/quiz" className="btn-secondary text-sm !px-5 !py-2 !border-white/30 !text-fg-bright hover:!bg-white/10">Take the 2-Min Quiz</Link>
        </div>
        <span className="text-fg-muted text-xs mt-3">
          Free snapshot. Full reports <span className="line-through text-fg-dim">$19.99</span> $9.99 — 50% off.
        </span>
      </>
    );
  }

  return (
    <>
      {variant === 'A' ? (
        <>
          <TextGenerateEffect
            words="See what your betting data is trying to tell you."
            className="text-4xl md:text-6xl text-[#fbf9ff] leading-[1.08] mb-2"
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
            className="text-4xl md:text-6xl text-[#fbf9ff] leading-[1.08] mb-2"
            duration={0.4}
            highlight="47"
          />
          <p className="text-fg text-base md:text-lg max-w-2xl mt-4 mb-8 leading-relaxed animate-fade-in-d2">
            Find the patterns costing you money and get a plan to fix them.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up-d2">
        <Link href="/signup" className="btn-primary text-base !px-8 !py-3" onClick={trackClick}>
          Get Your Autopsy Report
        </Link>
        <Link href="/quiz" className="btn-secondary text-base !px-8 !py-3 !border-white/30 !text-fg-bright hover:!bg-white/10" onClick={trackClick}>
          Take the 2-Min Quiz
        </Link>
      </div>
      <span className="text-fg-muted text-xs mt-3 animate-slide-up-d2">
        Free snapshot. Full reports <span className="line-through text-fg-dim">$19.99</span> $9.99 — 50% off.
      </span>
    </>
  );
}
