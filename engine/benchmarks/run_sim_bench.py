"""Simulation benchmark - trials/sec, runtime, memory."""
import json
import os
import sys
import time
from pathlib import Path

# Add engine project root (parent of benchmarks/) so engine package is found
_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams

RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def run_benchmark(n_trials: int, seed: int = 42) -> dict:
    portfolio = PortfolioInput(
        positions=[
            {"cost_basis": 10, "current_value": 12, "expected_exit_years": 5, "revenue_growth": 0.15, "leverage": 0.3},
            {"cost_basis": 20, "current_value": 22, "expected_exit_years": 4, "revenue_growth": 0.12, "leverage": 0.5},
            {"cost_basis": 15, "current_value": 18, "expected_exit_years": 6, "revenue_growth": 0.18, "leverage": 0.4},
        ],
        total_cost=45,
        total_value=52,
    )
    scenario = ScenarioParams(gdp_delta=0, multiple_compression=0)
    engine = SimulationEngine()

    t0 = time.perf_counter()
    result = engine.run(portfolio, scenario, n_trials=n_trials, seed=seed)
    elapsed = time.perf_counter() - t0

    trials_per_sec = n_trials / elapsed if elapsed > 0 else 0
    return {
        "n_trials": n_trials,
        "elapsed_sec": round(elapsed, 3),
        "trials_per_sec": round(trials_per_sec, 1),
        "mean_irr": result.mean_irr,
        "var_95": result.var_95,
        "backend": os.environ.get("COMPUTE_BACKEND", "numpy"),
    }


def main():
    results = {}
    for n in [10_000, 100_000, 500_000]:
        print(f"Running {n:,} trials...")
        try:
            r = run_benchmark(n)
            results[str(n)] = r
            print(f"  {r['elapsed_sec']}s, {r['trials_per_sec']} trials/sec")
        except Exception as e:
            results[str(n)] = {"error": str(e)}
            print(f"  Error: {e}")

    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "benchmarks": results,
    }
    out_path = RESULTS_DIR / "latest.json"
    out_path.write_text(json.dumps(output, indent=2))
    print(f"\nSaved to {out_path}")
    return output


if __name__ == "__main__":
    main()
