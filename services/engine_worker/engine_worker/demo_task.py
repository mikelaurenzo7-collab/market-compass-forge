"""Demo run task - orchestrated NVIDIA proof workflow."""
from datetime import datetime
from uuid import UUID

from engine_worker.celery_app import celery_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams
from engine.graph.in_memory_graph import InMemoryGraph
from engine.graph.contagion import GraphSimulationEngine, MitigationAction
from engine.scoring.inference import PyTorchModelScorer
from engine.utils.hardware import get_hardware_info
from engine_api.models import DemoRun
from engine_api.config import settings as api_settings

engine = create_engine(api_settings.database_url)
SessionLocal = sessionmaker(bind=engine)


def _seeded_portfolio():
    positions = [
        {"cost_basis": 10, "current_value": 12, "expected_exit_years": 5, "revenue_growth": 0.15, "leverage": 0.3, "sector": "tech"},
        {"cost_basis": 20, "current_value": 22, "expected_exit_years": 4, "revenue_growth": 0.12, "leverage": 0.4, "sector": "healthcare"},
        {"cost_basis": 15, "current_value": 16, "expected_exit_years": 6, "revenue_growth": 0.18, "leverage": 0.2, "sector": "financials"},
    ]
    total_cost = sum(p["cost_basis"] for p in positions)
    total_value = sum(p["current_value"] for p in positions)
    return PortfolioInput(positions=positions, total_cost=total_cost, total_value=total_value)


def _seeded_scenario():
    return ScenarioParams(
        gdp_delta=-0.05,
        multiple_compression=-0.1,
        exit_delay_years=0.5,
        correlation_matrix=[[1, 0.3, 0.2], [0.3, 1, 0.25], [0.2, 0.25, 1]],
        p_crisis=0.15,
        crisis_vol_mult=1.5,
        crisis_multiple_compression_extra=-0.1,
    )


def _seeded_graph():
    g = InMemoryGraph()
    for i, nid in enumerate(["a", "b", "c", "d", "e"]):
        g.add_node(nid, nid, "node")
    g.add_edge("a", "b", 1.0)
    g.add_edge("b", "c", 1.0)
    g.add_edge("a", "c", 0.5)
    g.add_edge("c", "d", 1.0)
    g.add_edge("d", "e", 1.0)
    return g


def _seeded_deals():
    return [
        {"deal_size": 25, "entry_multiple": 8, "revenue_growth": 0.15, "leverage": 0.4, "hold_period_years": 5, "sector": "tech"},
        {"deal_size": 15, "entry_multiple": 7, "revenue_growth": 0.12, "leverage": 0.3, "hold_period_years": 4, "sector": "healthcare"},
        {"deal_size": 30, "entry_multiple": 9, "revenue_growth": 0.18, "leverage": 0.5, "hold_period_years": 6, "sector": "financials"},
    ]


@celery_app.task(bind=True)
def run_demo_task(self, demo_id: str):
    db = SessionLocal()
    run = None
    try:
        run = db.query(DemoRun).filter(DemoRun.id == UUID(demo_id)).first()
        if not run:
            return {"error": "Demo run not found"}
        run.status = "running"
        run.milestone = "Starting"
        run.percent_complete = 0
        db.commit()

        run.milestone = "Seeded data verified"
        run.percent_complete = 10
        db.commit()

        portfolio = _seeded_portfolio()
        scenario = _seeded_scenario()
        sim_engine = SimulationEngine()
        result = sim_engine.run_with_timeline(
            portfolio=portfolio,
            scenario=scenario,
            n_trials=100000,
            months=60,
            seed=42,
        )
        run.milestone = "Simulation complete"
        run.percent_complete = 40
        db.commit()

        g = _seeded_graph()
        contagion_engine = GraphSimulationEngine()
        contagion_result = contagion_engine.simulate_with_mitigation(
            g, {"a"}, MitigationAction(edge_reduction={("a", "b"): 0.5}),
            shock_size=1.0, decay=0.5, steps=5,
        )
        run.milestone = "Contagion baseline complete"
        run.percent_complete = 70
        db.commit()

        run.milestone = "Contagion mitigation complete"
        run.percent_complete = 85
        db.commit()

        scorer = PyTorchModelScorer()
        deal_scores = [scorer.score(d) for d in _seeded_deals()]
        run.milestone = "Deal scoring complete"
        run.percent_complete = 95
        db.commit()

        hw = get_hardware_info()
        report = {
            "simulation": {
                "irr_quantiles": result.irr_quantiles,
                "moic_quantiles": result.moic_quantiles,
                "var_95": result.var_95,
                "cvar_95": result.cvar_95,
                "n_trials": result.n_trials,
                "compute_backend_used": result.compute_backend_used,
                "torch_device_used": result.torch_device_used,
                "runtime_ms": result.runtime_ms,
                "trials_per_sec": result.trials_per_sec,
                "timeseries_percentiles": result.timeseries_percentiles,
            },
            "contagion_baseline": {
                "total_risk": contagion_result.baseline.total_risk,
                "top_impacted": [{"node_id": n, "risk": r} for n, r in contagion_result.baseline.top_impacted_nodes],
            },
            "contagion_mitigated": {
                "total_risk": contagion_result.mitigated.total_risk,
                "top_impacted": [{"node_id": n, "risk": r} for n, r in contagion_result.mitigated.top_impacted_nodes],
            },
            "contagion_delta": {
                "total_risk_delta": contagion_result.total_risk_delta,
            },
            "deal_scores": deal_scores,
            "hardware": hw,
        }
        run.report_json = report
        run.status = "completed"
        run.percent_complete = 100
        run.milestone = "Report assembled"
        run.completed_at = datetime.utcnow()
        db.commit()
        return {"status": "completed"}
    except Exception as e:
        if run:
            run.status = "failed"
            run.milestone = str(e)
            db.commit()
        raise
    finally:
        db.close()
