"""Quantile summary kernel - backend-only."""
from typing import Any

from engine.compute.backend import ComputeBackend

QUANTILES = [0.01, 0.05, 0.25, 0.50, 0.75, 0.95, 0.99]


def quantile_summary(backend: ComputeBackend, a: Any) -> dict[str, float]:
    """Compute quantile summary for array."""
    return {f"p{int(q*100)}": float(backend.quantile(a, q)) for q in QUANTILES}
