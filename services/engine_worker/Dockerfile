FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY engine/ /app/engine/
COPY services/engine_api/requirements.txt /app/services/engine_api/
COPY services/engine_worker/requirements.txt /app/services/engine_worker/
RUN pip install --no-cache-dir -r /app/services/engine_api/requirements.txt
RUN pip install --no-cache-dir -r /app/services/engine_worker/requirements.txt
RUN pip install --no-cache-dir numpy

COPY services/engine_api/ /app/services/engine_api/
COPY services/engine_worker/ /app/services/engine_worker/

ENV PYTHONPATH=/app:/app/engine:/app/services/engine_api:/app/services/engine_worker
ENV PYTHONUNBUFFERED=1

CMD ["celery", "-A", "engine_worker.celery_app", "worker", "-l", "info"]
