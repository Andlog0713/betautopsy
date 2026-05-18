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
  xs:  { h: 22,  wordmarkH: 14, gap: 'gap-2',   tagSize: 'text-[6px]' },
  sm:  { h: 28,  wordmarkH: 18, gap: 'gap-2.5', tagSize: 'text-[7px]' },
  md:  { h: 36,  wordmarkH: 22, gap: 'gap-2.5', tagSize: 'text-[7.5px]' },
  lg:  { h: 60,  wordmarkH: 34, gap: 'gap-3',   tagSize: 'text-[9px]' },
  xl:  { h: 120, wordmarkH: 56, gap: 'gap-4',   tagSize: 'text-[12px]' },
};

// Wordmark SVG aspect ratio: 4164 / 720 = 5.78
const WORDMARK_RATIO = 5.78;

function IncisionMark({
  height, fill,
}: {
  height: number; fill: string;
}) {
  const vx = 120; const vy = 70; const vw = 270; const vh = 375;
  const displayW = (vw / vh) * height;
  return (
    <svg width={displayW} height={height} viewBox={`${vx} ${vy} ${vw} ${vh}`} fill="none" aria-hidden="true">
      <path fill={fill} d="M271.233,218.224 C271.264,284.173 271.323,350.121 271.293,416.07 C271.289,425.227 265.389,431.29 257.017,431.3 C248.47,431.309 242.7,425.148 242.695,415.605 C242.665,350.155 242.697,284.706 243.137,218.863 C252.83,223.202 262.049,222.684 271.233,218.224z"/>
      <path fill={fill} d="M228.125,189.213 C197.602,165.427 170.038,138.858 149.443,105.712 C145.955,100.099 145.474,94.404 149.217,88.852 C152.61,83.819 157.789,81.471 163.53,83.13 C167.066,84.151 171.15,86.534 173.028,89.533 C191.956,119.77 217.254,143.912 244.919,166.36 C235.464,171.356 230.404,179.239 228.125,189.213z"/>
      <path fill={fill} d="M268.529,166.358 C296.365,144.336 321.842,120.12 340.711,89.634 C345.241,82.317 353.859,80.54 360.721,84.907 C367.5,89.22 369.371,97.697 364.9,105.085 C350.366,129.095 331.677,149.602 310.912,168.278 C302.995,175.4 294.638,182.032 285.961,188.736 C283.701,178.21 277.62,171.139 268.529,166.358z"/>
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
