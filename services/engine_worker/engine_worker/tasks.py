"""Celery tasks - run engine simulation with chunked execution + progress."""
# Import demo task so Celery discovers it
from engine_worker.demo_task import run_demo_task  # noqa: F401
from datetime import datetime
from uuid import UUID

from engine_worker.celery_app import celery_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams, SimulationResult
from engine_api.models import SimulationJob
from engine_api.config import settings as api_settings

engine = create_engine(api_settings.database_url)
SessionLocal = sessionmaker(bind=engine)

CHUNK_SIZE = int(getattr(api_settings, "simulation_chunk_size", 20000))


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


@celery_app.task(bind=True)
def run_simulation_task(self, simulation_id: str):
    db = SessionLocal()
    job = None
    try:
        job = db.query(SimulationJob).filter(SimulationJob.id == UUID(simulation_id)).first()
        if not job:
            return {"error": "Job not found"}
        job.status = "running"
        job.total_trials = job.n_trials or 10000
        db.commit()

        pi = job.portfolio_input
        portfolio = PortfolioInput(
            positions=pi.get("positions", []),
            total_cost=pi.get("total_cost", 0),
            total_value=pi.get("total_value", 0),
        )
        sp = job.scenario_params or {}
        scenario = _build_scenario(sp)
        n_trials = job.n_trials or 10000

        sim_engine = SimulationEngine()
        chunk_results: list[SimulationResult] = []
        n_chunks = (n_trials + CHUNK_SIZE - 1) // CHUNK_SIZE

        for chunk_idx in range(n_chunks):
            start = chunk_idx * CHUNK_SIZE
            chunk_trials = min(CHUNK_SIZE, n_trials - start)
            chunk_seed = (job.seed + chunk_idx) if job.seed is not None else None
            result = sim_engine.run(
                portfolio=portfolio,
                scenario=scenario,
                n_trials=chunk_trials,
                seed=chunk_seed,
                return_samples=True,
            )
            chunk_results.append(result)
            job.processed_trials = start + chunk_trials
            job.percent_complete = int(100 * job.processed_trials / n_trials)
            job.updated_at = datetime.utcnow()
            db.commit()

        result = SimulationEngine.aggregate_chunk_results(chunk_results)

        job.status = "completed"
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
            "compute_backend_used": getattr(result, "compute_backend_used", "numpy"),
            "torch_device_used": getattr(result, "torch_device_used", "cpu"),
            "runtime_ms": getattr(result, "runtime_ms", 0),
            "trials_per_sec": getattr(result, "trials_per_sec", 0),
        }
        job.percent_complete = 100
        job.processed_trials = n_trials
        job.completed_at = datetime.utcnow()
        db.commit()
        return {"status": "completed"}
    except Exception as e:
        if job:
            job.status = "failed"
            job.error_message = str(e)
            db.commit()
        raise
    finally:
        db.close()
