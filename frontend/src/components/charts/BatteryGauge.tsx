'use client';

import { cn } from '@/lib/utils';

interface Props {
  soc: number;        // 0–100
  action?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm:  { outer: 80,  strokeW: 8,  fontSize: 'text-lg' },
  md:  { outer: 120, strokeW: 10, fontSize: 'text-2xl' },
  lg:  { outer: 160, strokeW: 12, fontSize: 'text-3xl' },
};

export function BatteryGauge({ soc, action = 'idle', size = 'md' }: Props) {
  const { outer, strokeW, fontSize } = SIZE[size];
  const r = (outer - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (soc / 100) * circumference;

  const color =
    soc > 70 ? '#10b981' :
    soc > 30 ? '#f59e0b' :
               '#ef4444';

  const actionColors: Record<string, string> = {
    charge:    'text-purple-400',
    discharge: 'text-red-400',
    idle:      'text-gray-400',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={outer} height={outer} className="rotate-[-90deg]">
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={r}
          fill="none"
          stroke="#1f2937"
          strokeWidth={strokeW}
        />
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center -mt-2" style={{ marginTop: -(outer / 2 + 8) }}>
        {/* Overlay in center */}
      </div>
      <div className="flex flex-col items-center" style={{ marginTop: -(outer * 0.6) }}>
        <span className={cn('font-bold text-white', fontSize)}>{soc.toFixed(0)}%</span>
        <span className={cn('text-xs font-medium uppercase tracking-wide mt-0.5', actionColors[action] ?? 'text-gray-400')}>
          {action}
        </span>
      </div>
      <div style={{ marginTop: outer * 0.15 }} />
    </div>
  );
}
