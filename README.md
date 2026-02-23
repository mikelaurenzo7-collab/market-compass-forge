# Grapevine Intelligence Engine

GPU-ready private markets simulation + graph analytics infrastructure. **NVIDIA Inception-ready.**

## Why GPUs Matter Here

- **Stress simulation**: 100k+ Monte Carlo trials with correlated shocks, regime switching, and timeline percentiles — vectorized ops map naturally to CUDA.
- **Network contagion**: Exposure propagation over large graphs; adjacency/sparse matrix ops benefit from cuGraph/RAPIDS.
- **Model training**: PyTorch deal scoring; training and batch inference scale on GPU.

## Engine vs Website (HARD BOUNDARIES)

| Engine | Website |
|--------|---------|
| Compute + analytics only | UX only |
| No UI, Next.js, React | No simulation/math logic |
| Pure Python, numpy/cupy | Calls engine_api via typed HTTP client |
| SimulationEngine, GraphSimulationEngine, PyTorch scoring | Auth, portfolios, job monitoring |

## ComputeBackend (GPU-Ready)

Numeric kernels use `ComputeBackend` protocol. Swap numpy → cupy:

```bash
COMPUTE_BACKEND=cupy python -m engine.benchmarks.run_sim_bench
```

- `engine/compute/backend.py` - Protocol (array, zeros, random_normal, cholesky, quantile, cumsum, etc.)
- `engine/compute/numpy_backend.py` - CPU
- `engine/compute/cupy_backend.py` - GPU (requires `pip install cupy-cuda12x`)
- `engine/utils/hardware.py` - `detect_gpu()`, `get_compute_backend_name()`, `get_torch_device()`

**Config env vars:**
- `COMPUTE_BACKEND=numpy|cupy` — numeric backend
- `TORCH_DEVICE=cpu|cuda` — PyTorch device (graceful fallback to CPU if CUDA unavailable)

## File Tree

```
grapevine/
├── engine/                      # Pure Python library
│   ├── engine/
│   │   ├── compute/             # Backend abstraction
│   │   │   ├── backend.py, numpy_backend.py, cupy_backend.py
│   │   │   └── config.py
│   │   ├── simulation.py        # Monte Carlo (vectorized, correlated, regime)
│   │   ├── scenarios.py
│   │   ├── graph/               # Graph analytics + contagion
│   │   │   ├── graph_repository.py, in_memory_graph.py
│   │   │   ├── analytics.py     # centrality, exposure propagation
│   │   │   └── contagion.py     # GraphSimulationEngine
│   │   └── scoring/             # PyTorch deal scoring
│   │       ├── features.py, model.py, train.py, inference.py
│   ├── benchmarks/
│   │   ├── run_sim_bench.py
│   │   ├── run_all.py         # simulation + contagion + deal scoring
│   │   └── results/latest.json
│   ├── kernels/               # Acceleration-critical (backend-only)
│   │   ├── shocks.py          # correlated_shocks, regime_switching_sampler
│   │   └── summary.py         # quantile_summary
│   └── tests/
├── services/
│   ├── engine_api/              # FastAPI
│   ├── engine_worker/           # Celery (chunked simulations)
│   └── web_api/                 # Auth, portfolios, proxy
├── apps/web/                    # Next.js
└── packages/shared/             # Typed API client
```

## Commands

```bash
docker compose up --build   # Start all services
make seed                   # demo@grapevine.io / demo123
make test                   # engine unit tests

# Run demo
# UI: /demo → Run NVIDIA Demo → wait for completion → Download Report JSON

# GPU smoke test
cd engine && python scripts/gpu_smoke_test.py

# Scale benchmarks
cd engine && python benchmarks/run_scale_suite.py
# Or: POST /v1/benchmarks/run (async via Celery)
```

## How to Switch Compute Backends

- **CPU (default)**: `COMPUTE_BACKEND=numpy` `TORCH_DEVICE=cpu`
- **GPU**: `COMPUTE_BACKEND=cupy` `TORCH_DEVICE=cuda` (requires `pip install cupy-cuda12x` and CUDA)
- Graceful fallback: If CuPy/CUDA unavailable, automatically falls back to NumPy; metadata records `numpy(fallback)`

## Where Outputs Live

- **PDF/CSV exports**: `/tmp/grapevine_exports/` (or `EXPORTS_DIR` env)
- **Benchmark JSON**: `engine/benchmarks/results/latest.json`

## NVIDIA Demo (90-Second Script)

1. **Start**: `docker compose up --build` → wait for healthy
2. **Seed**: `make seed` (or use existing demo@grapevine.io / demo123)
3. **Login**: http://localhost:3000 → demo@grapevine.io / demo123
4. **Run Demo**: NVIDIA Demo → "Run NVIDIA Demo" → watch progress bar (10% → 40% → 70% → 85% → 95% → 100%)
5. **Results**: Simulation charts (IRR quantiles + timeline bands), Contagion before/after mitigation, Deal scores table, Compute Backend + Torch Device badges
6. **Export**: "Download Demo Report JSON"

**Talking points**: "We run 100k correlated Monte Carlo trials with regime switching, contagion simulation with mitigation, and PyTorch deal scoring — all GPU-ready via ComputeBackend and TORCH_DEVICE."

## Benchmarks

- **Where**: `engine/benchmarks/results/latest.json`
- **Run locally**: `cd engine && python benchmarks/run_all.py`
- **Run via API**: `POST /v1/benchmarks/run` (async) → `GET /v1/benchmarks/latest` for results
- **Output**: simulation (10k/100k/500k trials), contagion (small/medium/large graphs), deal scoring (1/10/1000 req), hardware info (CPU, RAM, GPU)

## Verification Click-Path

1. **Login** → demo@grapevine.io / demo123
2. **NVIDIA Demo** → /demo → Run NVIDIA Demo → See progress + report
3. **Run 100k simulation** → Simulation Lab → Select portfolio + scenario → n_trials=100000 → Run → See progress → quantile chart
4. **Contagion** → Graph Explorer → Shocked nodes: a → Run Contagion → See top impacted nodes
5. **Deal scoring** → Deals → Enter params → Score Deal → See exit probability + risk bucket
6. **Benchmarks** → /benchmarks → Run Benchmarks → View results

## Future: RAPIDS/cuGraph

- Replace numpy in simulation with cuDF/cupy
- Replace graph analytics with cuGraph
- PyTorch model: `.to("cuda")` for inference
