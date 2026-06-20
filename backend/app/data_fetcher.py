"""
EnergyFlow AI – Real Data Fetcher
===================================
Data sources:
  1. Open-Meteo Archive API  (free, no key)
     → temperature (°F), cloud cover (%), shortwave radiation (W/m²)
     → solar generation derived from real radiation
  2. EIA API  (free key at eia.gov/opendata)
     → ERCOT hourly grid demand (MWh)  →  scaled to site level
     → ERCOT prices modelled from real demand via merit-order curve

Demand note: site-level kWh demand cannot be retrieved from any public API
(it requires a real smart meter). We scale real ERCOT grid demand to our
site's capacity — preserving the real shape of demand while sizing it correctly.
This is standard practice in energy analytics.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx
import numpy as np
import pandas as pd

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"
EIA_DEMAND_URL = "https://api.eia.gov/v2/electricity/rto/region-data/data/"

# Site parameters
SYSTEM_KW        = 250.0   # solar array size
PERFORMANCE_RATIO = 0.80   # panel efficiency × inverter × wiring losses
SITE_PEAK_KW     = 300.0   # target site peak demand
SITE_AVG_KW      = 200.0   # target site average demand


# ── Open-Meteo ────────────────────────────────────────────────────────────────

async def _fetch_open_meteo(start_date: str, end_date: str) -> pd.DataFrame:
    """
    Fetch real historical weather for Austin TX.
    Returns UTC-indexed DataFrame with temperature, cloud_cover, shortwave_radiation.
    """
    params = {
        "latitude":         settings.site_latitude,
        "longitude":        settings.site_longitude,
        "start_date":       start_date,
        "end_date":         end_date,
        "hourly":           "temperature_2m,cloudcover,shortwave_radiation,direct_radiation",
        "timezone":         "America/Chicago",   # local time for correct day patterns
        "temperature_unit": "fahrenheit",
        "wind_speed_unit":  "mph",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(OPEN_METEO_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    h = data["hourly"]
    df = pd.DataFrame({
        "timestamp":            pd.to_datetime(h["time"]),
        "temperature":          h["temperature_2m"],
        "cloud_cover":          h["cloudcover"],
        "shortwave_radiation":  h["shortwave_radiation"],   # W/m²
        "direct_radiation":     h["direct_radiation"],      # W/m²
    })

    # localise Central Time → UTC
    df["timestamp"] = (
        df["timestamp"]
        .dt.tz_localize("America/Chicago", ambiguous="NaT", nonexistent="NaT")
        .dt.tz_convert("UTC")
    )
    df = df.dropna(subset=["timestamp"])
    df["local_hour"] = df["timestamp"].dt.tz_convert("America/Chicago").dt.hour
    return df.reset_index(drop=True)


def _solar_from_radiation(radiation_w_m2: pd.Series) -> pd.Series:
    """
    Convert real shortwave radiation (W/m²) to site solar generation (kWh/h).
    Formula: kWh = system_kW × (radiation / 1000) × performance_ratio
    """
    return (SYSTEM_KW * (radiation_w_m2 / 1000) * PERFORMANCE_RATIO).clip(lower=0)


# ── EIA ───────────────────────────────────────────────────────────────────────

async def _fetch_eia_demand(start_utc: str, end_utc: str) -> pd.DataFrame:
    """
    Fetch real ERCOT hourly grid demand from EIA API.
    Returns UTC-indexed DataFrame with ercot_demand_mwh.
    EIA periods are in UTC.
    """
    api_key = settings.eia_api_key
    if not api_key:
        logger.warning("EIA_API_KEY not set — skipping real demand fetch.")
        return pd.DataFrame()

    all_rows: list[dict] = []
    offset = 0
    async with httpx.AsyncClient(timeout=60.0) as client:
        while True:
            params = {
                "api_key":                api_key,
                "frequency":              "hourly",
                "data[0]":                "value",
                "facets[respondent][]":   "ERCO",
                "facets[type][]":         "D",
                "start":                  start_utc,
                "end":                    end_utc,
                "sort[0][column]":        "period",
                "sort[0][direction]":     "asc",
                "length":                 5000,
                "offset":                 offset,
            }
            resp = await client.get(EIA_DEMAND_URL, params=params)
            resp.raise_for_status()
            body = resp.json()
            rows = body.get("response", {}).get("data", [])
            if not rows:
                break
            all_rows.extend(rows)
            if len(rows) < 5000:
                break
            offset += 5000

    if not all_rows:
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    # EIA period format: "2024-01-01T00" (UTC)
    df["timestamp"] = pd.to_datetime(df["period"], utc=True, errors="coerce")
    df["ercot_demand_mwh"] = pd.to_numeric(df["value"], errors="coerce")
    df = df[["timestamp", "ercot_demand_mwh"]].dropna().drop_duplicates("timestamp")
    logger.info("Fetched %d rows of real ERCOT demand from EIA.", len(df))
    return df.reset_index(drop=True)


def _scale_demand(ercot_mwh: pd.Series) -> pd.Series:
    """
    Scale real ERCOT grid demand (MWh) to site level (kWh/h).
    Preserves the real demand SHAPE while sizing it to our commercial site.
    """
    mean = ercot_mwh.mean()
    if mean == 0:
        return pd.Series(np.full(len(ercot_mwh), SITE_AVG_KW))
    scale = SITE_AVG_KW / mean
    demand = ercot_mwh * scale
    # soft clip so no single hour goes below 20 kWh (always-on loads)
    return demand.clip(lower=20)


def _price_from_demand(ercot_mwh: pd.Series, rng: np.random.Generator) -> pd.Series:
    """
    Derive realistic ERCOT LMP prices from real demand via a merit-order curve.
    ERCOT prices are strongly correlated with demand utilisation — this is
    exactly how energy traders model them.

    Low utilisation  (~50%) → ~$25–40/MWh
    High utilisation (~85%) → ~$80–150/MWh
    Peak utilisation (~95%) → $200–500/MWh  (scarcity events)
    """
    max_cap = ercot_mwh.max() * 1.15    # assume 15% headroom at annual peak
    utilisation = (ercot_mwh / max_cap).clip(0, 1)

    # Exponential merit-order curve
    price = 22 + 300 * (utilisation ** 4.5)

    # Noise (bid spread)
    noise = rng.normal(0, 4, len(price))
    price = (price + noise).clip(lower=15, upper=500)

    return pd.Series(price, index=ercot_mwh.index)


# ── Battery heuristic (reused from original generator) ────────────────────────

def _battery_step(
    price: float, soc: float,
    capacity: float = 100.0, max_power: float = 50.0, eff: float = 0.92,
) -> tuple[str, float]:
    if price < 38 and soc < 90:
        charge = min(max_power, capacity * (90 - soc) / 100) * eff
        return "charge", min(soc + (charge / capacity) * 100, 100)
    elif price > 75 and soc > 20:
        discharge = min(max_power, capacity * (soc - 20) / 100)
        return "discharge", max(soc - (discharge / capacity) * 100, 0)
    return "idle", soc


def _compute_costs(
    demand: float, solar: float, price_mwh: float,
    soc_before: float, soc_after: float, capacity: float = 100.0,
) -> tuple[float, float, float, float]:
    price_kwh = price_mwh / 1000
    net = max(demand - solar, 0)
    baseline_cost = round(net * price_kwh, 4)
    battery_delta = (soc_after - soc_before) / 100 * capacity
    grid_import = max(net + battery_delta, 0)
    optimized_cost = round(grid_import * price_kwh, 4)
    savings = round(baseline_cost - optimized_cost, 4)
    return round(grid_import, 3), baseline_cost, optimized_cost, savings


# ── Main assembler ─────────────────────────────────────────────────────────────

async def fetch_real_dataset(days: int = 90) -> pd.DataFrame:
    """
    Fetch and assemble a real hourly energy dataset.

    Returns DataFrame with the same schema as energy_readings.
    """
    rng = np.random.default_rng(42)

    # Date range — Open-Meteo archive lags by ~2 days
    end_dt   = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=2)
    start_dt = end_dt - timedelta(days=days)

    start_str = start_dt.strftime("%Y-%m-%d")
    end_str   = end_dt.strftime("%Y-%m-%d")
    start_eia = start_dt.strftime("%Y-%m-%dT%H")
    end_eia   = end_dt.strftime("%Y-%m-%dT%H")

    logger.info("Fetching real data %s → %s …", start_str, end_str)

    # ── 1. Weather + solar radiation (always available) ──────────────────────
    weather_df = await _fetch_open_meteo(start_str, end_str)
    weather_df["solar_generation_kwh"] = _solar_from_radiation(weather_df["shortwave_radiation"])

    # ── 2. ERCOT demand (requires EIA key) ───────────────────────────────────
    eia_df = await _fetch_eia_demand(start_eia, end_eia)

    # ── 3. Merge or fall back ────────────────────────────────────────────────
    if not eia_df.empty:
        merged = weather_df.merge(eia_df, on="timestamp", how="left")
        merged["ercot_demand_mwh"] = (
            merged.set_index("timestamp")["ercot_demand_mwh"]
            .interpolate("time")
            .bfill()
            .ffill()
            .values
        )
        merged["demand_kwh"]     = _scale_demand(merged["ercot_demand_mwh"])
        merged["ercot_price_mwh"] = _price_from_demand(merged["ercot_demand_mwh"], rng).values
    else:
        # No EIA key: derive demand from real temperature (still uses real weather)
        logger.info("No EIA key — deriving demand from real temperature data.")
        merged = weather_df.copy()
        merged["demand_kwh"] = _demand_from_temperature(
            merged["temperature"], merged["local_hour"], rng
        )
        merged["ercot_price_mwh"] = _price_from_demand(
            merged["demand_kwh"] * 300,   # scale back up to grid-level for curve
            rng
        ).values

    # ── 4. Battery simulation ─────────────────────────────────────────────────
    soc = 50.0
    records = []
    for _, row in merged.iterrows():
        price  = float(row["ercot_price_mwh"])
        demand = float(row["demand_kwh"])
        solar  = float(row["solar_generation_kwh"])

        soc_before = soc
        action, soc = _battery_step(price, soc)
        grid_import, baseline_cost, optimized_cost, savings = _compute_costs(
            demand, solar, price, soc_before, soc
        )
        records.append({
            "timestamp":             row["timestamp"],
            "demand_kwh":            round(demand, 3),
            "solar_generation_kwh":  round(solar, 3),
            "ercot_price_mwh":       round(price, 4),
            "temperature":           round(float(row["temperature"]), 2) if pd.notna(row["temperature"]) else None,
            "cloud_cover":           round(float(row["cloud_cover"]), 2) if pd.notna(row["cloud_cover"]) else None,
            "battery_soc":           round(soc, 2),
            "grid_import_kwh":       grid_import,
            "baseline_cost":         baseline_cost,
            "optimized_cost":        optimized_cost,
            "savings":               savings,
            "action":                action,
        })

    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    logger.info("Real dataset assembled: %d rows.", len(df))
    return df


def _demand_from_temperature(
    temp: pd.Series,
    local_hour: pd.Series,
    rng: np.random.Generator,
) -> pd.Series:
    """
    Fallback: estimate site demand from real temperature.
    Uses heating/cooling degree-hour model — still driven by REAL weather.
    """
    import math
    demands = []
    for t, h in zip(temp, local_hour):
        if 0 <= h < 6:
            base = rng.uniform(80, 120)
        elif 6 <= h < 9:
            base = rng.uniform(150, 220)
        elif 9 <= h < 17:
            base = rng.uniform(200, 280)
        elif 17 <= h < 21:
            base = rng.uniform(220, 300)
        else:
            base = rng.uniform(130, 180)

        if pd.notna(t):
            if t > 85:
                base *= 1 + (t - 85) * 0.015
            elif t < 35:
                base *= 1 + (35 - t) * 0.010

        demands.append(max(base + rng.normal(0, 5), 20))
    return pd.Series(demands, index=temp.index)
