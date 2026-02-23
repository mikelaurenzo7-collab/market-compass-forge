# NVIDIA Demo Script — 90-Second Talking Points

## Setup (before demo)

1. `docker compose up --build`
2. `make seed` (creates demo@grapevine.io / demo123)
3. Open http://localhost:3000

## Click Path

| Step | Action | Screen |
|------|--------|--------|
| 1 | Login: demo@grapevine.io / demo123 | Login page |
| 2 | Click **NVIDIA Demo** in nav | /demo |
| 3 | Click **Run NVIDIA Demo** | Progress bar appears |
| 4 | Wait ~30–90s (100k trials + contagion + scoring) | Milestones: 10% → 40% → 70% → 85% → 95% → 100% |
| 5 | View results | IRR quantiles, timeline bands, contagion before/after, deal scores |
| 6 | Click **Download Demo Report JSON** | Saves full report |

## Talking Points

- **"GPU-ready infrastructure"**: "Our Monte Carlo engine uses a ComputeBackend abstraction — we swap numpy for CuPy with an env var. Same code runs on CPU or GPU."
- **"Digital twin"**: "We simulate monthly portfolio value percentiles over 60 months — p5, p50, p95 bands. That's the digital twin timeline."
- **"Contagion + mitigation"**: "We run contagion with and without mitigation. You see the delta — how much risk drops when you reduce exposure edges."
- **"PyTorch scoring"**: "Deal scoring uses a PyTorch MLP. TORCH_DEVICE=cuda for GPU inference."
- **"Measurable"**: "Benchmarks report trials/sec, runtime_ms, backend, device. We're not marketing — we instrument."

## Screenshots (placeholders)

- [ ] Login screen
- [ ] NVIDIA Demo — Run button
- [ ] Progress bar with milestones
- [ ] Completed report — simulation + contagion + deal scores
- [ ] Compute Backend / Torch Device badges

## Demo Report JSON Schema (example)

```json
{
  "simulation": {
    "irr_quantiles": {"p1": 0.02, "p5": 0.08, "p50": 0.15, "p95": 0.25, ...},
    "var_95": 0.05,
    "n_trials": 100000,
    "compute_backend_used": "numpy",
    "torch_device_used": "cpu",
    "runtime_ms": 2500,
    "trials_per_sec": 40000,
    "timeseries_percentiles": {
      "portfolio_value": [{"month": 1, "p5": 45, "p50": 52, "p95": 60}, ...],
      "liquidity": [...]
    }
  },
  "contagion_baseline": {"total_risk": 2.5, "top_impacted": [...]},
  "contagion_mitigated": {"total_risk": 1.8, "top_impacted": [...]},
  "contagion_delta": {"total_risk_delta": 0.7},
  "deal_scores": [{"exit_probability": 0.72, "risk_bucket": "medium"}, ...],
  "hardware": {"gpu_present": false, "compute_backend": "numpy", "torch_device": "cpu", "ram_gb": 16}
}
```
