"""
EnergyFlow AI – In-Memory Data Store
"""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)

_df: pd.DataFrame = pd.DataFrame()


async def init_store(days: int = 90) -> int:
    global _df
    from app.data_fetcher import fetch_real_dataset
    _df = await fetch_real_dataset(days=days)
    return len(_df)


def get_df() -> pd.DataFrame:
    return _df.copy()


def is_empty() -> bool:
    return _df.empty
