"""Run all benchmarks: simulation, graph contagion, deal scoring."""
import json
import os
import sys
import time
from pathlib import Path

# Engine project root (parent of benchmarks/)
_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams
from engine.graph.in_memory_graph import InMemoryGraph
from engine.graph.contagion import GraphSimulationEngine
from engine.scoring.inference import PyTorchModelScorer
from engine.utils.hardware import get_hardware_info

RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def _seeded_portfolio():
    return PortfolioInput(
        positions=[
            {"cost_basis": 10, "current_value": 12, "expected_exit_years": 5, "revenue_growth": 0.15, "leverage": 0.3},
            {"cost_basis": 20, "current_value": 22, "expected_exit_years": 4, "revenue_growth": 0.12, "leverage": 0.5},
            {"cost_basis": 15, "current_value": 18, "expected_exit_years": 6, "revenue_growth": 0.18, "leverage": 0.4},
        ],
        total_cost=45,
        total_value=52,
    )


def bench_simulation(n_trials: int) -> dict:
    engine = SimulationEngine()
    portfolio = _seeded_portfolio()
    scenario = ScenarioParams(gdp_delta=0, multiple_compression=0)
    t0 = time.perf_counter()
    result = engine.run(portfolio, scenario, n_trials=n_trials, seed=42)
    elapsed = time.perf_counter() - t0
    return {
        "n_trials": n_trials,
        "elapsed_sec": round(elapsed, 3),
        "trials_per_sec": round(n_trials / elapsed, 1) if elapsed > 0 else 0,
        "runtime_ms": result.runtime_ms,
        "backend": result.compute_backend_used,
        "torch_device": result.torch_device_used,
    }


def _make_graph(size: str) -> InMemoryGraph:
    g = InMemoryGraph()
    n = {"small": 10, "medium": 50, "large": 200}[size]
    for i in range(n):
        g.add_node(str(i), str(i), "node")
    for i in range(n - 1):
        g.add_edge(str(i), str(i + 1), 1.0)
    for i in range(min(n // 2, n - 2)):
        g.add_edge(str(i), str(i + 2), 0.5)
    return g


def bench_contagion(size: str) -> dict:
    g = _make_graph(size)
    engine = GraphSimulationEngine()
    shocked = {"0"}
    t0 = time.perf_counter()
    result = engine.simulate_liquidity_shock(g, shocked, 1.0, 0.5, 5)
    elapsed = time.perf_counter() - t0
    return {
        "graph_size": size,
        "nodes": len(g.get_nodes()),
        "elapsed_sec": round(elapsed, 3),
        "runtime_ms": result.runtime_ms,
        "total_risk": result.total_risk,
        "backend": result.compute_backend_used,
    }


def bench_deal_scoring(n_requests: int) -> dict:
    scorer = PyTorchModelScorer()
    deal = {"deal_size": 20, "entry_multiple": 8, "revenue_growth": 0.15, "leverage": 0.4, "hold_period_years": 5, "sector": "tech"}
    t0 = time.perf_counter()
    for _ in range(n_requests):
        scorer.score(deal)
    elapsed = time.perf_counter() - t0
    return {
        "n_requests": n_requests,
        "elapsed_sec": round(elapsed, 3),
        "requests_per_sec": round(n_requests / elapsed, 1) if elapsed > 0 else 0,
    }


def run_all() -> dict:
    hw = get_hardware_info()
    results = {"hardware": hw, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

    sim_results = {}
    for n in [10_000, 100_000, 500_000]:
        print(f"Simulation {n:,} trials...")
        try:
            r = bench_simulation(n)
            sim_results[str(n)] = r
            print(f"  {r['elapsed_sec']}s, {r['trials_per_sec']} trials/sec")
        except Exception as e:
            sim_results[str(n)] = {"error": str(e)}
    results["simulation"] = sim_results

    for size in ["small", "medium", "large"]:
        print(f"Contagion {size} graph...")
        try:
            r = bench_contagion(size)
            results.setdefault("contagion", {})[size] = r
        except Exception as e:
            results.setdefault("contagion", {})[size] = {"error": str(e)}

    for n in [1, 10, 1000]:
        print(f"Deal scoring {n} requests...")
        try:
            r = bench_deal_scoring(n)
            results.setdefault("deal_scoring", {})[str(n)] = r
        except Exception as e:
            results.setdefault("deal_scoring", {})[str(n)] = {"error": str(e)}

    out_path = RESULTS_DIR / "latest.json"
    out_path.write_text(json.dumps(results, indent=2))
    print(f"\nSaved to {out_path}")
    return results


if __name__ == "__main__":
    run_all()
