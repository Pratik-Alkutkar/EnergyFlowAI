"""
EnergyFlow AI – Analytics Module (pandas, no SQL)
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from app.data_store import get_df, is_empty


def _filter(days: int) -> pd.DataFrame:
    df = get_df()
    if df.empty:
        return df
    cutoff = df["timestamp"].max() - pd.Timedelta(days=days)
    return df[df["timestamp"] >= cutoff]


def get_summary(days: int = 30) -> dict[str, Any]:
    df = _filter(days)
    if df.empty:
        return {}
    return {
        "total_readings":        int(len(df)),
        "avg_demand_kwh":        round(float(df["demand_kwh"].mean()), 3),
        "total_demand_kwh":      round(float(df["demand_kwh"].sum()), 3),
        "total_solar_kwh":       round(float(df["solar_generation_kwh"].sum()), 3),
        "solar_penetration_pct": round(
            float(df["solar_generation_kwh"].sum() / max(df["demand_kwh"].sum(), 1e-9) * 100), 2
        ),
        "avg_price_mwh":         round(float(df["ercot_price_mwh"].mean()), 4),
        "peak_price_mwh":        round(float(df["ercot_price_mwh"].max()), 4),
        "total_baseline_cost":   round(float(df["baseline_cost"].sum()), 4),
        "total_optimized_cost":  round(float(df["optimized_cost"].sum()), 4),
        "total_savings":         round(float(df["savings"].sum()), 4),
        "savings_pct":           round(
            float(df["savings"].sum() / max(df["baseline_cost"].sum(), 1e-9) * 100), 2
        ),
    }


def get_hourly_profile(days: int = 30) -> list[dict]:
    df = _filter(days)
    if df.empty:
        return []
    df["hour"] = df["timestamp"].dt.hour
    grp = df.groupby("hour").agg(
        avg_demand_kwh=("demand_kwh", "mean"),
        avg_solar_kwh=("solar_generation_kwh", "mean"),
        avg_price_mwh=("ercot_price_mwh", "mean"),
    ).reset_index().rename(columns={"hour": "hour_of_day"})
    grp = grp.round(4)
    return grp.to_dict(orient="records")


def get_daily_totals(days: int = 30) -> list[dict]:
    df = _filter(days)
    if df.empty:
        return []
    df = df.copy()
    df["day"] = df["timestamp"].dt.date
    grp = df.groupby("day").agg(
        total_demand_kwh=("demand_kwh", "sum"),
        total_solar_kwh=("solar_generation_kwh", "sum"),
        total_savings=("savings", "sum"),
        avg_price_mwh=("ercot_price_mwh", "mean"),
    ).reset_index()
    grp["day"] = grp["day"].astype(str)
    grp = grp.round(4)
    return grp.to_dict(orient="records")


def get_action_distribution(days: int = 30) -> list[dict]:
    df = _filter(days)
    if df.empty:
        return []
    counts = df["action"].value_counts().reset_index()
    counts.columns = ["action", "count"]
    counts["pct"] = (counts["count"] / counts["count"].sum() * 100).round(2)
    return counts.to_dict(orient="records")


def get_savings_report(days: int = 30) -> list[dict]:
    df = _filter(days)
    if df.empty:
        return []
    df = df.copy()
    df["day"] = df["timestamp"].dt.date
    grp = df.groupby("day").agg(
        baseline_cost=("baseline_cost", "sum"),
        optimized_cost=("optimized_cost", "sum"),
        savings=("savings", "sum"),
    ).reset_index()
    grp["savings_pct"] = (grp["savings"] / grp["baseline_cost"].replace(0, float("nan")) * 100).round(2)
    grp["day"] = grp["day"].astype(str)
    grp = grp.round(4)
    return grp.to_dict(orient="records")


def get_recent_readings(limit: int = 168, offset: int = 0) -> list[dict]:
    df = get_df()
    if df.empty:
        return []
    df = df.sort_values("timestamp", ascending=False).iloc[offset: offset + limit]
    df = df.copy()
    df["timestamp"] = df["timestamp"].astype(str)
    return df.to_dict(orient="records")
