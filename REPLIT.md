# Grapevine on Replit

Import this repo to Replit for a quick demo. The project is organized for easy import.

## Repo Structure (Engine vs Website)

| Path | Purpose |
|------|---------|
| **`/engine`** | Pure Python compute library (simulation, graph, scoring). No web/UI. |
| **`/apps/web`** | Next.js website. UX only. Calls APIs via typed client. |
| **`/services/engine_api`** | FastAPI wrapper for engine. Simulations, contagion, deal scoring. |
| **`/services/web_api`** | FastAPI for auth, portfolios, proxies to engine_api. |
| **`/services/engine_worker`** | Celery worker (optional; needs Redis). |
| **`/packages/shared`** | TypeScript API client used by web. |

## Quick Start on Replit

1. **Import**: Use [replit.com/import](https://replit.com/import) or `https://replit.com/github.com/YOUR_ORG/YOUR_REPO`

2. **Add PostgreSQL**: In Replit, open **Tools → Database** and add PostgreSQL. Replit sets `DATABASE_URL`.

3. **Run**: Click **Run**. The default command starts web + APIs.  
   - Web: http://localhost:3000  
   - Web API: http://localhost:8000  
   - Engine API: http://localhost:8001  

4. **Login**: demo@grapevine.io / demo123 (auto-seeded on first run)

## Run Modes

- **Full stack** (with `DATABASE_URL`): Web + web_api + engine_api. Simulations run synchronously when Redis is unavailable.
- **Web only** (no `DATABASE_URL`): Next.js only. UI loads but API calls will fail until you add a database.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (for APIs) | Replit sets this when you add PostgreSQL |
| `CELERY_BROKER_URL` | No | Redis URL. If empty, simulations run synchronously |
| `NEXT_PUBLIC_API_URL` | No | Default: http://localhost:8000 |

## Workflows (Optional)

For finer control, create a **Replit Workflow** with parallel tasks:

1. **web_api**: `cd services/web_api && uvicorn web_api.main:app --host 0.0.0.0 --port 8000`
2. **engine_api**: `cd services/engine_api && uvicorn engine_api.main:app --host 0.0.0.0 --port 8001`
3. **web**: `cd apps/web && npm run dev`

Set `DATABASE_URL` and `WEB_DB`/`ENG_DB` per task if needed.

## Local Development (Docker)

For full stack with Postgres, Redis, and Celery:

```bash
docker compose up --build
make seed
# Web: http://localhost:3000
```

## Troubleshooting

- **"Module not found"**: Run `npm install` at repo root, then `cd packages/shared && npm run build`
- **API connection refused**: Ensure PostgreSQL is added and `DATABASE_URL` is set. Restart the Replit.
- **Simulations slow**: Without Redis, simulations run in the API process. Use small trials (e.g. 5000) for quick demos.
