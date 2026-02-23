#!/bin/bash
# Replit startup: runs web + APIs. Replit provides DATABASE_URL.
# Use this as the Run command or in a Workflow.
set -e
cd "$(dirname "$0")/.."

echo "=== Grapevine Replit Startup ==="

# 1. Ensure databases exist (Replit Postgres)
BASE_DB_URL="${DATABASE_URL:-}"
if [ -n "$BASE_DB_URL" ]; then
  echo "DATABASE_URL set. Creating databases if needed..."
  python3 scripts/replit-init-db.py 2>/dev/null || true
else
  echo "No DATABASE_URL - add PostgreSQL in Replit Tools. Using web-only mode."
fi

# 2. Start Redis in background if available (for Celery)
if command -v redis-server &>/dev/null; then
  redis-server --daemonize yes 2>/dev/null || true
  export CELERY_BROKER_URL="${CELERY_BROKER_URL:-redis://localhost:6379/1}"
else
  export CELERY_BROKER_URL=""
  echo "Redis not found - simulations will run synchronously"
fi

# 3. Install deps if needed
[ -d "node_modules" ] || npm install
[ -d "apps/web/node_modules" ] || (cd apps/web && npm install)
[ -d "packages/shared/dist" ] || (cd packages/shared && npm run build 2>/dev/null || true)

# 4. Start web_api (Python) - use grapevine_web
if [ -n "$BASE_DB_URL" ]; then
  WEB_DB="${BASE_DB_URL%/postgres}/grapevine_web"
  ENG_DB="${BASE_DB_URL%/postgres}/grapevine_engine"
  echo "Starting web_api on :8000..."
  (cd services/web_api && DATABASE_URL="$WEB_DB" python -m uvicorn web_api.main:app --host 0.0.0.0 --port 8000) &

  echo "Starting engine_api on :8001..."
  (cd services/engine_api && DATABASE_URL="$ENG_DB" CELERY_BROKER_URL="${CELERY_BROKER_URL:-}" python -m uvicorn engine_api.main:app --host 0.0.0.0 --port 8001) &

  if [ -n "$CELERY_BROKER_URL" ]; then
    echo "Starting engine_worker..."
    (cd services/engine_worker && DATABASE_URL="$ENG_DB" celery -A engine_worker.celery_app worker -l info) &
  fi
  sleep 4
else
  echo "Skipping APIs (no DATABASE_URL). Web app will show connection errors."
  sleep 1
fi

# 7. Seed if APIs running
if [ -n "$BASE_DB_URL" ]; then
  curl -sf http://localhost:8000/health >/dev/null 2>&1 && \
    (curl -sf -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" \
      -d '{"email":"demo@grapevine.io","password":"demo123","org_name":"Acme"}' 2>/dev/null || true) || true
fi

# 8. Start web (Next.js) - foreground
echo ""
echo "=== Starting Web App ==="
echo "Web: http://localhost:3000"
echo "API: http://localhost:8000"
echo "Engine: http://localhost:8001"
echo "Login: demo@grapevine.io / demo123"
echo ""
cd apps/web && npm run dev
