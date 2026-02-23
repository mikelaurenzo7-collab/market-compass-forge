"""Web API - auth, portfolios. Calls engine_api for simulations. Never imports engine."""
from uuid import UUID
from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import httpx

from web_api.config import settings
from web_api.database import get_db, engine, Base
from web_api.models import (
    Organization, User, UserOrganization, Portfolio, Position, Company,
    Role, ApiKey, AuditEvent, PortfolioUpload, Deal, DealDocument,
)
from web_api.auth import (
    get_password_hash, verify_password, create_token, get_current_user, get_org_id, get_user_role,
)
from web_api.security.authorization import verify_permission, Permission
from web_api.security.audit import log_event
from web_api.csv_ingestion import parse_csv

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
    if uos:
        log_event(db, str(uos[0].org_id), "user_login", actor_user_id=user.id, metadata={"email": user.email})
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
    verify_permission(user, org_id, Permission.CREATE_PORTFOLIO, db)
    p = Portfolio(org_id=org_id, name=req.name, description=req.description)
    db.add(p)
    db.commit()
    db.refresh(p)
    log_event(db, org_id, "portfolio_created", "portfolio", str(p.id), actor_user_id=user.id)
    return {"id": str(p.id), "name": p.name, "description": p.description, "org_id": str(p.org_id), "position_count": 0, "total_cost": 0, "total_value": 0}


class PortfolioFromCsvRequest(BaseModel):
    name: str
    description: str | None = None
    create_from_upload_id: str | None = None


@app.post("/portfolios/upload-csv")
def upload_portfolio_csv(
    file: UploadFile = File(...),
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.CREATE_PORTFOLIO, db)
    content = file.file.read()
    rows, quality_report = parse_csv(content)
    upload = PortfolioUpload(
        org_id=UUID(org_id),
        filename=file.filename or "upload.csv",
        raw_content=content.decode("utf-8", errors="replace")[:50000],
        parsed_rows=rows,
        quality_report=quality_report,
        status="parsed",
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    log_event(db, org_id, "portfolio_csv_uploaded", "portfolio_upload", str(upload.id), actor_user_id=user.id, metadata={"rows": len(rows)})
    return {"upload_id": str(upload.id), "rows": rows, "quality_report": quality_report}


@app.post("/portfolios/from-csv")
def create_portfolio_from_csv(
    req: PortfolioFromCsvRequest,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.CREATE_PORTFOLIO, db)
    if not req.create_from_upload_id:
        raise HTTPException(400, "create_from_upload_id required")
    org_uuid = UUID(org_id) if isinstance(org_id, str) else org_id
    upload = db.query(PortfolioUpload).filter(
        PortfolioUpload.id == UUID(req.create_from_upload_id),
        PortfolioUpload.org_id == org_uuid,
    ).first()
    if not upload or not upload.parsed_rows:
        raise HTTPException(404, "Upload not found or empty")
    p = Portfolio(org_id=org_uuid, name=req.name, description=req.description)
    db.add(p)
    db.flush()
    for row in upload.parsed_rows:
        c = Company(org_id=p.org_id, name=row.get("company_name", "Unknown"), revenue_growth=row.get("revenue_growth") or 0.1, leverage=row.get("leverage") or 0)
        db.add(c)
        db.flush()
        db.add(Position(portfolio_id=p.id, company_id=c.id, cost_basis=row.get("cost_basis") or 0, current_value=row.get("current_value") or row.get("cost_basis") or 0, expected_exit_years=row.get("expected_exit_years") or 5))
    upload.portfolio_id = p.id
    db.commit()
    db.refresh(p)
    log_event(db, org_id, "portfolio_created_from_csv", "portfolio", str(p.id), actor_user_id=user.id, metadata={"upload_id": req.create_from_upload_id})
    return {"id": str(p.id), "name": p.name, "position_count": len(upload.parsed_rows)}


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


@app.post("/api-keys")
def create_api_key(
    req: dict,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.API_KEYS, db)
    import secrets
    import hashlib
    name = req.get("name", "API Key")
    permission = req.get("permission_level", "analyst")
    raw_key = f"gv_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]
    role = Role.analyst if permission == "analyst" else Role.admin if permission == "admin" else Role.viewer
    ak = ApiKey(org_id=UUID(org_id), name=name, key_hash=key_hash, key_prefix=key_prefix, permission_level=role, created_by=user.id)
    db.add(ak)
    db.commit()
    db.refresh(ak)
    log_event(db, org_id, "api_key_created", "api_key", str(ak.id), actor_user_id=user.id, metadata={"name": name})
    return {"id": str(ak.id), "name": name, "key": raw_key, "key_prefix": key_prefix}


@app.get("/api-keys")
def list_api_keys(
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.API_KEYS, db)
    keys = db.query(ApiKey).filter(ApiKey.org_id == UUID(org_id), ApiKey.revoked_at == None).all()
    return [{"id": str(k.id), "name": k.name, "key_prefix": k.key_prefix, "permission_level": k.permission_level.value, "created_at": k.created_at.isoformat()} for k in keys]


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


@app.get("/audit/events")
def list_audit_events(
    limit: int = 50,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.READ_DASHBOARDS, db)
    org_uuid = UUID(org_id)
    events = db.query(AuditEvent).filter(AuditEvent.org_id == org_uuid).order_by(AuditEvent.created_at.desc()).limit(limit).all()
    return [{"id": str(e.id), "event_type": e.event_type, "entity_type": e.entity_type, "entity_id": e.entity_id, "metadata": e.metadata_json, "created_at": e.created_at.isoformat() if e.created_at else None} for e in events]


class SimulationStartRequestWithRerun(BaseModel):
    portfolio_id: str
    scenario_template_id: str | None = None
    n_trials: int = 10000
    seed: int | None = None
    force_rerun: bool = False


@app.post("/simulations")
def start_simulation(
    req: SimulationStartRequestWithRerun,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.RUN_SIMULATION, db)
    p = db.query(Portfolio).filter(Portfolio.id == req.portfolio_id, Portfolio.org_id == UUID(org_id)).first()
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
                "org_id": org_id,
                "force_rerun": req.force_rerun,
            },
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
    log_event(db, org_id, "simulation_started", "simulation", data.get("simulation_id"), actor_user_id=user.id, metadata={"n_trials": req.n_trials})
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


