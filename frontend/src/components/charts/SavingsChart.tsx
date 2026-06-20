'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SavingsRow } from '@/lib/api';
import { format } from 'date-fns';

interface Props {
  data: SavingsRow[];
  height?: number;
}

export function SavingsChart({ data, height = 280 }: Props) {
  const chartData = data.slice(-30).map((r) => ({
    day:       format(new Date(r.day), 'MM/dd'),
    baseline:  +r.baseline_cost.toFixed(2),
    optimized: +r.optimized_cost.toFixed(2),
    savings:   +r.savings.toFixed(2),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          unit=" $"
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
        <Bar dataKey="baseline"  name="Baseline Cost"   fill="#ef4444" opacity={0.7} radius={[2,2,0,0]} />
        <Bar dataKey="optimized" name="Optimised Cost"  fill="#3b82f6" opacity={0.8} radius={[2,2,0,0]} />
        <Bar dataKey="savings"   name="Savings"         fill="#10b981" opacity={0.9} radius={[2,2,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
