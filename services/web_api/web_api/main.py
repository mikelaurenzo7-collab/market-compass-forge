"""Web API - auth, portfolios. Calls engine_api for simulations. Never imports engine."""
from uuid import UUID
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import httpx

from web_api.config import settings
from web_api.database import get_db, engine, Base
from web_api.models import (
    Organization, User, UserOrganization, Portfolio, Position, Company,
    Role,
)
from web_api.auth import (
    get_password_hash, verify_password, create_token, get_current_user, get_org_id,
)

app = FastAPI(title="Grapevine Web API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


# --- Auth ---

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    org_name: str = "Default Organization"


@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    uos = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    orgs = [{"id": str(uo.org_id), "role": uo.role.value} for uo in uos]
    token = create_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user_id": str(user.id), "email": user.email, "orgs": orgs}


@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")
    org = Organization(name=req.org_name)
    db.add(org)
    db.flush()
    user = User(email=req.email, hashed_password=get_password_hash(req.password), full_name=req.full_name)
    db.add(user)
    db.flush()
    uo = UserOrganization(user_id=user.id, org_id=org.id, role=Role.admin)
    db.add(uo)
    db.commit()
    db.refresh(org)
    db.refresh(user)
    token = create_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user_id": str(user.id), "email": user.email, "orgs": [{"id": str(org.id), "role": "admin"}]}


# --- Portfolios ---

class PortfolioCreate(BaseModel):
    name: str
    description: str | None = None


class PositionCreate(BaseModel):
    company_id: str
    cost_basis: float
    current_value: float | None = None
    expected_exit_years: float = 5


@app.get("/portfolios")
def list_portfolios(
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    portfolios = db.query(Portfolio).filter(Portfolio.org_id == org_id).all()
    result = []
    for p in portfolios:
        total_cost = sum(pos.cost_basis or 0 for pos in p.positions)
        total_value = sum(pos.current_value or pos.cost_basis or 0 for pos in p.positions)
        result.append({
            "id": str(p.id), "name": p.name, "description": p.description, "org_id": str(p.org_id),
            "position_count": len(p.positions), "total_cost": float(total_cost), "total_value": float(total_value),
        })
    return result


@app.post("/portfolios")
def create_portfolio(
    req: PortfolioCreate,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    p = Portfolio(org_id=org_id, name=req.name, description=req.description)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": str(p.id), "name": p.name, "description": p.description, "org_id": str(p.org_id), "position_count": 0, "total_cost": 0, "total_value": 0}


@app.get("/portfolios/{portfolio_id}")
def get_portfolio(
    portfolio_id: UUID,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    p = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.org_id == org_id).first()
    if not p:
        raise HTTPException(404, "Portfolio not found")
    positions = []
    for pos in p.positions:
        c = pos.company
        positions.append({
            "id": str(pos.id), "company_id": str(pos.company_id), "company_name": c.name if c else None,
            "cost_basis": float(pos.cost_basis), "current_value": float(pos.current_value or pos.cost_basis),
            "expected_exit_years": float(pos.expected_exit_years or 5),
            "revenue_growth": float(c.revenue_growth or 0.1) if c else 0.1,
            "leverage": float(c.leverage or 0) if c else 0,
        })
    total_cost = sum(pos.cost_basis or 0 for pos in p.positions)
    total_value = sum(pos.current_value or pos.cost_basis or 0 for pos in p.positions)
    return {"id": str(p.id), "name": p.name, "description": p.description, "org_id": str(p.org_id), "positions": positions, "total_cost": float(total_cost), "total_value": float(total_value)}


@app.post("/portfolios/{portfolio_id}/positions")
def add_position(
    portfolio_id: UUID,
    req: PositionCreate,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    p = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.org_id == org_id).first()
    if not p:
        raise HTTPException(404, "Portfolio not found")
    c = db.query(Company).filter(Company.id == req.company_id, Company.org_id == org_id).first()
    if not c:
        raise HTTPException(404, "Company not found")
    pos = Position(portfolio_id=portfolio_id, company_id=req.company_id, cost_basis=req.cost_basis, current_value=req.current_value or req.cost_basis, expected_exit_years=req.expected_exit_years)
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return {"id": str(pos.id), "company_id": str(pos.company_id)}


class CompanyCreate(BaseModel):
    name: str


@app.post("/companies")
def create_company(
    req: CompanyCreate,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    c = Company(org_id=org_id, name=req.name)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": str(c.id), "name": c.name}


@app.get("/companies")
def list_companies(
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    companies = db.query(Company).filter(Company.org_id == org_id).all()
    return [{"id": str(c.id), "name": c.name} for c in companies]


# --- Simulation proxy to engine_api ---

class SimulationStartRequest(BaseModel):
    portfolio_id: str
    scenario_template_id: str | None = None
    n_trials: int = 10000
    seed: int | None = None


@app.post("/simulations")
def start_simulation(
    req: SimulationStartRequest,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    p = db.query(Portfolio).filter(Portfolio.id == req.portfolio_id, Portfolio.org_id == org_id).first()
    if not p:
        raise HTTPException(404, "Portfolio not found")
    portfolio_data = []
    for pos in p.positions:
        c = pos.company
        portfolio_data.append({
            "cost_basis": float(pos.cost_basis),
            "current_value": float(pos.current_value or pos.cost_basis),
            "expected_exit_years": float(pos.expected_exit_years or 5),
            "revenue_growth": float(c.revenue_growth or 0.1) if c else 0.1,
            "leverage": float(c.leverage or 0) if c else 0,
        })
    with httpx.Client() as client:
        r = client.post(
            f"{settings.engine_api_url}/v1/jobs/simulations",
            json={
                "portfolio": portfolio_data,
                "scenario_template_id": req.scenario_template_id,
                "n_trials": req.n_trials,
                "seed": req.seed,
            },
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return {"simulation_id": data["simulation_id"], "job_id": data["job_id"], "status": data["status"]}


@app.get("/simulations/{simulation_id}")
def get_simulation(
    simulation_id: str,
    user: User = Depends(get_current_user),
):
    with httpx.Client() as client:
        r = client.get(f"{settings.engine_api_url}/v1/jobs/simulations/{simulation_id}", timeout=10)
        r.raise_for_status()
        return r.json()


@app.get("/simulations/templates/list")
def list_scenario_templates(user: User = Depends(get_current_user)):
    with httpx.Client() as client:
        r = client.get(f"{settings.engine_api_url}/v1/scenarios/templates", timeout=10)
        r.raise_for_status()
        return r.json()


@app.get("/health")
def health():
    return {"status": "ok", "service": "web-api"}
