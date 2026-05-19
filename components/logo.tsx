'use client';

import Image from 'next/image';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'mark' | 'horizontal' | 'stacked';
  theme?: 'dark' | 'light' | 'brand';
  className?: string;
  showTagline?: boolean;
}

// h = Y-mark display height. wordmarkH = wordmark image display height.
// gap = flex gap between mark and wordmark.
const SIZES = {
  xs:  { h: 24,  wordmarkH: 19, gap: 'gap-2',   tagSize: 'text-[6px]' },
  sm:  { h: 30,  wordmarkH: 24, gap: 'gap-2.5', tagSize: 'text-[7px]' },
  md:  { h: 36,  wordmarkH: 30, gap: 'gap-3',   tagSize: 'text-[8px]' },
  lg:  { h: 56,  wordmarkH: 46, gap: 'gap-5',   tagSize: 'text-[10px]' },
  xl:  { h: 104, wordmarkH: 84, gap: 'gap-9',   tagSize: 'text-[14px]' },
};

// Wordmark SVG aspect ratio: 4164 / 720 = 5.78
const WORDMARK_RATIO = 5.78;

function IncisionMark({
  height, fill,
}: {
  height: number; fill: string;
}) {
  const vx = 310; const vy = 110; const vw = 305; const vh = 305;
  const displayW = (vw / vh) * height;
  return (
    <svg width={displayW} height={height} viewBox={`${vx} ${vy} ${vw} ${vh}`} fill="none" aria-hidden="true">
      <path fill={fill} d="M324.645 128.243C326.245 128.816 338.911 139.108 341.313 140.989C380.166 171.663 418.416 203.092 456.042 235.259C455.606 249.463 455.993 265.963 455.989 280.356L456.002 370.545C456.004 383.669 456.336 398.162 455.879 411.129L455.518 411.048C453.001 407.401 448.515 398.95 446.072 394.723L426.176 360.435L426.221 264.719C408.136 241.715 389.974 217.123 372.396 193.687C361.978 179.871 351.689 165.959 341.53 151.952C335.908 144.212 329.956 136.162 324.645 128.243Z"/>
      <path fill={fill} d="M599.898 128.243C598.299 128.816 585.633 139.108 583.23 140.989C544.377 171.663 506.127 203.092 468.501 235.259C468.937 249.463 468.55 265.963 468.554 280.356L468.541 370.545C468.539 383.669 468.207 398.162 468.665 411.129L469.025 411.048C471.542 407.401 476.028 398.95 478.471 394.723L498.368 360.435L498.322 264.719C516.407 241.715 534.569 217.123 552.147 193.687C562.565 179.871 572.854 165.959 583.013 151.952C588.635 144.212 594.587 136.162 599.898 128.243Z"/>
    </svg>
  );
}

export function Logo({
  size = 'md', variant = 'horizontal', theme = 'dark', className = '', showTagline = false,
}: LogoProps) {
  const s = SIZES[size];
  const markFill = theme === 'light' ? '#0A0E12' : '#FACC15';
  const wordmarkSrc = theme === 'light'
    ? '/brand/betautopsy-wordmark-dark-on-white.svg'
    : '/brand/betautopsy-wordmark-yellow-transparent.svg';
  const wordmarkW = Math.round(s.wordmarkH * WORDMARK_RATIO);

  const mark = <IncisionMark height={s.h} fill={markFill} />;

  const wordmark = (
    <Image
      src={wordmarkSrc}
      alt="BetAutopsy"
      width={wordmarkW}
      height={s.wordmarkH}
      priority={size === 'lg' || size === 'xl'}
      style={{ height: s.wordmarkH, width: 'auto' }}
    />
  );

  if (variant === 'mark') return <div className={className}>{mark}</div>;

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        {mark}
        <div className="mt-2">{wordmark}</div>
        {showTagline && (
          <div className={`${s.tagSize} text-fg-dim tracking-[3px] font-medium uppercase mt-1`}>
            Dissect your decisions
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {mark}
      <div className="flex flex-col">
        {wordmark}
        {showTagline && (
          <div className={`${s.tagSize} text-fg-dim tracking-[3px] font-medium uppercase mt-0.5`}>
            Dissect your decisions
          </div>
        )}
      </div>
    </div>
  );
}
