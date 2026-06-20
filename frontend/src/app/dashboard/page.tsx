'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Zap, Sun, DollarSign, Battery, TrendingDown,
  Bell, Settings, RefreshCw, Leaf,
} from 'lucide-react';
import {
  fetchSummary, fetchEnergyData,
  type SummaryKPIs, type EnergyReading,
} from '@/lib/api';
import { fmt, fmtCurrency } from '@/lib/utils';

// ── Live Clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div className="text-right">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{date}</p>
      <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text-2)' }}>{time}</p>
    </div>
  );
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#sg-${color.replace('#','')})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KPIProps {
  label: string;
  value: string;
  trend?: string;
  up?: boolean;
  icon: React.ReactNode;
  color: string;
  sparkData?: number[];
}

function KpiCard({ label, value, trend, up, icon, color, sparkData }: KPIProps) {
  return (
    <div className="card-hover rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="label mb-1">{label}</p>
          <p className="value-md" style={{ color: 'var(--text-1)' }}>{value}</p>
          {trend && (
            <p className="text-xs mt-0.5 font-medium" style={{ color: up ? 'var(--accent)' : 'var(--red)' }}>
              {up ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      {sparkData && <Sparkline data={sparkData} color={color} />}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [kpis,     setKpis]     = useState<SummaryKPIs | null>(null);
  const [readings, setReadings] = useState<EnergyReading[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [k, r] = await Promise.all([fetchSummary(30), fetchEnergyData(168)]);
      setKpis(k); setReadings(r.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const latest  = readings[0];
  const chart   = [...readings].reverse().slice(-48).map(r => ({
    t:      new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    demand: +r.demand_kwh.toFixed(1),
    solar:  +r.solar_generation_kwh.toFixed(1),
    grid:   +r.grid_import_kwh.toFixed(1),
  }));

  const sparkDemand  = [...readings].reverse().slice(-24).map(r => r.demand_kwh);
  const sparkSolar   = [...readings].reverse().slice(-24).map(r => r.solar_generation_kwh);
  const sparkPrice   = [...readings].reverse().slice(-24).map(r => r.ercot_price_mwh);
  const sparkSavings = [...readings].reverse().slice(-24).map(r => r.savings);

  const solarPct  = latest && latest.demand_kwh > 0
    ? (latest.solar_generation_kwh / latest.demand_kwh * 100).toFixed(1)
    : '0.0';
  const gridPct   = (100 - parseFloat(solarPct)).toFixed(1);
  const carbonKg  = latest ? (latest.grid_import_kwh * 0.386).toFixed(1) : '0';

  // Optimization recommendation
  const price = latest?.ercot_price_mwh ?? 0;
  const soc   = latest?.battery_soc ?? 50;
  const recAction = price > 75 && soc > 30
    ? { text: 'Discharge battery', time: 'now – peak hours', color: 'var(--red)' }
    : price < 38 && soc < 80
    ? { text: 'Charge battery', time: 'now – off-peak window', color: 'var(--accent)' }
    : { text: 'Hold current state', time: 'prices are moderate', color: 'var(--yellow)' };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-0)' }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 px-6 py-4 flex items-center gap-4" style={{ background: 'var(--bg-0)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex-1">
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>
            {greeting()}, Pratik 👋
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Here&apos;s your energy overview for today.</p>
        </div>

        <div className="flex items-center gap-3">
          <LiveClock />
          <div className="badge-live">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
          <button onClick={load} className="p-2 rounded-lg transition-colors" style={{ background: 'var(--bg-2)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
          </button>
          <button className="p-2 rounded-lg" style={{ background: 'var(--bg-2)' }}>
            <Bell className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          <button className="p-2 rounded-lg" style={{ background: 'var(--bg-2)' }}>
            <Settings className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent)', color: '#000' }}>P</div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 p-6 space-y-5">

        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            {error} — Make sure the backend is running.
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard label="Total Demand"     value={`${fmt(latest?.demand_kwh, 0)} kW`}            trend="vs yesterday" up icon={<Zap className="w-4 h-4"/>}          color="#3b82f6" sparkData={sparkDemand} />
          <KpiCard label="Solar Generation" value={`${fmt(latest?.solar_generation_kwh, 0)} kW`}  trend="vs yesterday" up icon={<Sun className="w-4 h-4"/>}           color="#f59e0b" sparkData={sparkSolar} />
          <KpiCard label="Grid Price"       value={`$${fmt((latest?.ercot_price_mwh ?? 0)/1000, 4)}/kWh`} trend="vs yesterday" up={false} icon={<DollarSign className="w-4 h-4"/>} color="#f97316" sparkData={sparkPrice} />
          <KpiCard label="Battery SOC"      value={`${fmt(latest?.battery_soc, 0)}%`}              trend="vs yesterday" up icon={<Battery className="w-4 h-4"/>}        color="#8b5cf6" sparkData={readings.slice(0,24).map(r=>r.battery_soc)} />
          <KpiCard label="Est. Daily Cost"  value={fmtCurrency(kpis?.total_optimized_cost)}        trend="vs baseline"  up={false} icon={<DollarSign className="w-4 h-4"/>} color="#ef4444" sparkData={sparkSavings} />
          <KpiCard label="Est. Savings"     value={fmtCurrency(kpis?.total_savings)}               trend="optimised"    up icon={<TrendingDown className="w-4 h-4"/>}  color="#22c55e" sparkData={sparkSavings} />
        </div>

        {/* ── Energy Flow + Status ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Chart */}
          <div className="xl:col-span-2 card">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-1)' }}>Energy Flow</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Real-time energy flow across your microgrid</p>
              </div>
              <div className="flex gap-1 text-xs">
                {['Live','24H','7D'].map(l => (
                  <button key={l} className="px-2.5 py-1 rounded-md font-medium transition-colors" style={l==='24H'?{background:'var(--accent)',color:'#000'}:{background:'var(--bg-2)',color:'var(--text-muted)'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-green-800 border-t-green-400 rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gSolar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gGrid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,197,94,0.06)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={7} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} unit=" kW" />
                  <Tooltip contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border-hover)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text-muted)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }} />
                  <Area type="monotone" dataKey="demand" name="Demand"          stroke="#22c55e" fill="url(#gDemand)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="solar"  name="Solar Generation" stroke="#f59e0b" fill="url(#gSolar)"  strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="grid"   name="Grid Import"      stroke="#3b82f6" fill="url(#gGrid)"   strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Current Status */}
            <div className="card flex-1">
              <p className="section-label">Current Status</p>
              <div className="flex flex-col items-center py-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 glow-green" style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)' }}>
                  <Zap className="w-7 h-7" style={{ color: 'var(--accent)' }} />
                </div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Grid Import</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{fmt(latest?.grid_import_kwh, 0)} kW</p>
              </div>
              <div className="space-y-2.5 mt-2">
                {[
                  { icon: <Sun className="w-3.5 h-3.5"/>, label: 'Solar Contribution', value: `${solarPct}%`,  color: '#f59e0b' },
                  { icon: <Zap className="w-3.5 h-3.5"/>, label: 'Grid Dependency',    value: `${gridPct}%`,   color: '#3b82f6' },
                  { icon: <Leaf className="w-3.5 h-3.5"/>,label: 'Carbon Reduction',   value: `${carbonKg} kg`, color: '#22c55e' },
                ].map(({ icon, label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <span style={{ color }}>{icon}</span>
                      {label}
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--text-2)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization Recommendation */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="section-label mb-0">Optimization Recommendation</p>
                <span className="badge-optimal">Optimal</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: recAction.color }}>{recAction.text}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{recAction.time}</p>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Est. Savings</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{fmtCurrency(latest?.savings)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
