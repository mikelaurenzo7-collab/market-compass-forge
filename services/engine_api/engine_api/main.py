"""Engine API - REST wrapper. No auth in MVP."""
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from engine_api.config import settings
from engine_api.database import get_db, engine, Base
from engine_api.seed_templates import ensure_templates
from engine_api.models import SimulationJob, ScenarioTemplateModel

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


# --- Routes ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "engine-api"}


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
    )
