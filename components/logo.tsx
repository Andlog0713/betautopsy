import Image from 'next/image';

const SIZES = {
  xs: 24,
  sm: 30,
  md: 36,
  lg: 56,
  xl: 104,
} as const;

type LogoSize = keyof typeof SIZES;

// Aspect ratio after viewBox trim from 0 0 2400 600 to 0 100 2400 380.
// 2400 / 380 = 6.32
const LOCKUP_RATIO = 6.32;

export function Logo({
  size = 'md',
  h: heightOverride,
  className,
}: {
  size?: LogoSize;
  h?: number;
  className?: string;
}) {
  const h = heightOverride ?? SIZES[size];
  const w = Math.round(h * LOCKUP_RATIO);
  return (
    <Image
      src="/brand/betautopsy-lockup-horizontal-transparent.svg"
      alt="BetAutopsy"
      width={w}
      height={h}
      priority
      className={className}
    />
  );
}
