'use client';

import { Lock } from 'lucide-react';

interface RedactedValueProps {
  type: 'dollar' | 'text' | 'section';
  /** Number of characters to show before blur (for 'text' type). Default 15. */
  preview?: number;
  /** Report ID for generating consistent fake dollar amounts. */
  seed?: string;
  /** Index for generating different fake amounts per field. */
  index?: number;
  /** Called when user clicks on the redacted area. */
  onUpgrade?: () => void;
  children?: React.ReactNode;
  className?: string;
}

/** Simple hash to generate deterministic numbers from a string. */
function hashSeed(s: string, offset: number): number {
  let h = 0;
  const str = s + String(offset);
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Generate a plausible dollar amount between $180 and $4,200. */
function fakeDollar(seed: string, index: number): string {
  const h = hashSeed(seed || 'default', index);
  const base = 180 + (h % 4020);
  // Round to nearest $10 for realism
  const rounded = Math.round(base / 10) * 10;
  return rounded.toLocaleString();
}

export default function RedactedValue({
  type,
  preview = 15,
  seed = '',
  index = 0,
  onUpgrade,
  children,
  className = '',
}: RedactedValueProps) {
  const handleClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Scroll to nearest paywall CTA
      const cta = document.querySelector('[data-paywall-cta]');
      if (cta) cta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (type === 'dollar') {
    const amount = fakeDollar(seed, index);
    return (
      <span
        className={`inline-flex items-center gap-1.5 cursor-pointer group ${className}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        title="See your full dollar costs"
      >
        <span
          className="font-mono tabular-nums select-none"
          style={{ filter: 'blur(7px)', WebkitUserSelect: 'none' }}
          aria-hidden="true"
        >
          ${amount}
        </span>
        <Lock size={12} className="text-scalpel opacity-60 group-hover:opacity-100 shrink-0" />
      </span>
    );
  }

  if (type === 'text') {
    const text = typeof children === 'string' ? children : '';
    const visible = text.slice(0, preview);
    const hidden = text.slice(preview) || 'This content requires the full report to view.';
    return (
      <span
        className={`cursor-pointer group ${className}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        title="See your full dollar costs"
      >
        {preview > 0 && <span>{visible}</span>}
        <span
          className="select-none"
          style={{ filter: 'blur(7px)', WebkitUserSelect: 'none' }}
          aria-hidden="true"
        >
          {hidden}
        </span>
        <Lock size={10} className="text-scalpel opacity-40 group-hover:opacity-80 inline ml-1.5 -mt-0.5" />
      </span>
    );
  }

  // Section type: blur entire block
  return (
    <div
      className={`relative cursor-pointer group ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div
        className="select-none"
        style={{
          filter: 'blur(5px)',
          opacity: 0.4,
          WebkitUserSelect: 'none',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="flex items-center gap-1.5 text-xs text-scalpel font-mono">
          <Lock size={12} />
          See full report
        </span>
      </div>
    </div>
  );
}
