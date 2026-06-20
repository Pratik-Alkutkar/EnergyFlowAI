"""
EnergyFlow AI – Synthetic Data Generator
=========================================
Generates realistic hourly energy data mimicking:
  - ERCOT LMP price patterns (day-ahead with peak/off-peak structure)
  - Solar irradiance curve based on latitude / cloud cover
  - Temperature-driven demand (hot Texas summers)
  - Battery state-of-charge with charge/discharge logic

Design: all logic is deterministic given a seed, so results are reproducible.
Real APIs (ERCOT, Open-Meteo, NREL) can replace individual functions here.
"""

from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone
from typing import Literal

import numpy as np
import pandas as pd

Action = Literal["charge", "discharge", "idle"]


# ---------------------------------------------------------------------------
# Price generation (ERCOT-like LMP)
# ---------------------------------------------------------------------------
def _ercot_price(hour: int, month: int, rng: np.random.Generator) -> float:
    """
    Simulate ERCOT day-ahead LMP ($/MWh).
    Base pattern: off-peak 20-35, shoulder 35-60, peak 60-150
    Summer scarcity events add spikes up to 500 $/MWh (rare).
    """
    # Hour-of-day base profile
    if 0 <= hour < 6:
        base = rng.uniform(18, 30)
    elif 6 <= hour < 9:
        base = rng.uniform(35, 65)
    elif 9 <= hour < 11:
        base = rng.uniform(45, 80)
    elif 11 <= hour < 14:
        base = rng.uniform(40, 70)   # solar suppression mid-day
    elif 14 <= hour < 20:
        base = rng.uniform(60, 140)  # afternoon peak Texas summer
    elif 20 <= hour < 22:
        base = rng.uniform(50, 90)
    else:
        base = rng.uniform(25, 45)

    # Summer premium (Jun–Sep)
    if month in (6, 7, 8, 9):
        base *= rng.uniform(1.1, 1.4)

    # Occasional scarcity spike (1% chance, summer)
    if month in (6, 7, 8, 9) and rng.random() < 0.01:
        base = rng.uniform(200, 500)

    return round(float(base), 4)


# ---------------------------------------------------------------------------
# Weather generation (Open-Meteo-like)
# ---------------------------------------------------------------------------
def _temperature(hour: int, month: int, rng: np.random.Generator) -> float:
    """Temperature in °F for Austin TX."""
    monthly_avg = {1: 52, 2: 56, 3: 63, 4: 70, 5: 78,
                   6: 87, 7: 92, 8: 91, 9: 84, 10: 74, 11: 62, 12: 54}
    avg = monthly_avg.get(month, 70)
    # Diurnal swing: min at 6am, max at 3pm
    diurnal = 10 * math.sin(math.pi * (hour - 6) / 18) if 6 <= hour <= 24 else -5
    noise = rng.normal(0, 2)
    return round(avg + diurnal + noise, 2)


def _cloud_cover(rng: np.random.Generator) -> float:
    """Cloud cover 0–100 %."""
    return round(float(np.clip(rng.beta(2, 5) * 100, 0, 100)), 2)


# ---------------------------------------------------------------------------
# Solar generation (NREL PVWatts-like)
# ---------------------------------------------------------------------------
def _solar_generation(
    hour: int,
    day_of_year: int,
    cloud_cover: float,
    system_kw: float = 250.0,
    lat: float = 30.27,
) -> float:
    """
    Approximate hourly solar generation (kWh) for a rooftop / commercial array.
    Uses a simplified irradiance model (sinusoidal day curve).
    """
    # Solar declination
    declination = 23.45 * math.sin(math.radians(360 / 365 * (day_of_year - 81)))
    # Hour angle (-180 to 180)
    hour_angle = 15 * (hour - 12)
    cos_zenith = (
        math.sin(math.radians(lat)) * math.sin(math.radians(declination))
        + math.cos(math.radians(lat))
        * math.cos(math.radians(declination))
        * math.cos(math.radians(hour_angle))
    )
    cos_zenith = max(cos_zenith, 0)  # no negative irradiance

    # Peak irradiance ~1000 W/m2 at zenith, panel efficiency ~18%
    irradiance = 1000 * cos_zenith
    # Cloud reduction
    cloud_factor = 1 - (cloud_cover / 100) * 0.75
    panel_efficiency = 0.18
    # kWh for 1 hour
    generation = system_kw * (irradiance / 1000) * panel_efficiency * cloud_factor
    return round(max(generation, 0), 3)


