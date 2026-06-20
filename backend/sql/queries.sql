-- EnergyFlow AI - Analytics SQL Queries
-- These are used by analytics.py via asyncpg / SQLAlchemy

-- ============================================================
-- Q1: Summary KPIs for dashboard cards
-- ============================================================
-- :start_ts and :end_ts are bind parameters
SELECT
    COUNT(*)                                          AS total_readings,
    ROUND(AVG(demand_kwh)::NUMERIC, 3)                AS avg_demand_kwh,
    ROUND(SUM(demand_kwh)::NUMERIC, 3)                AS total_demand_kwh,
    ROUND(SUM(solar_generation_kwh)::NUMERIC, 3)      AS total_solar_kwh,
    ROUND(
        100.0 * SUM(solar_generation_kwh) / NULLIF(SUM(demand_kwh), 0),
        2
    )                                                  AS solar_penetration_pct,
    ROUND(AVG(ercot_price_mwh)::NUMERIC, 4)           AS avg_price_mwh,
    ROUND(MAX(ercot_price_mwh)::NUMERIC, 4)           AS peak_price_mwh,
    ROUND(SUM(baseline_cost)::NUMERIC, 4)             AS total_baseline_cost,
    ROUND(SUM(optimized_cost)::NUMERIC, 4)            AS total_optimized_cost,
    ROUND(SUM(savings)::NUMERIC, 4)                   AS total_savings,
    ROUND(
        100.0 * SUM(savings) / NULLIF(SUM(baseline_cost), 0),
        2
    )                                                  AS savings_pct
FROM energy_readings
WHERE timestamp BETWEEN :start_ts AND :end_ts;

-- ============================================================
-- Q2: Hourly demand profile (avg by hour-of-day)
-- ============================================================
SELECT
    EXTRACT(HOUR FROM timestamp)::INT   AS hour_of_day,
    ROUND(AVG(demand_kwh)::NUMERIC, 3)  AS avg_demand_kwh,
    ROUND(AVG(solar_generation_kwh)::NUMERIC, 3) AS avg_solar_kwh,
    ROUND(AVG(ercot_price_mwh)::NUMERIC, 4) AS avg_price_mwh
FROM energy_readings
WHERE timestamp BETWEEN :start_ts AND :end_ts
GROUP BY EXTRACT(HOUR FROM timestamp)
ORDER BY hour_of_day;

-- ============================================================
-- Q3: Daily totals (for trend charts)
-- ============================================================
SELECT
    DATE_TRUNC('day', timestamp)::DATE            AS day,
    ROUND(SUM(demand_kwh)::NUMERIC, 3)            AS total_demand_kwh,
    ROUND(SUM(solar_generation_kwh)::NUMERIC, 3)  AS total_solar_kwh,
    ROUND(SUM(savings)::NUMERIC, 4)               AS total_savings,
    ROUND(AVG(ercot_price_mwh)::NUMERIC, 4)       AS avg_price_mwh
FROM energy_readings
WHERE timestamp BETWEEN :start_ts AND :end_ts
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY day;

-- ============================================================
-- Q4: Battery action distribution
-- ============================================================
SELECT
    action,
    COUNT(*)                                         AS count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM energy_readings
WHERE timestamp BETWEEN :start_ts AND :end_ts
  AND action IS NOT NULL
GROUP BY action
ORDER BY count DESC;

-- ============================================================
-- Q5: Price vs demand correlation by hour
-- ============================================================
SELECT
    EXTRACT(HOUR FROM timestamp)::INT AS hour_of_day,
    ROUND(AVG(ercot_price_mwh)::NUMERIC, 4)  AS avg_price,
    ROUND(AVG(demand_kwh)::NUMERIC, 3)        AS avg_demand,
    ROUND(AVG(battery_soc)::NUMERIC, 2)       AS avg_soc
FROM energy_readings
WHERE timestamp BETWEEN :start_ts AND :end_ts
GROUP BY EXTRACT(HOUR FROM timestamp)
ORDER BY hour_of_day;

-- ============================================================
-- Q6: Top 10 most expensive hours
-- ============================================================
SELECT
    timestamp,
    demand_kwh,
    ercot_price_mwh,
    baseline_cost,
    optimized_cost,
    savings,
    action
FROM energy_readings
WHERE timestamp BETWEEN :start_ts AND :end_ts
ORDER BY ercot_price_mwh DESC
LIMIT 10;

-- ============================================================
-- Q7: Solar self-sufficiency by day
-- ============================================================
SELECT
    DATE_TRUNC('day', timestamp)::DATE AS day,
    ROUND(SUM(solar_generation_kwh)::NUMERIC, 3)  AS solar_kwh,
    ROUND(SUM(demand_kwh)::NUMERIC, 3)            AS demand_kwh,
    ROUND(
        100.0 * LEAST(SUM(solar_generation_kwh), SUM(demand_kwh))
              / NULLIF(SUM(demand_kwh), 0),
        2
    )                                              AS self_sufficiency_pct
FROM energy_readings
WHERE timestamp BETWEEN :start_ts AND :end_ts
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY day;
