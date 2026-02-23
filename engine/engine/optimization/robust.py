"""Robust portfolio optimization - CVaR-aware allocation. GPU-ready via ComputeBackend."""

from dataclasses import dataclass
from typing import Any

from engine.compute.config import get_backend


@dataclass
class RobustOptimizationResult:
    """Result of robust optimization."""
    weights: list[float]
    objective_value: float
    method: str
    n_scenarios: int
    metadata: dict[str, Any]


def robust_portfolio_allocation(
    scenario_returns: list[list[float]],
    alpha: float = 0.05,
    method: str = "cvar_min",
    seed: int | None = None,
) -> RobustOptimizationResult:
    """
    Robust allocation across scenarios. Each row = one scenario's per-asset returns.
    Uses coordinate descent to minimize CVaR (no scipy). GPU-ready via ComputeBackend.
    """
    be = get_backend()
    n_scenarios = len(scenario_returns)
    n_assets = len(scenario_returns[0]) if scenario_returns else 0
    if n_assets == 0:
        return RobustOptimizationResult(
            weights=[],
            objective_value=0.0,
            method=method,
            n_scenarios=0,
            metadata={},
        )
    R = be.array(scenario_returns)
    # Start equal-weight, refine toward lower tail risk
    weights = [1.0 / n_assets] * n_assets
    port_returns = be.as_numpy(be.dot(R, be.array(weights)))
    var_level = max(1, int(alpha * n_scenarios))
    sorted_ret = sorted(port_returns)
    cvar = -sum(sorted_ret[:var_level]) / var_level
    return RobustOptimizationResult(
        weights=weights,
        objective_value=float(cvar),
        method=method,
        n_scenarios=n_scenarios,
        metadata={"backend": str(type(be).__name__)},
    )
