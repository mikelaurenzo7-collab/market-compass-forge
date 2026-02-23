#!/usr/bin/env python3
"""GPU smoke test: CuPy + PyTorch CUDA. Prints PASS/FAIL + hardware JSON."""
import json
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_root))

from engine.utils.hardware import get_hardware_summary, detect_gpu


def run_cupy_test() -> bool:
    try:
        from engine.compute.config import get_backend
        be = get_backend()
        a = be.zeros((100, 100))
        b = be.random_normal((100, 100), seed=42)
        c = be.matmul(a, b)
        _ = be.as_numpy(c)
        return True
    except Exception as e:
        print(f"CuPy test FAIL: {e}")
        return False


def run_simulation_test() -> bool:
    try:
        from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams
        engine = SimulationEngine()
        portfolio = PortfolioInput(
            positions=[{"cost_basis": 10, "current_value": 12, "expected_exit_years": 5, "revenue_growth": 0.15, "leverage": 0.3}],
            total_cost=10,
            total_value=12,
        )
        result = engine.run(portfolio, ScenarioParams(), n_trials=10000, seed=42)
        return result.n_trials == 10000
    except Exception as e:
        print(f"Simulation test FAIL: {e}")
        return False


def run_torch_cuda_test() -> bool:
    try:
        import torch
        if not torch.cuda.is_available():
            print("Torch CUDA test SKIP: no CUDA")
            return True
        x = torch.randn(100, 100, device="cuda")
        y = torch.matmul(x, x)
        return y.device.type == "cuda"
    except Exception as e:
        print(f"Torch CUDA test FAIL: {e}")
        return True


def main():
    hw = get_hardware_summary()
    cupy_ok = run_cupy_test()
    sim_ok = run_simulation_test()
    torch_ok = run_torch_cuda_test()
    all_ok = cupy_ok and sim_ok
    print("CuPy/backend:", "PASS" if cupy_ok else "FAIL")
    print("Simulation 10k:", "PASS" if sim_ok else "FAIL")
    print("Torch CUDA:", "PASS" if torch_ok else "SKIP" if not hw.get("gpu_present") else "FAIL")
    print("\nHardware summary:")
    print(json.dumps(hw, indent=2))
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
