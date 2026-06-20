'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchDemandForecast, fetchSolarForecast, fetchPriceForecast,
  type ForecastResult,
} from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner, ErrorMessage } from '@/components/ui/LoadingSpinner';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { Zap, Sun, DollarSign, RefreshCw } from 'lucide-react';
import { fmt } from '@/lib/utils';

const HOURS_OPTIONS = [24, 48, 72, 168];

interface ForecastState {
  demand: ForecastResult | null;
  solar:  ForecastResult | null;
  price:  ForecastResult | null;
}

export default function ForecastPage() {
  const [hours,   setHours]   = useState(24);
  const [data,    setData]    = useState<ForecastState>({ demand: null, solar: null, price: null });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [demand, solar, price] = await Promise.all([
        fetchDemandForecast(hours),
        fetchSolarForecast(hours),
        fetchPriceForecast(hours),
      ]);
      setData({ demand, solar, price });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => { load(); }, [load]);

  const ModelBadge = ({ result }: { result: ForecastResult | null }) =>
    result ? (
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="bg-gray-800 px-2 py-1 rounded font-mono">{result.model}</span>
        <span>MAE: <strong className="text-gray-300">{fmt(result.mae, 2)}</strong></span>
        <span>RMSE: <strong className="text-gray-300">{fmt(result.rmse, 2)}</strong></span>
      </div>
    ) : null;

  return (
    <div className="p-8">
      <PageHeader title="Forecast" subtitle="XGBoost models trained on live Postgres data">
        <div className="flex gap-1">
          {HOURS_OPTIONS.map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                hours === h
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </PageHeader>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
        <div className="space-y-5">
          {/* Demand */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <p className="section-title mb-0">Demand Forecast (kWh)</p>
              </div>
              <ModelBadge result={data.demand} />
            </div>
            {data.demand && <ForecastChart data={data.demand} color="#3b82f6" unit="kWh" height={280} />}
          </div>

          {/* Solar */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-yellow-400" />
                <p className="section-title mb-0">Solar Generation Forecast (kWh)</p>
              </div>
              <ModelBadge result={data.solar} />
            </div>
            {data.solar && <ForecastChart data={data.solar} color="#f59e0b" unit="kWh" height={280} />}
          </div>

          {/* Price */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-400" />
                <p className="section-title mb-0">ERCOT Price Forecast ($/MWh)</p>
              </div>
              <ModelBadge result={data.price} />
            </div>
            {data.price && <ForecastChart data={data.price} color="#f97316" unit="$/MWh" height={280} />}
          </div>

          {/* Info */}
          <div className="card bg-blue-500/5 border-blue-500/20">
            <p className="text-xs text-blue-300 font-medium mb-1">How forecasting works</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Models are trained on historical Postgres data with time-series features: hour-of-day,
              day-of-week, month, lag values (1h, 24h, 168h), rolling statistics (6h, 24h windows),
              and weather features. XGBoost is used when available; GradientBoosting otherwise.
              Confidence intervals are ±1.5× residual standard deviation from holdout predictions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