@app.post("/contagion/simulate")
def run_contagion(
    req: dict,
    user: User = Depends(get_current_user),
):
    with httpx.Client() as client:
        r = client.post(f"{settings.engine_api_url}/v1/contagion/simulate", json=req, timeout=30)
        r.raise_for_status()
        return r.json()


@app.get("/deals")
def list_deals(
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    deals = db.query(Deal).filter(Deal.org_id == UUID(org_id)).all()
    return [{"id": str(d.id), "name": d.name, "deal_size": float(d.deal_size) if d.deal_size else None, "sector": d.sector} for d in deals]


@app.post("/deals")
def create_deal(
    req: dict,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.CREATE_PORTFOLIO, db)
    d = Deal(org_id=UUID(org_id), name=req.get("name", "Deal"), deal_size=req.get("deal_size"), entry_multiple=req.get("entry_multiple"), sector=req.get("sector"))
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": str(d.id), "name": d.name}


@app.post("/deals/{deal_id}/documents")
def upload_deal_document(
    deal_id: UUID,
    file: UploadFile = File(...),
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.CREATE_PORTFOLIO, db)
    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.org_id == UUID(org_id)).first()
    if not deal:
        raise HTTPException(404, "Deal not found")
    content = file.file.read()
    from web_api.doc_extraction import extract_text
    text = extract_text(file.filename or "", content)
    doc = DealDocument(deal_id=deal_id, org_id=UUID(org_id), filename=file.filename or "doc", content_type=file.content_type, extracted_text=text[:100000])
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": str(doc.id), "filename": doc.filename}


@app.get("/deals/{deal_id}/documents")
def list_deal_documents(
    deal_id: UUID,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    docs = db.query(DealDocument).filter(DealDocument.deal_id == deal_id, DealDocument.org_id == UUID(org_id)).all()
    return [{"id": str(d.id), "filename": d.filename} for d in docs]


@app.post("/deal-score")
def score_deal(req: dict, user: User = Depends(get_current_user)):
    with httpx.Client() as client:
        r = client.post(f"{settings.engine_api_url}/v1/deal-score", json=req, timeout=10)
        r.raise_for_status()
        return r.json()


@app.get("/engine/health")
def engine_health(user: User = Depends(get_current_user)):
    with httpx.Client() as client:
        r = client.get(f"{settings.engine_api_url}/health", timeout=5)
        r.raise_for_status()
        return r.json()


@app.get("/benchmarks/latest")
def get_benchmarks(user: User = Depends(get_current_user)):
    with httpx.Client() as client:
        r = client.get(f"{settings.engine_api_url}/v1/benchmarks/latest", timeout=5)
        r.raise_for_status()
        return r.json()


@app.post("/benchmarks/run")
def run_benchmarks(user: User = Depends(get_current_user)):
    with httpx.Client() as client:
        r = client.post(f"{settings.engine_api_url}/v1/benchmarks/run", timeout=10)
        r.raise_for_status()
        return r.json()


@app.post("/demo/run")
def run_demo(user: User = Depends(get_current_user)):
    with httpx.Client() as client:
        r = client.post(f"{settings.engine_api_url}/v1/demo/run", timeout=10)
        r.raise_for_status()
        return r.json()


@app.get("/demo/{demo_id}")
def get_demo_status(demo_id: str, user: User = Depends(get_current_user)):
    with httpx.Client() as client:
        r = client.get(f"{settings.engine_api_url}/v1/demo/{demo_id}", timeout=10)
        r.raise_for_status()
        return r.json()


class ExportTypeRequest(BaseModel):
    type: str


@app.post("/simulations/{simulation_id}/export")
def create_export(
    simulation_id: str,
    req: ExportTypeRequest,
    x_org_id: str | None = Header(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(user, db, x_org_id)
    verify_permission(user, org_id, Permission.DOWNLOAD_EXPORTS, db)
    with httpx.Client() as client:
        r = client.post(f"{settings.engine_api_url}/v1/simulations/{simulation_id}/export", json={"type": req.type}, timeout=30)
        r.raise_for_status()
        return r.json()


@app.get("/exports/{export_id}/download")
def download_export(export_id: str, user: User = Depends(get_current_user)):
    with httpx.Client() as client:
        r = client.get(f"{settings.engine_api_url}/v1/exports/{export_id}/download", timeout=30)
        r.raise_for_status()
        from fastapi.responses import Response
        ct = r.headers.get("content-type", "application/octet-stream")
        cd = r.headers.get("content-disposition", "attachment; filename=simulation_report.pdf")
        return Response(content=r.content, media_type=ct, headers={"Content-Disposition": cd})


@app.get("/health")
@app.get("/healthz")
def health():
    return {"status": "ok", "service": "web-api"}
