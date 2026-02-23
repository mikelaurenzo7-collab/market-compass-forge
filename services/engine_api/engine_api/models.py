"""Engine DB models: jobs, scenario templates."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from engine_api.database import Base


class SimulationJob(Base):
    __tablename__ = "simulation_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(50), default="pending")
    portfolio_input = Column(JSONB, nullable=False)
    scenario_params = Column(JSONB, nullable=False)
    n_trials = Column(Integer, default=10000)
    seed = Column(Integer, nullable=True)
    job_id = Column(String(255), nullable=True)
    results = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    percent_complete = Column(Integer, default=0)
    processed_trials = Column(Integer, default=0)
    total_trials = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScenarioTemplateModel(Base):
    __tablename__ = "scenario_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    params = Column(JSONB, default=dict)


class DemoRun(Base):
    __tablename__ = "demo_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(String(255), nullable=True)
    status = Column(String(50), default="pending")
    params_json = Column(JSONB, default=dict)
    report_json = Column(JSONB, nullable=True)
    job_id = Column(String(255), nullable=True)
    percent_complete = Column(Integer, default=0)
    milestone = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
