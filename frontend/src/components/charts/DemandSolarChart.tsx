'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { EnergyReading } from '@/lib/api';
import { fmtTs } from '@/lib/utils';

interface Props {
  data: EnergyReading[];
  height?: number;
}

export function DemandSolarChart({ data, height = 280 }: Props) {
  const chartData = data.slice(-168).map((r) => ({
    ts:     fmtTs(r.timestamp),
    demand: +r.demand_kwh.toFixed(1),
    solar:  +r.solar_generation_kwh.toFixed(1),
    price:  +r.ercot_price_mwh.toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradDemand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSolar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="ts"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          interval={23}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          unit=" kWh"
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
        <Area
          type="monotone"
          dataKey="demand"
          name="Demand (kWh)"
          stroke="#3b82f6"
          fill="url(#gradDemand)"
          strokeWidth={1.5}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="solar"
          name="Solar (kWh)"
          stroke="#f59e0b"
          fill="url(#gradSolar)"
          strokeWidth={1.5}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
