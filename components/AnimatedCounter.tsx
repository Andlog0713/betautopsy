'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, animate } from 'framer-motion';

export default function AnimatedCounter({
  target,
  suffix = '',
  duration = 2,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;

    const controls = animate(motionValue, target, {
      duration,
      ease: 'easeOut',
    });

    const unsubscribe = motionValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toLocaleString() + suffix;
      }
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [isInView, target, suffix, duration, motionValue]);

  return <span ref={ref}>0{suffix}</span>;
}
