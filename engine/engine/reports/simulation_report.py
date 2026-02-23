"""Build structured report data from simulation result. No PDF in engine."""
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ReportData:
    """Structured report data for PDF/CSV generation."""
    portfolio_summary: dict
    scenario_summary: dict
    irr_quantiles: dict[str, float]
    moic_quantiles: dict[str, float]
    var_95: float
    cvar_95: float
    downside_prob: float
    threshold_irr: float
    mean_irr: float
    std_irr: float
    mean_moic: float
    std_moic: float
    n_trials: int
    time_to_exit_quantiles: dict[str, float] = field(default_factory=dict)
    timeseries_percentiles: dict[str, list] | None = None
    contagion_top_impacts: list[dict] = field(default_factory=list)
    compute_backend: str = "numpy"
    runtime_ms: float = 0
    trials_per_sec: float = 0


def build_simulation_report(
    result: Any,
    portfolio: dict,
    scenario: dict,
    contagion_top_impacts: list[dict] | None = None,
) -> ReportData:
    """Build ReportData from SimulationResult or dict. Engine-only, no PDF."""
    def _get(obj, key, default=0):
        if isinstance(obj, dict):
            v = obj.get(key)
        else:
            v = getattr(obj, key, None)
        return v if v is not None else default
    return ReportData(
        portfolio_summary={
            "total_cost": portfolio.get("total_cost", 0),
            "total_value": portfolio.get("total_value", 0),
            "position_count": len(portfolio.get("positions", [])),
        },
        scenario_summary=scenario,
        irr_quantiles=_get(result, "irr_quantiles") or {},
        moic_quantiles=_get(result, "moic_quantiles") or {},
        var_95=_get(result, "var_95"),
        cvar_95=_get(result, "cvar_95"),
        downside_prob=_get(result, "downside_prob_below_threshold"),
        threshold_irr=_get(result, "threshold_irr", 0.1),
        mean_irr=_get(result, "mean_irr"),
        std_irr=_get(result, "std_irr"),
        mean_moic=_get(result, "mean_moic"),
        std_moic=_get(result, "std_moic"),
        n_trials=_get(result, "n_trials"),
        time_to_exit_quantiles=_get(result, "time_to_exit_quantiles") or {},
        timeseries_percentiles=_get(result, "timeseries_percentiles"),
        contagion_top_impacts=contagion_top_impacts or [],
        compute_backend=_get(result, "compute_backend_used") or "numpy",
        runtime_ms=_get(result, "runtime_ms"),
        trials_per_sec=_get(result, "trials_per_sec"),
    )
