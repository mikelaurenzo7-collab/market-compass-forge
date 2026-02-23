# Grapevine Architecture

## Separation: Engine vs Website

| Layer | Path | Responsibility |
|-------|------|-----------------|
| **Engine** | `engine/` | Pure Python compute. Simulation, graph, scoring. No HTTP, no DB, no UI. |
| **Engine API** | `services/engine_api/` | REST wrapper. Persistence, job orchestration. Calls engine. |
| **Engine Worker** | `services/engine_worker/` | Celery. Async simulation execution. Calls engine. |
| **Web API** | `services/web_api/` | Auth, orgs, portfolios, proxy to engine_api. |
| **Website** | `apps/web/` | Next.js UI. Calls web_api only. No compute logic. |
| **Shared** | `packages/shared/` | TypeScript API client. Used by web. |

## Data Flow

```
User → Website (Next.js) → Web API → Engine API → Engine (Python)
                    ↓                    ↓
              Auth, Portfolios      Simulations, Contagion, Scoring
```

## Import-Friendly Structure

For Replit, CodeSandbox, or other platforms:

- **Web-only**: `apps/web` is self-contained. Needs `NEXT_PUBLIC_API_URL`.
- **Engine-only**: `engine/` is a pure Python package. `pip install -e engine/`.
- **Full stack**: Run web_api, engine_api, web. Optionally engine_worker (needs Redis).

## Boundaries

- Engine must NOT import: FastAPI, Celery, React, Next.js, SQLAlchemy
- Website must NOT import: numpy, torch, engine
- Run `python tools/boundary_check.py` to verify