# ---------------------------------------------------------------------------
# Demand generation
# ---------------------------------------------------------------------------
def _demand(
    hour: int,
    month: int,
    temperature: float,
    rng: np.random.Generator,
) -> float:
    """Electricity demand in kWh (commercial 250kW baseline)."""
    # Base load profile
    if 0 <= hour < 6:
        base = rng.uniform(80, 120)
    elif 6 <= hour < 9:
        base = rng.uniform(150, 220)
    elif 9 <= hour < 17:
        base = rng.uniform(200, 280)
    elif 17 <= hour < 21:
        base = rng.uniform(220, 300)
    else:
        base = rng.uniform(130, 180)

    # Temperature sensitivity: AC demand
    if temperature > 85:
        base *= 1 + (temperature - 85) * 0.015
    elif temperature < 35:
        base *= 1 + (35 - temperature) * 0.010

    noise = rng.normal(0, 5)
    return round(max(base + noise, 20), 3)


# ---------------------------------------------------------------------------
# Battery optimisation heuristic
# ---------------------------------------------------------------------------
def _battery_action(
    hour: int,
    price: float,
    soc: float,
    capacity_kwh: float = 100.0,
    max_power_kw: float = 50.0,
    efficiency: float = 0.92,
) -> tuple[Action, float]:
    """
    Simple rule-based battery controller.
    Returns (action, new_soc_pct).
    - Charge when price < 40 $/MWh and SOC < 90%
    - Discharge when price > 80 $/MWh and SOC > 20%
    - Otherwise idle
    """
    if price < 40 and soc < 90:
        charge_kwh = min(max_power_kw, capacity_kwh * (90 - soc) / 100) * efficiency
        new_soc = min(soc + (charge_kwh / capacity_kwh) * 100, 100)
        return "charge", round(new_soc, 2)
    elif price > 80 and soc > 20:
        discharge_kwh = min(max_power_kw, capacity_kwh * (soc - 20) / 100)
        new_soc = max(soc - (discharge_kwh / capacity_kwh) * 100, 0)
        return "discharge", round(new_soc, 2)
    else:
        return "idle", round(soc, 2)


# ---------------------------------------------------------------------------
# Cost calculation
# ---------------------------------------------------------------------------
def _costs(
    demand: float,
    solar: float,
    price_mwh: float,
    action: Action,
    soc_before: float,
    soc_after: float,
    capacity_kwh: float = 100.0,
) -> tuple[float, float, float, float]:
    """
    Returns (grid_import_kwh, baseline_cost, optimized_cost, savings)
    price_mwh → price_kwh = price_mwh / 1000
    """
    price_kwh = price_mwh / 1000

    # Baseline: no battery, buy all net demand from grid
    net_demand = max(demand - solar, 0)
    baseline_cost = round(net_demand * price_kwh, 4)

    # Optimized: battery covers peak demand
    battery_delta_kwh = (soc_after - soc_before) / 100 * capacity_kwh
    # Positive delta = charging (drawing from grid), negative = discharging (supplying)
    grid_import = net_demand + battery_delta_kwh
    grid_import = max(grid_import, 0)

    optimized_cost = round(grid_import * price_kwh, 4)
    savings = round(baseline_cost - optimized_cost, 4)

    return round(grid_import, 3), baseline_cost, optimized_cost, savings


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------
def generate_hourly_data(
    start: datetime,
    end: datetime,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate a DataFrame of hourly energy readings.

    Parameters
    ----------
    start : tz-aware datetime
    end   : tz-aware datetime
    seed  : random seed for reproducibility

    Returns
    -------
    pd.DataFrame with columns matching the energy_readings table.
    """
    rng = np.random.default_rng(seed)

    records = []
    current = start
    soc = 50.0  # initial battery state of charge

    while current < end:
        hour = current.hour
        month = current.month
        day_of_year = current.timetuple().tm_yday

        # Generate weather
        temp = _temperature(hour, month, rng)
        cloud = _cloud_cover(rng)

        # Generate market price
        price = _ercot_price(hour, month, rng)

        # Generate generation & demand
        solar = _solar_generation(hour, day_of_year, cloud)
        demand = _demand(hour, month, temp, rng)

        # Battery control
        soc_before = soc
        action, soc = _battery_action(hour, price, soc)

        # Costs
        grid_import, baseline_cost, optimized_cost, savings = _costs(
            demand, solar, price, action, soc_before, soc
        )

        records.append(
            {
                "timestamp": current,
                "demand_kwh": demand,
                "solar_generation_kwh": solar,
                "ercot_price_mwh": price,
                "temperature": temp,
                "cloud_cover": cloud,
                "battery_soc": soc,
                "grid_import_kwh": grid_import,
                "baseline_cost": baseline_cost,
                "optimized_cost": optimized_cost,
                "savings": savings,
                "action": action,
            }
        )

        current += timedelta(hours=1)

    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    return df


def generate_default_dataset(days: int = 90, seed: int = 42) -> pd.DataFrame:
    """Generate 90 days of hourly data ending now."""
    end = datetime.now(tz=timezone.utc).replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)
    return generate_hourly_data(start, end, seed=seed)
