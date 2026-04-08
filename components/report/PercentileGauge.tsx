'use client';

interface PercentileGaugeProps {
  percentile: number;
  invertedScale?: boolean;
  label?: string;
}

export default function PercentileGauge({ percentile, invertedScale = false, label }: PercentileGaugeProps) {
  const defaultLabel = invertedScale
    ? `More controlled than ${percentile}% of bettors`
    : `Better than ${percentile}% of bettors`;

  return (
    <div className="mt-2">
      <div className="relative h-[6px] w-full bg-surface-2">
        <div
          className="absolute inset-0"
          style={{
            background: invertedScale
              ? 'linear-gradient(90deg, #E8453C, #D29922, #00C9A7)'
              : 'linear-gradient(90deg, #E8453C, #D29922, #00C9A7)',
          }}
        />
        <div
          className="absolute top-[-4px] w-[2px] h-[14px] bg-fg-bright transition-all duration-[800ms]"
          style={{
            left: `${Math.max(2, Math.min(98, percentile))}%`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
      <p className="font-mono text-[10px] text-fg-dim mt-1.5">
        {label || defaultLabel}
      </p>
    </div>
  );
}
