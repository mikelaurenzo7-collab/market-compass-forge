from celery import Celery
from engine_worker.config import settings

celery_app = Celery(
    "grapevine_engine",
    broker=settings.celery_broker_url,
    backend=settings.celery_broker_url,
    include=["engine_worker.tasks", "engine_worker.demo_task", "engine_worker.benchmark_task"],
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)
