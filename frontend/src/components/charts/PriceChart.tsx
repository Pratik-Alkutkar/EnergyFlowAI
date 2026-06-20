'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { EnergyReading } from '@/lib/api';
import { fmtTs } from '@/lib/utils';

interface Props {
  data: EnergyReading[];
  height?: number;
}

export function PriceChart({ data, height = 240 }: Props) {
  const chartData = data.slice(-48).map((r) => ({
    ts:     fmtTs(r.timestamp),
    price:  +r.ercot_price_mwh.toFixed(2),
    action: r.action,
  }));

  const avg =
    chartData.reduce((s, d) => s + d.price, 0) / (chartData.length || 1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="ts"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          interval={7}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          unit=" $/MWh"
          width={65}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(v: number) => [`$${v.toFixed(2)}/MWh`, 'ERCOT Price']}
        />
        <ReferenceLine
          y={avg}
          stroke="#6b7280"
          strokeDasharray="4 2"
          label={{ value: `avg $${avg.toFixed(0)}`, fill: '#6b7280', fontSize: 10, position: 'insideTopRight' }}
        />
        <ReferenceLine y={80} stroke="#ef444460" strokeDasharray="4 2" />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#f97316"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, fill: '#f97316' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
