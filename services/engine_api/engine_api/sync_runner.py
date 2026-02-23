"""Synchronous simulation runner - used when Celery/Redis unavailable (e.g. Replit)."""
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams
from engine_api.models import SimulationJob


def _build_scenario(sp: dict) -> ScenarioParams:
    return ScenarioParams(
        rates_delta_bps=sp.get("rates_delta_bps", 0),
        gdp_delta=sp.get("gdp_delta", 0),
        multiple_compression=sp.get("multiple_compression", 0),
        exit_delay_years=sp.get("exit_delay_years", 0),
        sector_overrides=sp.get("sector_overrides", {}),
        correlation_matrix=sp.get("correlation_matrix"),
        student_t_df=sp.get("student_t_df"),
        p_crisis=sp.get("p_crisis", 0),
        crisis_vol_mult=sp.get("crisis_vol_mult", 1.5),
        crisis_multiple_compression_extra=sp.get("crisis_multiple_compression_extra", -0.1),
        exit_horizon_lognormal=tuple(sp["exit_horizon_lognormal"]) if isinstance(sp.get("exit_horizon_lognormal"), (list, tuple)) else None,
    )


def run_simulation_sync(simulation_id: str, db: Session) -> bool:
    """Run simulation synchronously. Returns True if successful."""
    job = db.query(SimulationJob).filter(SimulationJob.id == UUID(simulation_id)).first()
    if not job:
        return False
    job.status = "running"
    job.total_trials = job.n_trials or 10000
    db.commit()

    try:
        pi = job.portfolio_input or {}
        portfolio = PortfolioInput(
            positions=pi.get("positions", []),
            total_cost=pi.get("total_cost", 0),
            total_value=pi.get("total_value", 0),
        )
        sp = job.scenario_params or {}
        scenario = _build_scenario(sp)
        n_trials = job.n_trials or 10000

        sim_engine = SimulationEngine()
        result = sim_engine.run(
            portfolio=portfolio,
            scenario=scenario,
            n_trials=n_trials,
            seed=job.seed,
            return_samples=False,
        )

        job.results = {
            "irr_quantiles": result.irr_quantiles,
            "moic_quantiles": result.moic_quantiles,
            "time_to_exit_quantiles": result.time_to_exit_quantiles,
            "var_95": result.var_95,
            "cvar_95": result.cvar_95,
            "downside_prob_below_threshold": result.downside_prob_below_threshold,
            "threshold_irr": result.threshold_irr,
            "mean_irr": result.mean_irr,
            "std_irr": result.std_irr,
            "mean_moic": result.mean_moic,
            "std_moic": result.std_moic,
            "drawdown_proxy": result.drawdown_proxy,
            "exposure_by_sector": result.exposure_by_sector,
            "n_trials": result.n_trials,
            "compute_backend_used": result.compute_backend_used,
            "torch_device_used": result.torch_device_used,
            "runtime_ms": result.runtime_ms,
            "trials_per_sec": result.trials_per_sec,
        }
        job.status = "completed"
        job.processed_trials = n_trials
        job.percent_complete = 100
        job.completed_at = datetime.utcnow()
        db.commit()
        return True
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()
        return False
