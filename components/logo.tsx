import Image from 'next/image';

const SIZES = {
  xs: 24,
  sm: 30,
  md: 36,
  lg: 56,
  xl: 104,
} as const;

type LogoSize = keyof typeof SIZES;

export function Logo({ size = 'md', className }: { size?: LogoSize; className?: string }) {
  const h = SIZES[size];
  // Lockup SVG aspect ratio is 2400:600 = 4:1
  const w = h * 4;
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
