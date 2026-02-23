"""Benchmark run task - async execution of run_all."""
from engine_worker.celery_app import celery_app


@celery_app.task(bind=True)
def run_benchmark_task(self):
    from engine.benchmarks.run_all import run_all
    run_all()
    return {"status": "completed"}
