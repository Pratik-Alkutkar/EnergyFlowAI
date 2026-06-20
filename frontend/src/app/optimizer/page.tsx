'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { fetchBatteryOptimisation, type OptimisationResult, type OptScheduleRow } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { LoadingSpinner, ErrorMessage } from '@/components/ui/LoadingSpinner';
import { Battery, TrendingDown, DollarSign, Zap, RefreshCw } from 'lucide-react';
import { fmtCurrency, fmtPct, fmt, ACTION_BG } from '@/lib/utils';
import { cn } from '@/lib/utils';

const HOURS_OPTIONS  = [12, 24, 48, 72];
const SOC_OPTIONS    = [20, 50, 80];

export default function OptimizerPage() {
  const [hours,      setHours]      = useState(24);
  const [initialSoc, setInitialSoc] = useState(50);
  const [result,     setResult]     = useState<OptimisationResult | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBatteryOptimisation(hours, initialSoc);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [hours, initialSoc]);

  useEffect(() => { load(); }, [load]);

  const chartData = result?.schedule.slice(0, hours).map((r) => ({
    h:          r.hour,
    price:      r.price_mwh,
    soc:        r.battery_soc_pct,
    charge:     r.charge_kw,
    discharge:  r.discharge_kw,
    baseline:   +r.cost_no_battery.toFixed(4),
    optimized:  +r.cost_with_battery.toFixed(4),
    savings:    +r.savings.toFixed(4),
  })) ?? [];

  return (
    <div className="p-8">
      <PageHeader title="Battery Optimizer" subtitle="Linear programming dispatch schedule">
        <div className="flex gap-1">
          {HOURS_OPTIONS.map((h) => (
            <button key={h} onClick={() => setHours(h)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${hours === h ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {h}h
            </button>
          ))}
        </div>
        <select
          value={initialSoc}
          onChange={(e) => setInitialSoc(+e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2"
        >
          {SOC_OPTIONS.map((s) => (
            <option key={s} value={s}>Initial SOC {s}%</option>
          ))}
        </select>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Run
        </button>
      </PageHeader>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : result && (
        <>
          {/* Solver badge */}
          <div className="mb-4 flex items-center gap-3">
            <span className="badge bg-purple-500/15 text-purple-300 px-3 py-1">
              Solver: {result.solver}
            </span>
            <span className={cn('badge px-3 py-1', result.status === 'Optimal' ? 'bg-green-500/15 text-green-300' : 'bg-yellow-500/15 text-yellow-300')}>
              {result.status}
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Baseline Cost"    value={fmtCurrency(result.total_cost_baseline)}  icon={DollarSign}   iconColor="text-red-400" />
            <KpiCard label="Optimised Cost"   value={fmtCurrency(result.total_cost_optimized)} icon={DollarSign}   iconColor="text-blue-400" />
            <KpiCard label="Total Savings"    value={fmtCurrency(result.total_savings)}         icon={TrendingDown} iconColor="text-green-400" trend="down" trendLabel="vs no battery" />
            <KpiCard label="Savings %"        value={fmtPct(result.savings_pct)}               icon={Battery}      iconColor="text-purple-400" />
          </div>

          {/* Battery SOC + Price timeline */}
          <div className="card mb-5">
            <p className="section-title">Battery SOC & ERCOT Price</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit="h" />
                <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit=" $/MWh" />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
                <Line yAxisId="left"  type="monotone" dataKey="soc"   name="SOC %"          stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="price" name="ERCOT $/MWh"    stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Charge/Discharge schedule */}
          <div className="card mb-5">
            <p className="section-title">Charge / Discharge Schedule</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit="h" />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit=" kW" />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
                <Bar dataKey="charge"    name="Charge kW"    fill="#8b5cf6" opacity={0.8} radius={[2,2,0,0]} />
                <Bar dataKey="discharge" name="Discharge kW" fill="#ef4444" opacity={0.8} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost comparison */}
          <div className="card mb-5">
            <p className="section-title">Hourly Cost: Baseline vs Optimised</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit="h" />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} unit=" $" />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} formatter={(v: number, n: string) => [`$${v.toFixed(4)}`, n]} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
                <Bar dataKey="baseline"  name="Baseline"  fill="#ef4444" opacity={0.7} radius={[2,2,0,0]} />
                <Bar dataKey="optimized" name="Optimised" fill="#3b82f6" opacity={0.8} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Schedule table */}
          <div className="card">
            <p className="section-title">Hourly Dispatch Table</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-gray-300">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Hr','Price $/MWh','Demand kWh','Solar kWh','Charge kW','Discharge kW','SOC %','Grid Import','Baseline $','Opt $','Savings $','Action']
                      .map(h => <th key={h} className="text-left py-2 px-2 label">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((r: OptScheduleRow) => (
                    <tr key={r.hour} className="border-b border-gray-900 hover:bg-gray-800/30">
                      <td className="py-1.5 px-2 font-mono">{r.hour}</td>
                      <td className="py-1.5 px-2 font-mono">{fmt(r.price_mwh, 2)}</td>
                      <td className="py-1.5 px-2 font-mono">{fmt(r.demand_kwh)}</td>
                      <td className="py-1.5 px-2 font-mono">{fmt(r.solar_kwh)}</td>
                      <td className="py-1.5 px-2 font-mono text-purple-400">{fmt(r.charge_kw)}</td>
                      <td className="py-1.5 px-2 font-mono text-red-400">{fmt(r.discharge_kw)}</td>
                      <td className="py-1.5 px-2 font-mono">{fmt(r.battery_soc_pct)}%</td>
                      <td className="py-1.5 px-2 font-mono">{fmt(r.grid_import_kwh)}</td>
                      <td className="py-1.5 px-2 font-mono text-red-400">${fmt(r.cost_no_battery, 4)}</td>
                      <td className="py-1.5 px-2 font-mono text-blue-400">${fmt(r.cost_with_battery, 4)}</td>
                      <td className="py-1.5 px-2 font-mono text-green-400">${fmt(r.savings, 4)}</td>
                      <td className="py-1.5 px-2">
                        <span className={`badge ${ACTION_BG[r.action] ?? 'bg-gray-700 text-gray-300'}`}>{r.action}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
