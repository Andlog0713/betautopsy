'use client';

import { TextGenerateEffect } from '@/components/ui/text-generate-effect';

export default function HeroHeadline() {
  return (
    <>
      <TextGenerateEffect
        words="Your bets aren't the problem."
        className="text-4xl md:text-6xl text-fg-bright leading-[1.08] mb-2"
        duration={0.4}
      />
      <TextGenerateEffect
        words="Your behavior is."
        className="text-4xl md:text-6xl text-scalpel font-light leading-[1.08] mb-8"
        duration={0.4}
        filter={false}
        startDelay={0.9}
      />
    </>
  );
}
