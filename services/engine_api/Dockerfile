FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*

COPY engine/ /app/engine/
COPY services/engine_api/requirements.txt /app/services/engine_api/
RUN pip install --no-cache-dir -r /app/services/engine_api/requirements.txt
RUN pip install --no-cache-dir numpy

COPY services/engine_api/ /app/services/engine_api/

ENV PYTHONPATH=/app:/app/engine:/app/services/engine_api
ENV PYTHONUNBUFFERED=1

EXPOSE 8001

CMD ["uvicorn", "engine_api.main:app", "--host", "0.0.0.0", "--port", "8001"]
