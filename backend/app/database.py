"""EnergyFlow AI – Async Database Layer (SQLAlchemy + asyncpg + Neon)"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
engine = create_async_engine(
    settings.database_url,
    echo=settings.app_env == "development",
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args={"server_settings": {"application_name": "energyflow-ai"}},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Dependency injection helper
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Context-manager version for use outside FastAPI DI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ---------------------------------------------------------------------------
# Schema initialisation
# ---------------------------------------------------------------------------
async def init_db() -> None:
    """Run schema.sql against the database (idempotent)."""
    import pathlib

    schema_path = pathlib.Path(__file__).parent.parent / "sql" / "schema.sql"
    sql = schema_path.read_text()

    async with engine.begin() as conn:
        # Split on semicolons and run each statement
        for statement in sql.split(";"):
            stmt = statement.strip()
            if stmt:
                try:
                    await conn.execute(text(stmt))
                except Exception as exc:
                    logger.warning("Schema statement skipped: %s", exc)
    logger.info("Database schema initialised.")


async def ping_db() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error("DB ping failed: %s", exc)
        return False
