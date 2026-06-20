"""
EnergyFlow AI – Pydantic request/response models
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Energy Reading
# ---------------------------------------------------------------------------
class EnergyReading(BaseModel):
    id: Optional[int] = None
    timestamp: datetime
    demand_kwh: float
    solar_generation_kwh: float
    ercot_price_mwh: float
    temperature: Optional[float] = None
    cloud_cover: Optional[float] = None
    battery_soc: Optional[float] = None
    grid_import_kwh: Optional[float] = None
    baseline_cost: Optional[float] = None
    optimized_cost: Optional[float] = None
    savings: Optional[float] = None
    action: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
class SummaryResponse(BaseModel):
    total_readings: Optional[int] = None
    avg_demand_kwh: Optional[float] = None
    total_demand_kwh: Optional[float] = None
    total_solar_kwh: Optional[float] = None
    solar_penetration_pct: Optional[float] = None
    avg_price_mwh: Optional[float] = None
    peak_price_mwh: Optional[float] = None
    total_baseline_cost: Optional[float] = None
    total_optimized_cost: Optional[float] = None
    total_savings: Optional[float] = None
    savings_pct: Optional[float] = None


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------
class ForecastPoint(BaseModel):
    timestamp: str
    predicted_value: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    forecast_type: str
    model: str
    mae: float
    rmse: float
    n_hours: int
    predictions: list[ForecastPoint]


# ---------------------------------------------------------------------------
# Optimisation
# ---------------------------------------------------------------------------
class OptScheduleRow(BaseModel):
    hour: int
    timestamp: Optional[str] = None
    charge_kw: float
    discharge_kw: float
    battery_soc_pct: float
    grid_import_kwh: float
    cost_no_battery: float
    cost_with_battery: float
    savings: float
    action: str
    price_mwh: float
    demand_kwh: float
    solar_kwh: float


class OptimisationResponse(BaseModel):
    solver: str
    status: str
    total_cost_baseline: float
    total_cost_optimized: float
    total_savings: float
    savings_pct: float
    schedule: list[OptScheduleRow]


# ---------------------------------------------------------------------------
# Copilot
# ---------------------------------------------------------------------------
class CopilotRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)


class CopilotResponse(BaseModel):
    question: str
    answer: str
    source: str
    context_snapshot: dict[str, Any] = {}


# ---------------------------------------------------------------------------
# ETL / Generate
# ---------------------------------------------------------------------------
class GenerateDataRequest(BaseModel):
    days: int = Field(default=90, ge=1, le=365)
    seed: int = Field(default=42)


class GenerateDataResponse(BaseModel):
    status: str
    rows_generated: int
    rows_written: int
    start: str
    end: str


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    database: str
    version: str = "1.0.0"
    environment: str
