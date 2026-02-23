# Grapevine Intelligence Engine — Technical One-Pager

## Problem

Private markets (PE, family offices) need to stress-test portfolios under correlated macro shocks, model contagion across capital networks, and score deals—at scale. CPU-only tools hit limits at 100k+ trials and 10k+ node graphs.

## Solution

Grapevine is a GPU-ready simulation and graph analytics platform:

- **Monte Carlo stress engine**: Correlated shocks, regime switching, timeline percentiles. Vectorized for 100k–500k trials.
- **Capital network contagion**: Exposure propagation, mitigation what-if. Graph analytics (centrality, propagation).
- **Deal scoring**: PyTorch MLP, GPU inference path.
- **ComputeBackend abstraction**: Swap NumPy → CuPy with an env var. Same code, GPU execution.

## Why GPUs

| Workload | CPU bottleneck | GPU benefit |
|----------|----------------|-------------|
| 500k trial simulation | Vectorized matmul, Cholesky, quantiles | CuPy: 5–10x throughput |
| 10k node contagion | Adjacency, propagation iterations | cuGraph: 10x+ |
| Batch deal scoring | 1000 inferences | PyTorch CUDA: 10x+ |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   WEBSITE   │────▶│ ENGINE_API  │────▶│   ENGINE    │
│  (Next.js)  │     │  (FastAPI)  │     │ (pure Python)│
│  UX only    │     │  auth, jobs │     │  simulation │
└─────────────┘     └──────┬──────┘     │  graph      │
                           │             │  scoring    │
                           ▼             └─────────────┘
                    ┌─────────────┐
                    │   WORKER    │
                    │  (Celery)   │
                    └─────────────┘
```

- **ENGINE**: No HTTP, no DB. Simulation, graph, scoring, report data.
- **ENGINE_API**: JWT, RBAC, org isolation, job orchestration, exports.
- **WEBSITE**: Charts, forms. Calls ENGINE_API only.

## Benchmark Highlights

*(Pull from engine/benchmarks/results/latest.json)*

| Benchmark | Config | Runtime | Throughput |
|-----------|--------|--------|------------|
| Simulation small | 10 companies, 100k trials | — | — |
| Simulation medium | 200 companies, 250k trials | — | — |
| Simulation large | 1000 companies, 500k trials | — | — |
| Graph small | 1k nodes, 5k edges | — | — |
| Deal scoring | 1000 inferences | — | — |

*Run: `cd engine && python benchmarks/run_scale_suite.py`*

## Roadmap

1. **Current**: CPU vectorized, ComputeBackend abstraction
2. **CuPy**: `COMPUTE_BACKEND=cupy` for GPU simulation
3. **RAPIDS/cuGraph**: GPU graph analytics
4. **Multi-GPU**: Distributed chunked execution

## Commands

```bash
docker compose up --build
make seed
cd engine && python scripts/gpu_smoke_test.py
cd engine && python benchmarks/run_scale_suite.py
```

## Outputs

- **PDF exports**: `/tmp/grapevine_exports/` (or `EXPORTS_DIR`)
- **Benchmarks**: `engine/benchmarks/results/latest.json`
