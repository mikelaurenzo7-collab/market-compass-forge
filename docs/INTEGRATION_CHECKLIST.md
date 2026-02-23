# Integration Audit Checklist

## A) Repo Structure + Boundary Verification

| Check | Status | Notes |
|-------|--------|-------|
| ENGINE: no FastAPI/Celery/React/DB imports | PASS | tools/boundary_check.py |
| WEBSITE: no numpy/cupy/torch imports | PASS | tools/boundary_check.py |
| ENGINE_API: no direct math kernels | PASS | Imports engine library only |
| boundary_check.py runs in CI | PASS | make test runs it |

## B) Docker + Local Dev Reliability

| Check | Status | Notes |
|-------|--------|-------|
| docker-compose brings up postgres, redis | PASS | healthchecks |
| engine_api, engine_worker, web_api, web | PASS | depends_on + healthchecks |
| make dev: build, boot, seed, print URLs | PASS | scripts/dev.sh |
| make reset: wipe volumes, reseed | PASS | docker compose down -v |

## C) Database + Migrations + Seed Consistency

| Check | Status | Notes |
|-------|--------|-------|
| Tables created at startup | PASS | Base.metadata.create_all |
| Alembic migrations | N/A | Using create_all; Alembic can be added later |
| Seed deterministic | PASS | Same org/user/portfolio every run |
| Seeded creds in output | PASS | demo@grapevine.io / demo123 |

## D) API Functional E2E Tests

| Check | Status | Notes |
|-------|--------|-------|
| Viewer cannot create/run simulations | PASS | test_rbac.py |
| Analyst can run simulation | PASS | test_analyst_can_create_portfolio |
| Cross-org access fails | PASS | test_org_isolation |
| Simulation lifecycle | MANUAL | demo_verify.sh covers |
| Contagion baseline + mitigation | MANUAL | demo_verify.sh |
| Deal scoring | MANUAL | demo_verify.sh |
| Exports PDF/CSV | MANUAL | demo_verify.sh |
| /system/hardware, /benchmarks | MANUAL | demo_verify.sh |

## E) Worker + Queue Integration

| Check | Status | Notes |
|-------|--------|-------|
| Simulation job enqueues | PASS | POST /simulations |
| Worker completes job | PASS | Celery task |
| Progress persisted | PASS | percent_complete, processed_trials |
| Chunk aggregation | PASS | SimulationEngine.aggregate_chunk_results |

## F) Website Playwright Tests

| Check | Status | Notes |
|-------|--------|-------|
| Login with seeded creds | PASS | smoke.spec.ts |
| Portfolio wizard / CSV | PASS | smoke.spec.ts |
| Simulation lab | PASS | smoke.spec.ts |
| Activity feed | PASS | smoke.spec.ts |
| System page | PASS | smoke.spec.ts |
| Benchmarks page | PASS | smoke.spec.ts |
| Roadmap GPU page | PASS | smoke.spec.ts |

## G) Demo Verification Script

| Check | Status | Notes |
|-------|--------|-------|
| tools/demo_verify.sh exists | PASS | |
| Login, simulation, contagion, scoring | PASS | |
| PDF export | PASS | |
| Writes demo_report.json | PASS | |

## Known Limitations

1. **Alembic**: Using Base.metadata.create_all; no migration history. Fresh deploys work; schema changes require manual migration or adding Alembic.
2. **Playwright**: Requires full stack running (make dev). webServer.reuseExistingServer=true.
3. **Web API tests**: Require Postgres at localhost:5432/grapevine_web. Skip if unavailable.
