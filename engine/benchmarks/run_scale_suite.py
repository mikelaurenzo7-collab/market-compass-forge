#!/usr/bin/env python3
"""Scale benchmark suite: simulation (small/medium/large), graph, deal scoring. Saves to latest.json."""
import json
import os
import sys
import time
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from engine.simulation import SimulationEngine, ScenarioParams
from engine.graph.contagion import GraphSimulationEngine
from engine.scoring.inference import PyTorchModelScorer
from engine.synthetic import generate_portfolio, generate_graph
from engine.utils.hardware import get_hardware_summary

RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def bench_sim(label: str, n_companies: int, n_trials: int, seed: int = 42) -> dict:
    portfolio = generate_portfolio(n_companies=n_companies, n_sectors=min(30, n_companies // 2), seed=seed)
    engine = SimulationEngine()
    scenario = ScenarioParams()
    t0 = time.perf_counter()
    try:
        result = engine.run(portfolio, scenario, n_trials=n_trials, seed=seed)
        elapsed = (time.perf_counter() - t0) * 1000
        return {
            "label": label,
            "n_companies": n_companies,
            "n_trials": n_trials,
            "runtime_ms": round(elapsed, 2),
            "trials_per_sec": round(n_trials / (elapsed / 1000), 1),
            "backend": result.compute_backend_used,
            "torch_device": result.torch_device_used,
        }
    except Exception as e:
        return {"label": label, "error": str(e)}


def bench_graph(label: str, n_nodes: int, n_edges: int, seed: int = 42) -> dict:
    g = generate_graph(n_nodes=n_nodes, n_edges=n_edges, seed=seed)
    engine = GraphSimulationEngine()
    shocked = {"0"}
    t0 = time.perf_counter()
    try:
        result = engine.simulate_liquidity_shock(g, shocked, 1.0, 0.5, 5)
        elapsed = (time.perf_counter() - t0) * 1000
        return {
            "label": label,
            "n_nodes": n_nodes,
            "n_edges": n_edges,
            "runtime_ms": round(elapsed, 2),
            "backend": result.compute_backend_used,
        }
    except Exception as e:
        return {"label": label, "error": str(e)}


def bench_scoring(n_inferences: int) -> dict:
    scorer = PyTorchModelScorer()
    deal = {"deal_size": 20, "entry_multiple": 8, "revenue_growth": 0.15, "leverage": 0.4, "hold_period_years": 5, "sector": "tech"}
    t0 = time.perf_counter()
    try:
        for _ in range(n_inferences):
            scorer.score(deal)
        elapsed = (time.perf_counter() - t0) * 1000
        return {
            "n_inferences": n_inferences,
            "runtime_ms": round(elapsed, 2),
            "inferences_per_sec": round(n_inferences / (elapsed / 1000), 1),
        }
    except Exception as e:
        return {"n_inferences": n_inferences, "error": str(e)}


def run_suite() -> dict:
    hw = get_hardware_summary()
    results = {"hardware": hw, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

    print("Simulation small (10 companies, 100k trials)...")
    results.setdefault("simulation", {})["small"] = bench_sim("small", 10, 100_000)
    print("Simulation medium (200 companies, 250k trials)...")
    results.setdefault("simulation", {})["medium"] = bench_sim("medium", 200, 250_000)
    print("Simulation large (1000 companies, 500k trials)...")
    results.setdefault("simulation", {})["large"] = bench_sim("large", 1000, 500_000)

    print("Graph small (1k nodes, 5k edges)...")
    results.setdefault("graph", {})["small"] = bench_graph("small", 1000, 5000)
    print("Graph medium (5k nodes, 25k edges)...")
    results.setdefault("graph", {})["medium"] = bench_graph("medium", 5000, 25000)
    print("Graph large (10k nodes, 50k edges)...")
    results.setdefault("graph", {})["large"] = bench_graph("large", 10000, 50000)

    print("Deal scoring 1, 100, 1000...")
    results.setdefault("deal_scoring", {})["1"] = bench_scoring(1)
    results.setdefault("deal_scoring", {})["100"] = bench_scoring(100)
    results.setdefault("deal_scoring", {})["1000"] = bench_scoring(1000)

    out_path = RESULTS_DIR / "latest.json"
    out_path.write_text(json.dumps(results, indent=2))
    print(f"\nSaved to {out_path}")
    return results


if __name__ == "__main__":
    run_suite()
