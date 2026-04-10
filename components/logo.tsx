'use client';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'mark' | 'horizontal' | 'stacked';
  theme?: 'dark' | 'light' | 'brand';
  className?: string;
  showTagline?: boolean;
}

// textPx = the font-size in px for the wordmark, used to match mark height
const SIZES = {
  xs:  { h: 22, sw: 1.6, r: 1.6, ep: 1,   text: 'text-sm',    textPx: 14, gap: 'gap-2' },
  sm:  { h: 28, sw: 1.8, r: 1.8, ep: 1.2,  text: 'text-base',  textPx: 16, gap: 'gap-2.5' },
  md:  { h: 36, sw: 2.2, r: 2.4, ep: 1.4,  text: 'text-lg',    textPx: 18, gap: 'gap-2.5' },
  lg:  { h: 60, sw: 2.8, r: 3.2, ep: 1.8,  text: 'text-2xl',   textPx: 24, gap: 'gap-3' },
  xl:  { h: 120, sw: 3,  r: 4,   ep: 2,    text: 'text-4xl',   textPx: 36, gap: 'gap-4' },
};

/**
 * Canonical Y-incision mark using the exact filled paths from the app icon
 * (public/file.svg). Scales via viewBox — identical proportions at every size.
 */
function IncisionMark({
  height, strokeColor, matchHeight,
}: {
  height: number; strokeWidth?: number; dotRadius?: number; endpointRadius?: number; strokeColor: string; matchHeight?: number;
}) {
  // The icon paths live in a 512x512 viewBox but the mark itself spans
  // roughly x:135..375, y:80..435. Crop to that bounding box.
  const vx = 120; const vy = 70; const vw = 270; const vh = 375;
  const displayH = matchHeight ?? height;
  const displayW = (vw / vh) * displayH;

  return (
    <svg width={displayW} height={displayH} viewBox={`${vx} ${vy} ${vw} ${vh}`} fill="none">
      <path fill={strokeColor} d="M271.233,218.224 C271.264,284.173 271.323,350.121 271.293,416.07 C271.289,425.227 265.389,431.29 257.017,431.3 C248.47,431.309 242.7,425.148 242.695,415.605 C242.665,350.155 242.697,284.706 243.137,218.863 C252.83,223.202 262.049,222.684 271.233,218.224z"/>
      <path fill={strokeColor} d="M228.125,189.213 C197.602,165.427 170.038,138.858 149.443,105.712 C145.955,100.099 145.474,94.404 149.217,88.852 C152.61,83.819 157.789,81.471 163.53,83.13 C167.066,84.151 171.15,86.534 173.028,89.533 C191.956,119.77 217.254,143.912 244.919,166.36 C235.464,171.356 230.404,179.239 228.125,189.213z"/>
      <path fill={strokeColor} d="M268.529,166.358 C296.365,144.336 321.842,120.12 340.711,89.634 C345.241,82.317 353.859,80.54 360.721,84.907 C367.5,89.22 369.371,97.697 364.9,105.085 C350.366,129.095 331.677,149.602 310.912,168.278 C302.995,175.4 294.638,182.032 285.961,188.736 C283.701,178.21 277.62,171.139 268.529,166.358z"/>
      <path fill="#C4463A" d="M268.163,166.272 C277.62,171.139 283.701,178.21 285.652,188.902 C286.443,201.394 282.047,211.109 271.464,218.052 C262.049,222.684 252.83,223.202 243.169,218.347 C232.609,211.588 227.576,202.297 228.161,189.645 C230.404,179.239 235.464,171.356 245.221,166.573 C252.901,163.762 260.337,163.342 268.163,166.272z"/>
    </svg>
  );
}

export function Logo({
  size = 'md', variant = 'horizontal', theme = 'dark', className = '', showTagline = false,
}: LogoProps) {
  const s = SIZES[size];
  const strokeColor = theme === 'dark' ? '#00C9A7' : '#0d1117';
  const textColor = theme === 'dark' ? 'text-[#F0F6FC]' : 'text-[#0d1117]';

  // For horizontal lockup, mark is ~1.6x the text height (like PrizePicks ratio)
  const matchHeight = variant === 'horizontal' ? Math.round(s.textPx * 1.6) : undefined;

  const mark = (
    <IncisionMark
      height={s.h} strokeWidth={s.sw} dotRadius={s.r}
      endpointRadius={s.ep} strokeColor={strokeColor}
      matchHeight={matchHeight}
    />
  );

  if (variant === 'mark') return <div className={className}>{mark}</div>;

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <IncisionMark
          height={s.h} strokeWidth={s.sw} dotRadius={s.r}
          endpointRadius={s.ep} strokeColor={strokeColor}
        />
        <div className={`${s.text} tracking-wider mt-2 ${textColor}`}>
          <span className="font-black">BET</span>
          <span className="font-light">AUTOPSY</span>
        </div>
        {showTagline && (
          <div className="text-[#8B949E] text-[6.5px] tracking-[3px] font-medium uppercase mt-1">
            Dissect your decisions
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {mark}
      <div>
        <div className={`${s.text} tracking-wider ${textColor} leading-none`}>
          <span className="font-black">BET</span>
          <span className="font-light">AUTOPSY</span>
        </div>
        {showTagline && (
          <div className="text-[#8B949E] text-[7.5px] tracking-[3.5px] font-medium uppercase">
            Dissect your decisions
          </div>
        )}
      </div>
    </div>
  );
}
