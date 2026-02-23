#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== Grapevine Dev Setup ==="
echo "Building..."
docker compose build

echo "Starting services..."
docker compose up -d

echo "Waiting for services to be healthy..."
for i in {1..60}; do
  if curl -sf http://localhost:8001/health >/dev/null 2>&1 && curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    echo "Services ready."
    break
  fi
  sleep 2
  if [ $i -eq 60 ]; then
    echo "Timeout waiting for services"
    exit 1
  fi
done

echo "Seeding data..."
docker compose run --rm web_api python -m web_api.seed

echo ""
echo "=== Ready ==="
echo "Web:       http://localhost:3000"
echo "Web API:   http://localhost:8000"
echo "Engine API: http://localhost:8001"
echo ""
echo "Login: demo@grapevine.io / demo123"
echo ""
