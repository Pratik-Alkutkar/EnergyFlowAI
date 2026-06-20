"""
EnergyFlow AI – FastAPI Application (in-memory, no database)
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import analytics, forecasting, optimization
from app.config import get_settings
from app.copilot import ask as copilot_ask
from app.data_store import get_df, init_store
from app.models import (
    CopilotRequest, CopilotResponse,
    GenerateDataRequest, GenerateDataResponse,
    HealthResponse, SummaryResponse,
)

logger = logging.getLogger(__name__)
settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting EnergyFlow AI — fetching real data...")
    try:
        n = await init_store(days=90)
        logger.info("Data store ready: %d rows of real data", n)
    except Exception as exc:
        logger.error("Data fetch failed at startup: %s", exc)
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="EnergyFlow AI",
    description="Energy analytics, forecasting, and battery optimisation API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health
@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    df = get_df()
    return HealthResponse(
        status="healthy",
        database=f"in-memory ({len(df)} rows)",
        environment=settings.app_env,
    )


# Data
@app.post("/generate-data", response_model=GenerateDataResponse, tags=["Data"])
async def generate_data(body: GenerateDataRequest = GenerateDataRequest()):
    try:
        n = await init_store(days=body.days)
        df = get_df()
        return GenerateDataResponse(
            status="success",
            rows_generated=n,
            rows_written=n,
            start=str(df["timestamp"].min()),
            end=str(df["timestamp"].max()),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/energy-data", tags=["Data"])
def get_energy_data(
    limit:  int = Query(default=168, ge=1, le=8760),
    offset: int = Query(default=0,   ge=0),
):
    rows = analytics.get_recent_readings(limit=limit, offset=offset)
    return {"count": len(rows), "data": rows}


# Analytics
@app.get("/analytics/summary", response_model=SummaryResponse, tags=["Analytics"])
def get_summary(days: int = Query(default=30, ge=1, le=365)):
    return SummaryResponse(**analytics.get_summary(days))


@app.get("/analytics/hourly-profile", tags=["Analytics"])
def get_hourly_profile(days: int = Query(default=30, ge=1, le=365)):
    return analytics.get_hourly_profile(days)


@app.get("/analytics/daily-totals", tags=["Analytics"])
def get_daily_totals(days: int = Query(default=30, ge=1, le=365)):
    return analytics.get_daily_totals(days)


@app.get("/analytics/action-distribution", tags=["Analytics"])
def get_action_distribution(days: int = Query(default=30, ge=1, le=365)):
    return analytics.get_action_distribution(days)


@app.get("/analytics/savings-report", tags=["Analytics"])
def get_savings_report(days: int = Query(default=30, ge=1, le=365)):
    return analytics.get_savings_report(days)


# Forecasting
@app.get("/forecast/demand", tags=["Forecast"])
def forecast_demand(hours: int = Query(default=24, ge=1, le=168)):
    result = forecasting.forecast_demand(hours)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return result


@app.get("/forecast/solar", tags=["Forecast"])
def forecast_solar(hours: int = Query(default=24, ge=1, le=168)):
    result = forecasting.forecast_solar(hours)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return result


@app.get("/forecast/price", tags=["Forecast"])
def forecast_price(hours: int = Query(default=24, ge=1, le=168)):
    result = forecasting.forecast_price(hours)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return result


# Optimisation
@app.get("/optimize/battery", tags=["Optimization"])
def optimize_battery(
    hours:       int   = Query(default=24,   ge=1,  le=168),
    initial_soc: float = Query(default=50.0, ge=0,  le=100),
):
    result = optimization.optimise_battery(hours=hours, initial_soc_pct=initial_soc)
    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return result


# Copilot
@app.post("/copilot/ask", response_model=CopilotResponse, tags=["Copilot"])
async def copilot_endpoint(body: CopilotRequest):
    try:
        return CopilotResponse(**await copilot_ask(body.question))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
