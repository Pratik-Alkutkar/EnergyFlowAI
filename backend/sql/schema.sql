-- EnergyFlow AI - Database Schema
-- Target: Neon Postgres

-- Enable TimescaleDB extension if available (optional, Neon supports it)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================
-- ENERGY READINGS (raw + enriched time-series data)
-- ============================================================
CREATE TABLE IF NOT EXISTS energy_readings (
    id               BIGSERIAL PRIMARY KEY,
    timestamp        TIMESTAMPTZ NOT NULL,
    demand_kwh       NUMERIC(10,3) NOT NULL,
    solar_generation_kwh NUMERIC(10,3) NOT NULL DEFAULT 0,
    ercot_price_mwh  NUMERIC(10,4) NOT NULL,
    temperature      NUMERIC(6,2),
    cloud_cover      NUMERIC(5,2),       -- 0–100 %
    battery_soc      NUMERIC(5,2),       -- 0–100 %
    grid_import_kwh  NUMERIC(10,3),
    baseline_cost    NUMERIC(10,4),
    optimized_cost   NUMERIC(10,4),
    savings          NUMERIC(10,4),
    action           VARCHAR(20),        -- charge | discharge | idle
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_energy_readings_timestamp
    ON energy_readings (timestamp);

CREATE INDEX IF NOT EXISTS idx_energy_readings_timestamp_brin
    ON energy_readings USING BRIN (timestamp);

-- ============================================================
-- FORECAST RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS forecast_results (
    id               BIGSERIAL PRIMARY KEY,
    forecast_type    VARCHAR(30) NOT NULL,  -- demand | solar | price
    target_timestamp TIMESTAMPTZ NOT NULL,
    predicted_value  NUMERIC(10,4) NOT NULL,
    lower_bound      NUMERIC(10,4),
    upper_bound      NUMERIC(10,4),
    model_name       VARCHAR(50),
    mae              NUMERIC(10,4),
    rmse             NUMERIC(10,4),
    generated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_type_ts
    ON forecast_results (forecast_type, target_timestamp);

-- ============================================================
-- OPTIMIZATION RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS optimization_results (
    id               BIGSERIAL PRIMARY KEY,
    timestamp        TIMESTAMPTZ NOT NULL,
    battery_soc_pct  NUMERIC(5,2),
    charge_kw        NUMERIC(10,3),
    discharge_kw     NUMERIC(10,3),
    grid_import_kwh  NUMERIC(10,3),
    cost_no_battery  NUMERIC(10,4),
    cost_with_battery NUMERIC(10,4),
    savings          NUMERIC(10,4),
    action           VARCHAR(20),
    run_id           UUID DEFAULT gen_random_uuid(),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opt_results_timestamp
    ON optimization_results (timestamp);

CREATE INDEX IF NOT EXISTS idx_opt_results_run_id
    ON optimization_results (run_id);

-- ============================================================
-- ANALYTICS MATERIALIZED VIEW  (refreshed by ETL)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_summary AS
SELECT
    DATE_TRUNC('day', timestamp)          AS day,
    COUNT(*)                              AS reading_count,
    ROUND(AVG(demand_kwh)::NUMERIC, 3)    AS avg_demand_kwh,
    ROUND(SUM(demand_kwh)::NUMERIC, 3)    AS total_demand_kwh,
    ROUND(SUM(solar_generation_kwh)::NUMERIC, 3) AS total_solar_kwh,
    ROUND(AVG(ercot_price_mwh)::NUMERIC, 4) AS avg_price_mwh,
    ROUND(MAX(ercot_price_mwh)::NUMERIC, 4) AS peak_price_mwh,
    ROUND(MIN(ercot_price_mwh)::NUMERIC, 4) AS off_peak_price_mwh,
    ROUND(SUM(baseline_cost)::NUMERIC, 4) AS total_baseline_cost,
    ROUND(SUM(optimized_cost)::NUMERIC, 4) AS total_optimized_cost,
    ROUND(SUM(savings)::NUMERIC, 4)       AS total_savings,
    ROUND(AVG(temperature)::NUMERIC, 2)   AS avg_temperature,
    ROUND(AVG(battery_soc)::NUMERIC, 2)   AS avg_battery_soc
FROM energy_readings
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY day;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_summary_day
    ON daily_summary (day);
