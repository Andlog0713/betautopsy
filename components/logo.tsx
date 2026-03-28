'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'mark' | 'horizontal' | 'stacked';
  theme?: 'dark' | 'light' | 'brand';
  className?: string;
  showTagline?: boolean;
}

const SIZES = {
  sm:  { h: 22, sw: 1.6, r: 1.6, ep: 1,   text: 'text-xs',   gap: 'gap-2' },
  md:  { h: 36, sw: 2.2, r: 2.4, ep: 1.4,  text: 'text-sm',   gap: 'gap-2.5' },
  lg:  { h: 60, sw: 2.8, r: 3.2, ep: 1.8,  text: 'text-xl',   gap: 'gap-3' },
  xl:  { h: 120, sw: 3,  r: 4,   ep: 2,    text: 'text-3xl',  gap: 'gap-4' },
};

function IncisionMark({
  height, strokeWidth, dotRadius, endpointRadius, strokeColor,
}: {
  height: number; strokeWidth: number; dotRadius: number; endpointRadius: number; strokeColor: string;
}) {
  const w = height * 0.6;
  const armEnd = height * 0.25;
  const padX = dotRadius + 2;
  const padY = dotRadius + 2;
  const cx = w / 2 + padX;
  const cy = armEnd + padY;
  const viewW = w + padX * 2;
  const viewH = height + padY * 2;

  return (
    <svg width={viewW} height={viewH} viewBox={`0 0 ${viewW} ${viewH}`} fill="none">
      <path
        d={`M${padX},${padY} Q${padX + w * 0.15},${padY + armEnd * 0.5} ${cx},${cy}`}
        stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
      />
      <path
        d={`M${viewW - padX},${padY} Q${viewW - padX - w * 0.15},${padY + armEnd * 0.5} ${cx},${cy}`}
        stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
      />
      <line
        x1={cx} y1={cy} x2={cx} y2={viewH - padY}
        stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={dotRadius} fill="#E8453C" />
      <circle cx={padX} cy={padY} r={endpointRadius} fill={strokeColor} opacity="0.45" />
      <circle cx={viewW - padX} cy={padY} r={endpointRadius} fill={strokeColor} opacity="0.45" />
      <circle cx={cx} cy={viewH - padY} r={endpointRadius} fill={strokeColor} opacity="0.45" />
    </svg>
  );
}

export function Logo({
  size = 'md', variant = 'horizontal', theme = 'dark', className = '', showTagline = false,
}: LogoProps) {
  const s = SIZES[size];
  const strokeColor = theme === 'dark' ? '#00C9A7' : '#0d1117';
  const textColor = theme === 'dark' ? 'text-[#F0F6FC]' : 'text-[#0d1117]';

  const mark = (
    <IncisionMark
      height={s.h} strokeWidth={s.sw} dotRadius={s.r}
      endpointRadius={s.ep} strokeColor={strokeColor}
    />
  );

  if (variant === 'mark') return <div className={className}>{mark}</div>;

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        {mark}
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
        <div className={`${s.text} tracking-wider ${textColor}`}>
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
