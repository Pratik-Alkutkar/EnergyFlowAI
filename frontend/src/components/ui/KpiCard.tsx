import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = 'text-green-400',
  trend,
  trendLabel,
  className,
}: KpiCardProps) {
  return (
    <div className={cn('kpi-card', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="label mb-1">{label}</p>
          <p className="text-2xl font-bold text-white tabular-nums leading-tight">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          {trendLabel && (
            <p
              className={cn(
                'text-xs mt-1 font-medium',
                trend === 'up'      && 'text-green-400',
                trend === 'down'    && 'text-red-400',
                trend === 'neutral' && 'text-gray-500',
              )}
            >
              {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2 rounded-lg bg-gray-800 shrink-0', iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
