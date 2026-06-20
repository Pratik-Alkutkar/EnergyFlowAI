"""
EnergyFlow AI – Forecasting Module (in-memory, no DB)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from app.data_store import get_df

try:
    from xgboost import XGBRegressor
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

logger = logging.getLogger(__name__)


def _get_model():
    if XGB_AVAILABLE:
        return XGBRegressor(
            n_estimators=200, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1,
        )
    return GradientBoostingRegressor(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        subsample=0.8, random_state=42,
    )


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    ts = pd.to_datetime(df["timestamp"])
    df["hour"]        = ts.dt.hour
    df["day_of_week"] = ts.dt.dayofweek
    df["day_of_year"] = ts.dt.dayofyear
    df["month"]       = ts.dt.month
    df["is_weekend"]  = (df["day_of_week"] >= 5).astype(int)
    df["hour_sin"]    = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]    = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]     = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]     = np.cos(2 * np.pi * df["day_of_week"] / 7)
    return df


def _future_grid(n: int) -> pd.DataFrame:
    now = datetime.now(tz=timezone.utc).replace(minute=0, second=0, microsecond=0)
    return pd.DataFrame({"timestamp": [now + timedelta(hours=i + 1) for i in range(n)]})


def _add_lags(df: pd.DataFrame, col: str, lags: list[int]) -> pd.DataFrame:
    for lag in lags:
        df[f"{col}_lag{lag}"] = df[col].shift(lag)
    return df


def _add_rolling(df: pd.DataFrame, col: str, windows: list[int]) -> pd.DataFrame:
    for w in windows:
        df[f"{col}_roll_mean_{w}"] = df[col].rolling(w, min_periods=1).mean()
        df[f"{col}_roll_std_{w}"]  = df[col].rolling(w, min_periods=1).std().fillna(0)
    return df


def _run_forecast(target: str, feature_cols: list[str], n_hours: int) -> dict[str, Any]:
    df = get_df()
    if df.empty or len(df) < 48:
        return {"error": "No data — call /generate-data first"}

    df = _build_features(df)
    df = _add_lags(df, target, [1, 2, 24, 48, 168])
    df = _add_rolling(df, target, [6, 24])
    df = df.dropna(subset=feature_cols + [target]).reset_index(drop=True)

    X, y = df[feature_cols], df[target]
    split = int(len(X) * 0.85)
    model = _get_model()
    model.fit(X.iloc[:split], y.iloc[:split])

    preds_test = model.predict(X.iloc[split:])
    mae  = float(mean_absolute_error(y.iloc[split:], preds_test))
    rmse = float(np.sqrt(mean_squared_error(y.iloc[split:], preds_test)))
    ci   = 1.5 * float(np.std(y.iloc[split:].values - preds_test))

    # Seed future with last known values
    history = df[target].tolist()
    fut = _future_grid(n_hours)
    fut = _build_features(fut)

    last_temp  = float(df["temperature"].iloc[-1]) if "temperature" in df else 75.0
    last_cloud = float(df["cloud_cover"].iloc[-1])  if "cloud_cover"  in df else 20.0
    last_demand= float(df["demand_kwh"].iloc[-1])

    forecasts = []
    for _, row in fut.iterrows():
        feat: dict[str, float] = {}
        for c in ["hour","day_of_week","month","day_of_year","is_weekend",
                  "hour_sin","hour_cos","dow_sin","dow_cos"]:
            if c in feature_cols:
                feat[c] = float(row[c])
        if "temperature" in feature_cols:  feat["temperature"]  = last_temp
        if "cloud_cover"  in feature_cols: feat["cloud_cover"]  = last_cloud
        if "demand_kwh"   in feature_cols: feat["demand_kwh"]   = last_demand

        for lag in [1, 2, 24, 48, 168]:
            k = f"{target}_lag{lag}"
            if k in feature_cols:
                feat[k] = history[-lag] if lag <= len(history) else float(y.mean())
        for w in [6, 24]:
            km = f"{target}_roll_mean_{w}"
            ks = f"{target}_roll_std_{w}"
            if km in feature_cols: feat[km] = float(np.mean(history[-w:]))
            if ks in feature_cols: feat[ks] = float(np.std(history[-w:]))

        pred = max(float(model.predict(pd.DataFrame([feat]))[0]), 0)
        # Zero out solar at night
        if target == "solar_generation_kwh" and (row["hour"] < 6 or row["hour"] > 20):
            pred = 0.0
        history.append(pred)
        forecasts.append(pred)

    return {
        "forecast_type": target.replace("_kwh","").replace("ercot_price","price").replace("_mwh",""),
        "model":  "XGBoost" if XGB_AVAILABLE else "GradientBoosting",
        "mae":    round(mae, 4),
        "rmse":   round(rmse, 4),
        "n_hours": n_hours,
        "predictions": [
            {
                "timestamp":       str(fut.iloc[i]["timestamp"]),
                "predicted_value": round(forecasts[i], 4),
                "lower_bound":     round(max(forecasts[i] - ci, 0), 4),
                "upper_bound":     round(forecasts[i] + ci, 4),
            }
            for i in range(n_hours)
        ],
    }


BASE_FEATS = ["hour","day_of_week","month","is_weekend","hour_sin","hour_cos","dow_sin","dow_cos"]


def forecast_demand(n_hours: int = 24) -> dict:
    feats = BASE_FEATS + ["temperature","cloud_cover",
            "demand_kwh_lag1","demand_kwh_lag2","demand_kwh_lag24","demand_kwh_lag48","demand_kwh_lag168",
            "demand_kwh_roll_mean_6","demand_kwh_roll_std_6","demand_kwh_roll_mean_24"]
    return _run_forecast("demand_kwh", feats, n_hours)


def forecast_solar(n_hours: int = 24) -> dict:
    feats = BASE_FEATS + ["day_of_year","temperature","cloud_cover",
            "solar_generation_kwh_lag1","solar_generation_kwh_lag24","solar_generation_kwh_lag48",
            "solar_generation_kwh_roll_mean_6","solar_generation_kwh_roll_mean_24"]
    return _run_forecast("solar_generation_kwh", feats, n_hours)


def forecast_price(n_hours: int = 24) -> dict:
    feats = BASE_FEATS + ["temperature","demand_kwh",
            "ercot_price_mwh_lag1","ercot_price_mwh_lag2","ercot_price_mwh_lag24","ercot_price_mwh_lag168",
            "ercot_price_mwh_roll_mean_6","ercot_price_mwh_roll_std_6","ercot_price_mwh_roll_mean_24"]
    return _run_forecast("ercot_price_mwh", feats, n_hours)
