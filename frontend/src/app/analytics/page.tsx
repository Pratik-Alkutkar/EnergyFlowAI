'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  fetchSummary, fetchHourlyProfile, fetchDailyTotals,
  fetchActionDistribution, fetchSavingsReport,
  type SummaryKPIs, type HourlyProfileRow,
  type DailyTotalRow, type ActionRow, type SavingsRow,
} from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { LoadingSpinner, ErrorMessage } from '@/components/ui/LoadingSpinner';
import { SavingsChart } from '@/components/charts/SavingsChart';
import { BarChart3, TrendingDown, Zap, DollarSign, Sun } from 'lucide-react';
import { fmt, fmtCurrency, fmtPct } from '@/lib/utils';
import { format } from 'date-fns';

const ACTION_COLORS: Record<string, string> = {
  charge:    '#8b5cf6',
  discharge: '#ef4444',
  idle:      '#6b7280',
};

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

export default function AnalyticsPage() {
  const [days,    setDays]    = useState(30);
  const [kpis,    setKpis]    = useState<SummaryKPIs | null>(null);
  const [hourly,  setHourly]  = useState<HourlyProfileRow[]>([]);
  const [daily,   setDaily]   = useState<DailyTotalRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [savings, setSavings] = useState<SavingsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [k, h, d, a, s] = await Promise.all([
        fetchSummary(days),
        fetchHourlyProfile(days),
        fetchDailyTotals(days),
        fetchActionDistribution(days),
        fetchSavingsReport(days),
      ]);
      setKpis(k); setHourly(h); setDaily(d); setActions(a); setSavings(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <PageHeader title="Analytics" subtitle="SQL-powered energy intelligence">
        <div className="flex gap-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                days === d
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </PageHeader>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KpiCard label="Total Demand"    value={`${fmt(kpis?.total_demand_kwh, 0)} kWh`}  icon={Zap}         iconColor="text-blue-400" />
            <KpiCard label="Total Solar"     value={`${fmt(kpis?.total_solar_kwh, 0)} kWh`}   icon={Sun}         iconColor="text-yellow-400" />
            <KpiCard label="Solar %"         value={fmtPct(kpis?.solar_penetration_pct)}       icon={BarChart3}   iconColor="text-orange-400" />
            <KpiCard label="Total Savings"   value={fmtCurrency(kpis?.total_savings)}          icon={TrendingDown} iconColor="text-green-400" />
            <KpiCard label="Avg Price"       value={`$${fmt(kpis?.avg_price_mwh, 2)}/MWh`}    icon={DollarSign}  iconColor="text-orange-400" />
          </div>

          {/* Hourly profile + Action pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <div className="lg:col-span-2 card">
              <p className="section-title">Average Hourly Profile</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={hourly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="hour_of_day" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit="h" />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit=" kWh" />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
                  <Bar dataKey="avg_demand_kwh" name="Avg Demand"  fill="#3b82f6" opacity={0.8} radius={[2,2,0,0]} />
                  <Bar dataKey="avg_solar_kwh"  name="Avg Solar"   fill="#f59e0b" opacity={0.8} radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card flex flex-col">
              <p className="section-title">Battery Actions</p>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={actions}
                      dataKey="count"
                      nameKey="action"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      label={({ action, pct }) => `${action} ${pct}%`}
                      labelLine={false}
                    >
                      {actions.map((entry) => (
                        <Cell key={entry.action} fill={ACTION_COLORS[entry.action] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {actions.map((a) => (
                  <div key={a.action} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: ACTION_COLORS[a.action] }} />
                      <span className="text-gray-300 capitalize">{a.action}</span>
                    </div>
                    <span className="text-gray-400">{a.count.toLocaleString()} hrs ({a.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily totals trend */}
          <div className="card mb-5">
            <p className="section-title">Daily Demand vs Solar Trend</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily.slice(-30).map(r => ({ ...r, day: format(new Date(r.day), 'MM/dd') }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit=" kWh" />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
                <Line type="monotone" dataKey="total_demand_kwh" name="Daily Demand"  stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="total_solar_kwh"  name="Daily Solar"   stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Savings chart */}
          <div className="card">
            <p className="section-title">Daily Cost Savings Report</p>
            <SavingsChart data={savings} />
          </div>
        </>
      )}
    </div>
  );
}
