'use client';

import { Lock } from 'lucide-react';

interface RedactedValueProps {
  type: 'dollar' | 'text' | 'section';
  /** Number of characters to show before blur (for 'text' type). Default 15. */
  preview?: number;
  /** Retained for backwards-compatible call sites. */
  seed?: string;
  /** Retained for backwards-compatible call sites. */
  index?: number;
  /** Called when user clicks on the redacted area. */
  onUpgrade?: () => void;
  /** Whether the redaction should act as a purchase control. */
  interactive?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Legacy reports omitted visibility tags. Treat only that legacy absence and
 * an explicit visible tag as renderable. Every redaction or unknown tag fails
 * closed so a numeric sentinel can never be mistaken for a real value.
 */
export function isReportValueVisible(visibility: string | null | undefined): boolean {
  return visibility == null || visibility === 'visible';
}

export default function RedactedValue({
  type,
  preview = 15,
  onUpgrade,
  interactive = true,
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
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${interactive ? 'cursor-pointer group' : ''} ${className}`}
        onClick={interactive ? handleClick : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? 'See your full dollar costs' : undefined}
        title={interactive ? 'See your full dollar costs' : undefined}
      >
        <Lock size={12} className="text-scalpel opacity-60 group-hover:opacity-100 shrink-0" />
        <span className="font-mono text-xs text-fg-muted">Locked</span>
      </span>
    );
  }

  if (type === 'text') {
    const text = typeof children === 'string' ? children : '';
    const visible = text.slice(0, preview);
    const hidden = text.slice(preview) || 'This content requires the full report to view.';
    return (
      <span
        className={`${interactive ? 'cursor-pointer group' : ''} ${className}`}
        onClick={interactive ? handleClick : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        title={interactive ? 'See your full dollar costs' : undefined}
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
      className={`relative ${interactive ? 'cursor-pointer group' : ''} ${className}`}
      onClick={interactive ? handleClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
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
      {interactive && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1.5 text-xs text-scalpel font-mono">
            <Lock size={12} />
            See full report
          </span>
        </div>
      )}
    </div>
  );
}
