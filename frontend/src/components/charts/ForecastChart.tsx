'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ForecastResult } from '@/lib/api';
import { fmtTs } from '@/lib/utils';

interface Props {
  data: ForecastResult;
  color?: string;
  unit?: string;
  height?: number;
}

export function ForecastChart({
  data,
  color = '#3b82f6',
  unit = 'kWh',
  height = 300,
}: Props) {
  const chartData = data.predictions.map((p) => ({
    ts:    fmtTs(p.timestamp),
    value: +p.predicted_value.toFixed(3),
    lower: +p.lower_bound.toFixed(3),
    upper: +p.upper_bound.toFixed(3),
    band:  [+p.lower_bound.toFixed(3), +p.upper_bound.toFixed(3)],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="ts"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          interval={3}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          unit={` ${unit}`}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(v: number, name: string) => [
            `${v.toFixed(2)} ${unit}`,
            name === 'value' ? 'Forecast' : name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
        {/* Confidence band */}
        <Area
          type="monotone"
          dataKey="upper"
          fill={`url(#grad-${color.replace('#','')})`}
          stroke="none"
          legendType="none"
          tooltipType="none"
        />
        <Area
          type="monotone"
          dataKey="lower"
          fill="#111827"
          stroke="none"
          legendType="none"
          tooltipType="none"
        />
        {/* Forecast line */}
        <Line
          type="monotone"
          dataKey="value"
          name="Forecast"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
