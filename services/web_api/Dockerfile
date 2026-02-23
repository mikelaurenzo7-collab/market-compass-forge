FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY services/web_api/requirements.txt /app/services/web_api/
RUN pip install --no-cache-dir -r /app/services/web_api/requirements.txt

COPY services/web_api/ /app/services/web_api/

ENV PYTHONPATH=/app:/app/services/web_api
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "web_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
