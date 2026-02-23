"""Celery tasks - run engine simulation."""
from datetime import datetime
from uuid import UUID

from engine_worker.celery_app import celery_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams
from engine_api.models import SimulationJob
from engine_api.config import settings as api_settings

engine = create_engine(api_settings.database_url)
SessionLocal = sessionmaker(bind=engine)


@celery_app.task(bind=True)
def run_simulation_task(self, simulation_id: str):
    db = SessionLocal()
    try:
        job = db.query(SimulationJob).filter(SimulationJob.id == UUID(simulation_id)).first()
        if not job:
            return {"error": "Job not found"}
        job.status = "running"
        db.commit()

        pi = job.portfolio_input
        portfolio = PortfolioInput(
            positions=pi.get("positions", []),
            total_cost=pi.get("total_cost", 0),
            total_value=pi.get("total_value", 0),
        )
        sp = job.scenario_params or {}
        scenario = ScenarioParams(
            rates_delta_bps=sp.get("rates_delta_bps", 0),
            gdp_delta=sp.get("gdp_delta", 0),
            multiple_compression=sp.get("multiple_compression", 0),
            exit_delay_years=sp.get("exit_delay_years", 0),
            sector_overrides=sp.get("sector_overrides", {}),
        )

        sim_engine = SimulationEngine()
        result = sim_engine.run(
            portfolio=portfolio,
            scenario=scenario,
            n_trials=job.n_trials or 10000,
            seed=job.seed,
        )

        job.status = "completed"
        job.results = {
            "irr_distribution": result.irr_distribution[:1000],
            "moic_distribution": result.moic_distribution[:1000],
            "time_to_exit_distribution": result.time_to_exit_distribution[:1000],
            "var_95": result.var_95,
            "cvar_95": result.cvar_95,
            "downside_prob_below_threshold": result.downside_prob_below_threshold,
            "threshold_irr": result.threshold_irr,
            "mean_irr": result.mean_irr,
            "median_irr": result.median_irr,
            "mean_moic": result.mean_moic,
            "median_moic": result.median_moic,
            "n_trials": result.n_trials,
        }
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
