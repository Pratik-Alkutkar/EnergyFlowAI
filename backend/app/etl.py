"""
EnergyFlow AI – ETL Pipeline
==============================
Responsibilities:
  1. Extract: pull from data_generator (synthetic) or real APIs
  2. Transform: validate, clean, feature-engineer
  3. Load: upsert into Postgres energy_readings table
  4. Refresh: re-compute daily_summary materialised view
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.data_generator import generate_hourly_data

logger = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Transform helpers
# ---------------------------------------------------------------------------
def validate_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    """Validate schema and clip outliers."""
    required = [
        "timestamp", "demand_kwh", "solar_generation_kwh", "ercot_price_mwh",
        "temperature", "cloud_cover", "battery_soc", "grid_import_kwh",
        "baseline_cost", "optimized_cost", "savings", "action",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    # Clip physically impossible values
    df["demand_kwh"] = df["demand_kwh"].clip(lower=0, upper=5000)
    df["solar_generation_kwh"] = df["solar_generation_kwh"].clip(lower=0, upper=5000)
    df["ercot_price_mwh"] = df["ercot_price_mwh"].clip(lower=-500, upper=9000)
    df["battery_soc"] = df["battery_soc"].clip(lower=0, upper=100)
    df["cloud_cover"] = df["cloud_cover"].clip(lower=0, upper=100)

    # Drop duplicates on timestamp
    df = df.drop_duplicates(subset=["timestamp"])

    # Sort
    df = df.sort_values("timestamp").reset_index(drop=True)

    return df


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived columns useful for ML / analytics."""
    df = df.copy()
    df["hour_of_day"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek   # 0=Mon
    df["month"] = df["timestamp"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["net_load_kwh"] = (df["demand_kwh"] - df["solar_generation_kwh"]).clip(lower=0)
    return df


# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------
async def upsert_energy_readings(session: AsyncSession, df: pd.DataFrame) -> int:
    """
    Upsert rows into energy_readings.
    Uses ON CONFLICT DO UPDATE so re-running ETL is safe.
    Returns number of rows inserted/updated.
    """
    df = validate_and_clean(df)
    records = df[[
        "timestamp", "demand_kwh", "solar_generation_kwh", "ercot_price_mwh",
        "temperature", "cloud_cover", "battery_soc", "grid_import_kwh",
        "baseline_cost", "optimized_cost", "savings", "action",
    ]].to_dict(orient="records")

    upsert_sql = text("""
        INSERT INTO energy_readings
            (timestamp, demand_kwh, solar_generation_kwh, ercot_price_mwh,
             temperature, cloud_cover, battery_soc, grid_import_kwh,
             baseline_cost, optimized_cost, savings, action)
        VALUES
            (:timestamp, :demand_kwh, :solar_generation_kwh, :ercot_price_mwh,
             :temperature, :cloud_cover, :battery_soc, :grid_import_kwh,
             :baseline_cost, :optimized_cost, :savings, :action)
        ON CONFLICT (timestamp)
        DO UPDATE SET
            demand_kwh           = EXCLUDED.demand_kwh,
            solar_generation_kwh = EXCLUDED.solar_generation_kwh,
            ercot_price_mwh      = EXCLUDED.ercot_price_mwh,
            temperature          = EXCLUDED.temperature,
            cloud_cover          = EXCLUDED.cloud_cover,
            battery_soc          = EXCLUDED.battery_soc,
            grid_import_kwh      = EXCLUDED.grid_import_kwh,
            baseline_cost        = EXCLUDED.baseline_cost,
            optimized_cost       = EXCLUDED.optimized_cost,
            savings              = EXCLUDED.savings,
            action               = EXCLUDED.action
    """)

    batch_size = 500
    total = 0
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        await session.execute(upsert_sql, batch)
        total += len(batch)

    logger.info("Upserted %d rows into energy_readings", total)
    return total


async def refresh_daily_summary(session: AsyncSession) -> None:
    """Refresh the daily_summary materialised view."""
    try:
        await session.execute(
            text("REFRESH MATERIALIZED VIEW CONCURRENTLY daily_summary")
        )
        logger.info("Refreshed daily_summary materialised view.")
    except Exception as exc:
        # Non-concurrently if CONCURRENTLY fails (e.g. no unique index yet)
        logger.warning("CONCURRENTLY refresh failed, retrying: %s", exc)
        await session.execute(text("REFRESH MATERIALIZED VIEW daily_summary"))


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------
async def run_full_etl(session: AsyncSession, days: int = 90) -> dict:
    """
    Run full synthetic ETL pipeline:
    Generate → Validate → Upsert → Refresh MV
    """
    end = datetime.now(tz=timezone.utc).replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)

    logger.info("ETL: Generating %d days of synthetic data...", days)
    df = generate_hourly_data(start, end)

    logger.info("ETL: Upserting %d rows...", len(df))
    rows_written = await upsert_energy_readings(session, df)

    logger.info("ETL: Refreshing daily summary...")
    await refresh_daily_summary(session)

    return {
        "status": "success",
        "rows_generated": len(df),
        "rows_written": rows_written,
        "start": start.isoformat(),
        "end": end.isoformat(),
    }
