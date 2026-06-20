/**
 * EnergyFlow AI – API client
 * All backend calls go through this module.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json();
}

// ── Health ──────────────────────────────────────────────────────────────────
export const fetchHealth = () =>
  apiFetch<{ status: string; database: string; environment: string }>('/health');

// ── Data generation ──────────────────────────────────────────────────────────
export const generateData = (days = 90, seed = 42) =>
  apiFetch('/generate-data', {
    method: 'POST',
    body: JSON.stringify({ days, seed }),
  });

// ── Energy data ──────────────────────────────────────────────────────────────
export const fetchEnergyData = (limit = 168, offset = 0) =>
  apiFetch<{ count: number; data: EnergyReading[] }>(
    `/energy-data?limit=${limit}&offset=${offset}`,
  );

// ── Analytics ────────────────────────────────────────────────────────────────
export const fetchSummary = (days = 30) =>
  apiFetch<SummaryKPIs>(`/analytics/summary?days=${days}`);

export const fetchHourlyProfile = (days = 30) =>
  apiFetch<HourlyProfileRow[]>(`/analytics/hourly-profile?days=${days}`);

export const fetchDailyTotals = (days = 30) =>
  apiFetch<DailyTotalRow[]>(`/analytics/daily-totals?days=${days}`);

export const fetchActionDistribution = (days = 30) =>
  apiFetch<ActionRow[]>(`/analytics/action-distribution?days=${days}`);

export const fetchSavingsReport = (days = 30) =>
  apiFetch<SavingsRow[]>(`/analytics/savings-report?days=${days}`);

// ── Forecasts ────────────────────────────────────────────────────────────────
export const fetchDemandForecast = (hours = 24) =>
  apiFetch<ForecastResult>(`/forecast/demand?hours=${hours}`);

export const fetchSolarForecast = (hours = 24) =>
  apiFetch<ForecastResult>(`/forecast/solar?hours=${hours}`);

export const fetchPriceForecast = (hours = 24) =>
  apiFetch<ForecastResult>(`/forecast/price?hours=${hours}`);

// ── Optimisation ─────────────────────────────────────────────────────────────
export const fetchBatteryOptimisation = (hours = 24, initialSoc = 50) =>
  apiFetch<OptimisationResult>(
    `/optimize/battery?hours=${hours}&initial_soc=${initialSoc}`,
  );

// ── Copilot ──────────────────────────────────────────────────────────────────
export const askCopilot = (question: string) =>
  apiFetch<CopilotResponse>('/copilot/ask', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

// ── Types ────────────────────────────────────────────────────────────────────
export interface EnergyReading {
  id: number;
  timestamp: string;
  demand_kwh: number;
  solar_generation_kwh: number;
  ercot_price_mwh: number;
  temperature: number;
  cloud_cover: number;
  battery_soc: number;
  grid_import_kwh: number;
  baseline_cost: number;
  optimized_cost: number;
  savings: number;
  action: string;
}

export interface SummaryKPIs {
  total_readings: number;
  avg_demand_kwh: number;
  total_demand_kwh: number;
  total_solar_kwh: number;
  solar_penetration_pct: number;
  avg_price_mwh: number;
  peak_price_mwh: number;
  total_baseline_cost: number;
  total_optimized_cost: number;
  total_savings: number;
  savings_pct: number;
}

export interface HourlyProfileRow {
  hour_of_day: number;
  avg_demand_kwh: number;
  avg_solar_kwh: number;
  avg_price_mwh: number;
}

export interface DailyTotalRow {
  day: string;
  total_demand_kwh: number;
  total_solar_kwh: number;
  total_savings: number;
  avg_price_mwh: number;
}

export interface ActionRow {
  action: string;
  count: number;
  pct: number;
}

export interface SavingsRow {
  day: string;
  baseline_cost: number;
  optimized_cost: number;
  savings: number;
  savings_pct: number;
}

export interface ForecastPoint {
  timestamp: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResult {
  forecast_type: string;
  model: string;
  mae: number;
  rmse: number;
  n_hours: number;
  predictions: ForecastPoint[];
}

export interface OptScheduleRow {
  hour: number;
  timestamp?: string;
  charge_kw: number;
  discharge_kw: number;
  battery_soc_pct: number;
  grid_import_kwh: number;
  cost_no_battery: number;
  cost_with_battery: number;
  savings: number;
  action: string;
  price_mwh: number;
  demand_kwh: number;
  solar_kwh: number;
}

export interface OptimisationResult {
  solver: string;
  status: string;
  total_cost_baseline: number;
  total_cost_optimized: number;
  total_savings: number;
  savings_pct: number;
  schedule: OptScheduleRow[];
}

export interface CopilotResponse {
  question: string;
  answer: string;
  source: string;
  context_snapshot: Record<string, unknown>;
}
