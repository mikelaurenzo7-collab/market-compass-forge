"""Engine API - REST wrapper. No auth in MVP."""
import json
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from engine_api.config import settings
from engine_api.database import get_db, engine, Base
from engine_api.seed_templates import ensure_templates
from engine_api.models import SimulationJob, ScenarioTemplateModel, DemoRun

# Import engine library - pure Python, no FastAPI
from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    from engine_api.database import SessionLocal
    db = SessionLocal()
    try:
        ensure_templates(db)
    finally:
        db.close()
    yield

app = FastAPI(title="Grapevine Engine API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# --- Schemas ---

class PortfolioPosition(BaseModel):
    cost_basis: float
    current_value: float
    expected_exit_years: float = 5
    revenue_growth: float = 0.1
    leverage: float = 0


class SimulationRequest(BaseModel):
    portfolio: list[dict]
    scenario_template_id: str | None = None
    scenario_params: dict | None = None
    n_trials: int = 10000
    seed: int | None = None


class SimulationJobResponse(BaseModel):
    job_id: str
    simulation_id: str
    status: str


class SimulationStatusResponse(BaseModel):
    id: str
    status: str
    results: dict | None
    error_message: str | None
    created_at: str
    completed_at: str | None
    percent_complete: int = 0
    processed_trials: int = 0
    total_trials: int = 0


# --- Routes ---

@app.get("/health")
def health():
    backend = os.environ.get("COMPUTE_BACKEND", "numpy")
    torch_dev = os.environ.get("TORCH_DEVICE", "cpu")
    return {"status": "ok", "service": "engine-api", "compute_backend": backend, "torch_device": torch_dev}


@app.get("/v1/scenarios/templates")
def list_scenario_templates(db: Session = Depends(get_db)):
    templates = db.query(ScenarioTemplateModel).all()
    return [{"id": str(t.id), "name": t.name, "slug": t.slug, "description": t.description, "params": t.params} for t in templates]


@app.post("/v1/jobs/simulations", response_model=SimulationJobResponse)
def create_simulation_job(req: SimulationRequest, db: Session = Depends(get_db)):
    total_cost = sum(p.get("cost_basis", 0) or 0 for p in req.portfolio)
    total_value = sum(p.get("current_value", p.get("cost_basis", 0)) or 0 for p in req.portfolio)

    scenario_params = req.scenario_params or {}
    if req.scenario_template_id:
        t = db.query(ScenarioTemplateModel).filter(ScenarioTemplateModel.id == req.scenario_template_id).first()
        if t:
            scenario_params = {**t.params, **(req.scenario_params or {})}

    job = SimulationJob(
        portfolio_input={"positions": req.portfolio, "total_cost": total_cost, "total_value": total_value},
        scenario_params=scenario_params,
        n_trials=req.n_trials,
        seed=req.seed,
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        from celery import Celery
        celery_app = Celery(broker=settings.celery_broker_url)
        task = celery_app.send_task("engine_worker.tasks.run_simulation_task", args=[str(job.id)])
        job.job_id = task.id
        db.commit()
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        db.commit()

    return SimulationJobResponse(
        job_id=job.job_id or "",
        simulation_id=str(job.id),
        status=job.status,
    )


@app.get("/v1/jobs/simulations/{simulation_id}", response_model=SimulationStatusResponse)
def get_simulation_job(simulation_id: str, db: Session = Depends(get_db)):
    job = db.query(SimulationJob).filter(SimulationJob.id == simulation_id).first()
    if not job:
        raise HTTPException(404, "Simulation not found")
    return SimulationStatusResponse(
        id=str(job.id),
        status=job.status,
        results=job.results,
        error_message=job.error_message,
        created_at=job.created_at.isoformat() if job.created_at else "",
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
        percent_complete=getattr(job, "percent_complete", 0) or 0,
        processed_trials=getattr(job, "processed_trials", 0) or 0,
        total_trials=getattr(job, "total_trials", 0) or job.n_trials or 0,
    )


# --- Contagion ---

class ContagionRequest(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    shocked_nodes: list[str]
    shock_size: float = 1.0
    decay: float = 0.5
    steps: int = 5


@app.post("/v1/contagion/simulate")
def run_contagion_simulation(req: ContagionRequest):
    from engine.graph.in_memory_graph import InMemoryGraph
    from engine.graph.contagion import GraphSimulationEngine

    g = InMemoryGraph()
    for n in req.nodes:
        g.add_node(n.get("id", ""), n.get("label", ""), n.get("type", "default"))
    for e in req.edges:
        g.add_edge(e["source"], e["target"], e.get("weight", 1.0), e.get("type", "default"))
    engine = GraphSimulationEngine()
    result = engine.simulate_liquidity_shock(
        g, set(req.shocked_nodes), req.shock_size, req.decay, req.steps
    )
    return {
        "per_node_risk": result.per_node_risk,
        "top_impacted_nodes": [{"node_id": n, "risk": r} for n, r in result.top_impacted_nodes],
        "total_risk": result.total_risk,
        "num_impacted": result.num_impacted,
    }


# --- Deal Scoring ---

class DealScoreRequest(BaseModel):
    deal_size: float | None = None
    entry_multiple: float | None = None
    revenue_growth: float | None = None
    leverage: float | None = None
    hold_period_years: float | None = None
    sector: str | None = None


@app.post("/v1/deal-score")
def score_deal(req: DealScoreRequest):
    from engine.scoring.inference import PyTorchModelScorer

    deal = {
        "deal_size": req.deal_size or 10,
        "entry_multiple": req.entry_multiple or 8,
        "revenue_growth": req.revenue_growth or 0.15,
        "leverage": req.leverage or 0.5,
        "hold_period_years": req.hold_period_years or 5,
        "sector": req.sector or "",
    }
    scorer = PyTorchModelScorer()
    return scorer.score(deal)


@app.get("/v1/benchmarks/latest")
def get_latest_benchmark():
    bench_path = Path(__file__).resolve().parent.parent.parent / "engine" / "benchmarks" / "results" / "latest.json"
    if not bench_path.exists():
        return {"benchmarks": {}, "message": "Run engine/benchmarks/run_all.py or POST /v1/benchmarks/run first"}
    return json.loads(bench_path.read_text())


class BenchmarkRunResponse(BaseModel):
    job_id: str
    status: str


@app.post("/v1/benchmarks/run", response_model=BenchmarkRunResponse)
def run_benchmarks():
    try:
        from celery import Celery
        celery_app = Celery(broker=settings.celery_broker_url)
        task = celery_app.send_task("engine_worker.benchmark_task.run_benchmark_task")
        return BenchmarkRunResponse(job_id=task.id or "", status="queued")
    except Exception as e:
        raise HTTPException(500, str(e))


# --- Demo Run ---

class DemoRunResponse(BaseModel):
    demo_id: str
    job_id: str
    status: str


class DemoStatusResponse(BaseModel):
    id: str
    status: str
    percent_complete: int
    milestone: str | None
    report: dict | None
    created_at: str
    completed_at: str | None


@app.post("/v1/demo/run", response_model=DemoRunResponse)
def run_demo(db: Session = Depends(get_db)):
    run = DemoRun(status="pending", params_json={})
    db.add(run)
    db.commit()
    db.refresh(run)
    try:
        from celery import Celery
        celery_app = Celery(broker=settings.celery_broker_url)
        task = celery_app.send_task("engine_worker.demo_task.run_demo_task", args=[str(run.id)])
        run.job_id = task.id
        db.commit()
    except Exception as e:
        run.status = "failed"
        run.milestone = str(e)
        db.commit()
    return DemoRunResponse(demo_id=str(run.id), job_id=run.job_id or "", status=run.status)


@app.get("/v1/demo/{demo_id}", response_model=DemoStatusResponse)
def get_demo_status(demo_id: str, db: Session = Depends(get_db)):
    run = db.query(DemoRun).filter(DemoRun.id == demo_id).first()
    if not run:
        raise HTTPException(404, "Demo run not found")
    return DemoStatusResponse(
        id=str(run.id),
        status=run.status,
        percent_complete=run.percent_complete or 0,
        milestone=run.milestone,
        report=run.report_json,
        created_at=run.created_at.isoformat() if run.created_at else "",
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
    )


@app.post("/v1/models/train")
def train_deal_model():
    from engine.scoring.train import train_model
    import random
    X = [{"deal_size": 10 + i * 5, "entry_multiple": 7 + i % 3, "revenue_growth": 0.1 + i * 0.02, "leverage": 0.3 + i * 0.1, "hold_period_years": 5, "sector": ["tech", "healthcare", "financials"][i % 3]} for i in range(100)]
    y = [1 if random.random() < 0.6 else 0 for _ in range(100)]
    metrics = train_model(X, y, epochs=30)
    return {"status": "completed", "metrics": metrics}
