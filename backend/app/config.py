"""EnergyFlow AI – Application Configuration (no database)"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env:      str = "development"
    secret_key:   str = "dev-secret-key"
    cors_origins: str = "http://localhost:3000"

    # EIA API (free key at eia.gov/opendata) — enables real ERCOT demand + prices
    eia_api_key: str = ""

    # Optional AI copilot
    openai_api_key: str = ""

    # Battery / site config
    battery_capacity_kwh:     float = 100.0
    battery_max_charge_kw:    float = 50.0
    battery_max_discharge_kw: float = 50.0
    battery_efficiency:       float = 0.92
    site_latitude:            float = 30.2672
    site_longitude:           float = -97.7431

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
