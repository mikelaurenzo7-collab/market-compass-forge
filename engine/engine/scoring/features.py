"""Feature schema and normalization for deal scoring."""
import numpy as np

FEATURE_NAMES = [
    "deal_size_log",
    "entry_multiple",
    "revenue_growth",
    "leverage",
    "hold_period_years",
    "sector_tech",
    "sector_healthcare",
    "sector_financials",
]


def prepare_features(deal: dict) -> np.ndarray:
    """Extract and normalize features from deal dict."""
    deal_size = float(deal.get("deal_size") or 10)
    entry_mult = float(deal.get("entry_multiple") or 8)
    rev_growth = float(deal.get("revenue_growth") or 0.15)
    leverage = float(deal.get("leverage") or 0.5)
    hold = float(deal.get("hold_period_years") or 5)
    sector = str(deal.get("sector") or "").lower()
    sector_tech = 1.0 if "tech" in sector else 0.0
    sector_healthcare = 1.0 if "health" in sector or "care" in sector else 0.0
    sector_financials = 1.0 if "financ" in sector else 0.0
    return np.array([
        np.log1p(deal_size),
        entry_mult,
        rev_growth,
        leverage,
        hold,
        sector_tech,
        sector_healthcare,
        sector_financials,
    ], dtype=np.float32)
