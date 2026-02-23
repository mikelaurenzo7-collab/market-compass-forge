# Grapevine Intelligence Engine

GPU-ready private markets simulation + graph analytics infrastructure.

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

- `engine/compute/backend.py` - Protocol (array, zeros, random_normal, cholesky, quantile, etc.)
- `engine/compute/numpy_backend.py` - CPU
- `engine/compute/cupy_backend.py` - GPU (requires `pip install cupy-cuda12x`)

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
│   │   └── results/latest.json
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
make dev          # docker-compose up
make seed         # demo@grapevine.io / demo123
make test         # engine unit tests

# Benchmarks
cd engine && python benchmarks/run_sim_bench.py
```

## Verification Click-Path

1. **Login** → demo@grapevine.io / demo123
2. **Run 100k simulation** → Simulation Lab → Select portfolio + scenario → n_trials=100000 → Run → Redirects to detail page → See progress (percent_complete) → When done, see quantile chart
3. **Contagion** → Graph Explorer → Shocked nodes: a → Run Contagion → See top impacted nodes
4. **Deal scoring** → Deals → Enter params → Score Deal → See exit probability + risk bucket
5. **Benchmarks** → Engine Status → See compute_backend + trials/sec (run run_sim_bench.py first)

## Future: RAPIDS/cuGraph

- Replace numpy in simulation with cuDF/cupy
- Replace graph analytics with cuGraph
- PyTorch model: `.to("cuda")` for inference
