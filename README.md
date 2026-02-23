# Grapevine - Split Architecture

Two distinct products with strict boundaries:

## 1. Grapevine Engine (compute backend)
- **Purpose**: Monte Carlo simulation, scenario evaluation, graph analytics, deal scoring
- **Structure**:
  - `/engine` - Pure Python library (no FastAPI in core logic)
  - `/services/engine_api` - FastAPI REST wrapper
  - `/services/engine_worker` - Celery workers

## 2. Grapevine Web (product UI)
- **Purpose**: Multi-tenant institutional web app
- **Structure**: `/apps/web` - Next.js + TypeScript + Tailwind
- **Owns**: Auth, orgs, RBAC, portfolios CRUD, job monitoring UI
- **Never imports** the engine package. Talks to engine via APIs only.

## File Tree

```
grapevine/
├── engine/                    # Pure Python library
│   ├── engine/
│   │   ├── simulation.py      # SimulationEngine
│   │   ├── scenarios.py       # Scenario, ScenarioTemplate
│   │   ├── graph.py           # GraphRepository interface
│   │   └── scoring.py         # ModelScorer, ModelTrainer
│   └── tests/
├── services/
│   ├── engine_api/            # FastAPI wrapper
│   │   ├── engine_api/
│   │   └── Dockerfile
│   ├── engine_worker/         # Celery workers
│   │   ├── engine_worker/
│   │   └── Dockerfile
│   └── web_api/               # Auth, portfolios, proxies to engine
│       ├── web_api/
│       └── Dockerfile
├── apps/
│   └── web/                   # Next.js frontend
├── packages/
│   └── shared/                # Typed API client
├── docker-compose.yml
├── init-db.sh
└── Makefile
```

## Commands

```bash
# Start all services
make dev
# or: docker-compose up --build

# Seed demo data (org, user, portfolio with 10 companies)
make seed

# Run engine unit tests
make test
```

## Services

| Service       | Port | Purpose                    |
|---------------|------|----------------------------|
| web           | 3000 | Next.js frontend           |
| web_api       | 8000 | Auth, portfolios, proxy    |
| engine_api    | 8001 | Simulation jobs, scenarios |
| postgres      | 5432 | grapevine_engine, grapevine_web |
| redis         | 6379 | Celery broker              |

## UI Click-Path (Vertical Slice)

1. **Login**: http://localhost:3000/login → demo@grapevine.io / demo123
2. **Portfolios**: Click "Portfolios" → See "Growth Fund I" (from seed)
3. **Portfolio detail**: Click portfolio → See 10 positions
4. **Run simulation**: Click "Simulation Lab" → Select portfolio + scenario (e.g. "Recession") → Run Simulation
5. **View results**: Poll until status=completed → See IRR chart, VaR, CVaR

## Database Setup

Postgres creates `grapevine_engine` and `grapevine_web` on first run via init-db.sh.
