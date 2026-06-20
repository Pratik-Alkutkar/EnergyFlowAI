'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Zap, Sun, DollarSign, Battery, TrendingDown, RefreshCw, Database
} from 'lucide-react';
import {
  fetchSummary, fetchEnergyData, generateData,
  type SummaryKPIs, type EnergyReading,
} from '@/lib/api';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner, ErrorMessage } from '@/components/ui/LoadingSpinner';
import { DemandSolarChart } from '@/components/charts/DemandSolarChart';
import { PriceChart } from '@/components/charts/PriceChart';
import { BatteryGauge } from '@/components/charts/BatteryGauge';
import { fmt, fmtCurrency, fmtPct, ACTION_BG } from '@/lib/utils';

export default function DashboardPage() {
  const [kpis,     setKpis]     = useState<SummaryKPIs | null>(null);
  const [readings, setReadings] = useState<EnergyReading[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [seeding,  setSeeding]  = useState(false);
  const [seedMsg,  setSeedMsg]  = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [kpisData, readingsData] = await Promise.all([
        fetchSummary(30),
        fetchEnergyData(168),
      ]);
      setKpis(kpisData);
      setReadings(readingsData.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg('Generating 90 days of data…');
    try {
      const res = await generateData(90) as { rows_written: number };
      setSeedMsg(`✓ ${res.rows_written?.toLocaleString()} rows loaded`);
      await load();
    } catch (e: unknown) {
      setSeedMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSeeding(false);
    }
  };

  const latest = readings[0];

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time energy overview · Last 30 days"
      >
        <button onClick={handleSeed} disabled={seeding} className="btn-secondary flex items-center gap-2">
          <Database className="w-4 h-4" />
          {seeding ? 'Generating…' : 'Seed Data'}
        </button>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </PageHeader>

      {seedMsg && (
        <div className="mb-4 text-sm text-green-400 bg-green-400/10 border border-green-400/20 px-4 py-2 rounded-lg">
          {seedMsg}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div>
          <ErrorMessage message={error} />
          <div className="text-center mt-4">
            <p className="text-gray-500 text-sm mb-3">No data yet? Click <strong>Seed Data</strong> to generate 90 days of synthetic readings.</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Avg Demand"
              value={`${fmt(kpis?.avg_demand_kwh)} kWh`}
              sub="per hour"
              icon={Zap}
              iconColor="text-blue-400"
            />
            <KpiCard
              label="Total Solar"
              value={`${fmt(kpis?.total_solar_kwh, 0)} kWh`}
              sub={`${fmtPct(kpis?.solar_penetration_pct)} penetration`}
              icon={Sun}
              iconColor="text-yellow-400"
            />
            <KpiCard
              label="Avg ERCOT Price"
              value={`$${fmt(kpis?.avg_price_mwh, 2)}/MWh`}
              sub={`Peak $${fmt(kpis?.peak_price_mwh, 2)}`}
              icon={DollarSign}
              iconColor="text-orange-400"
            />
            <KpiCard
              label="Total Savings"
              value={fmtCurrency(kpis?.total_savings)}
              sub={`${fmtPct(kpis?.savings_pct)} vs baseline`}
              icon={TrendingDown}
              iconColor="text-green-400"
              trend="down"
              trendLabel="Battery optimisation savings"
            />
          </div>

          {/* Live snapshot + Battery */}
          {latest && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <div className="lg:col-span-3 card">
                <p className="section-title">Latest Reading</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {[
                    { label: 'Demand',         val: `${fmt(latest.demand_kwh)} kWh` },
                    { label: 'Solar',           val: `${fmt(latest.solar_generation_kwh)} kWh` },
                    { label: 'ERCOT Price',     val: `$${fmt(latest.ercot_price_mwh, 2)}/MWh` },
                    { label: 'Grid Import',     val: `${fmt(latest.grid_import_kwh)} kWh` },
                    { label: 'Baseline Cost',   val: fmtCurrency(latest.baseline_cost) },
                    { label: 'Optimised Cost',  val: fmtCurrency(latest.optimized_cost) },
                    { label: 'Hour Savings',    val: fmtCurrency(latest.savings) },
                    { label: 'Temperature',     val: `${fmt(latest.temperature, 1)}°F` },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="label mb-1">{label}</p>
                      <p className="text-white font-medium">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card flex flex-col items-center justify-center">
                <p className="section-title text-center mb-4">Battery SOC</p>
                <BatteryGauge soc={latest.battery_soc} action={latest.action} size="md" />
                <span className={`badge mt-3 ${ACTION_BG[latest.action] ?? 'bg-gray-700 text-gray-300'}`}>
                  {latest.action}
                </span>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card">
              <p className="section-title">Demand vs Solar (last 7 days)</p>
              <DemandSolarChart data={readings} />
            </div>
            <div className="card">
              <p className="section-title">ERCOT Price (last 48 hrs)</p>
              <PriceChart data={readings} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
