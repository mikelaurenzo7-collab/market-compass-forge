"""Monte Carlo portfolio simulation. Vectorized, GPU-ready via ComputeBackend."""
import time
from dataclasses import dataclass, field
from typing import Any

from engine.compute.backend import ComputeBackend
from engine.compute.config import get_backend
from engine.kernels.shocks import correlated_shocks, regime_switching_sampler
from engine.kernels.summary import quantile_summary
from engine.utils.hardware import get_effective_compute_backend, get_effective_torch_device


@dataclass
class PortfolioInput:
    """Portfolio data for simulation."""
    positions: list[dict]
    total_cost: float
    total_value: float


@dataclass
class ScenarioParams:
    """Scenario parameters (macro shocks)."""
    rates_delta_bps: float = 0
    gdp_delta: float = 0
    multiple_compression: float = 0
    exit_delay_years: float = 0
    sector_overrides: dict[str, dict] = field(default_factory=dict)
    # Correlation: NxN matrix (N=positions or sectors). If None, uncorrelated.
    correlation_matrix: list[list[float]] | None = None
    # Fat tails: df for Student-t. If None, use normal.
    student_t_df: float | None = None
    # Regime switching
    p_crisis: float = 0
    crisis_vol_mult: float = 1.5
    crisis_correlation_mult: float = 1.2
    crisis_multiple_compression_extra: float = -0.1
    # Exit horizon: (mean, std) for lognormal exit years. If None, use fixed.
    exit_horizon_lognormal: tuple[float, float] | None = None


@dataclass
class SimulationResult:
    """Simulation output - JSON-serializable distribution summaries."""
    irr_quantiles: dict[str, float]
    moic_quantiles: dict[str, float]
    time_to_exit_quantiles: dict[str, float]
    var_95: float
    cvar_95: float
    downside_prob_below_threshold: float
    threshold_irr: float
    mean_irr: float
    std_irr: float
    mean_moic: float
    std_moic: float
    drawdown_proxy: float
    exposure_by_sector: dict[str, float]
    n_trials: int
    seed: int | None
    irr_samples: list[float] | None = None
    moic_samples: list[float] | None = None
    time_to_exit_samples: list[float] | None = None
    compute_backend_used: str = "numpy"
    torch_device_used: str = "cpu"
    runtime_ms: float = 0
    trials_per_sec: float = 0
    timeseries_percentiles: dict[str, list[dict[str, float]]] | None = None


class SimulationEngine:
    """Monte Carlo simulation. Vectorized, uses ComputeBackend for GPU swap."""

    QUANTILES = [0.01, 0.05, 0.25, 0.50, 0.75, 0.95, 0.99]

    def run(
        self,
        portfolio: PortfolioInput,
        scenario: ScenarioParams,
        n_trials: int = 10000,
        seed: int | None = None,
        backend: ComputeBackend | None = None,
        return_samples: bool = False,
    ) -> SimulationResult:
        t0 = time.perf_counter()
        be = backend or get_backend()
        backend_name = get_effective_compute_backend()
        torch_dev = get_effective_torch_device()
        n_positions = len(portfolio.positions)
        if n_positions == 0:
            return self._empty_result(n_trials, seed)

        total_cost = portfolio.total_cost
        if total_cost <= 0:
            total_cost = sum(p.get("cost_basis", 0) or 0 for p in portfolio.positions)

        # Extract position arrays (vectorized)
        costs = be.array([float(p.get("cost_basis", 0) or 0) for p in portfolio.positions])
        current_vals = be.array([
            float(p.get("current_value") or p.get("cost_basis") or 0)
            for p in portfolio.positions
        ])
        exit_years_base = be.array([float(p.get("expected_exit_years", 5) or 5) for p in portfolio.positions])
        rev_growth = be.array([float(p.get("revenue_growth", 0.1) or 0.1) for p in portfolio.positions])
        leverage = be.array([float(p.get("leverage", 0) or 0) for p in portfolio.positions])
        sectors = [p.get("sector", "default") for p in portfolio.positions]

        n = n_positions
        exit_delay = scenario.exit_delay_years
        mult_shock = 1 + scenario.multiple_compression
        rev_shock = 1 + scenario.gdp_delta
        rev_growth_adj = rev_growth * rev_shock
        current_adj = current_vals * mult_shock

        if scenario.student_t_df:
            Z_raw = be.random_student_t(scenario.student_t_df, (n_trials, n), seed=seed)
            if scenario.correlation_matrix and len(scenario.correlation_matrix) >= n:
                L = be.cholesky(be.array([row[:n] for row in scenario.correlation_matrix[:n]]))
                Z = be.matmul(Z_raw, L.T)
            else:
                Z = Z_raw
        else:
            Z = correlated_shocks(be, n_trials, n, scenario.correlation_matrix, seed)
        vol_mult, mult_extra = regime_switching_sampler(
            be, n_trials, scenario.p_crisis, scenario.crisis_vol_mult,
            scenario.crisis_multiple_compression_extra, seed=seed + 1 if seed else None
        )

        if scenario.exit_horizon_lognormal:
            mu, sig = scenario.exit_horizon_lognormal
            log_exit = be.random_normal((n_trials, n), mean=mu, std=sig, seed=seed + 2 if seed else None)
            exit_years = be.exp(be.clip(log_exit, -5, 10)) + exit_delay
        else:
            base_exit = be.reshape(exit_years_base + exit_delay, (1, n))
            exit_years = base_exit + be.random_uniform(-0.5, 0.5, (n_trials, n), seed=seed + 2 if seed else None)

        sigma_base = be.reshape(0.3 + leverage * 0.1, (1, n))
        sigma = sigma_base * vol_mult
        drift = be.reshape(rev_growth_adj - 0.5 * sigma_base**2, (1, n))
        diffusion = sigma * be.sqrt(exit_years)
        shocks = Z * diffusion
        current_expanded = be.reshape(current_adj, (1, n))
        costs_expanded = be.reshape(costs, (1, n))
        exit_values = current_expanded * be.exp(drift * exit_years + shocks) * (1 + mult_extra)
        exit_values = be.clip(exit_values, costs_expanded * 0.1, None)

        # Portfolio-level
        total_exit = be.sum(exit_values, axis=1)
        avg_exit_years = be.sum(exit_years, axis=1) / n
        irrs = (total_exit / total_cost) ** (1 / be.clip(avg_exit_years, 0.1, 20)) - 1
        moics = total_exit / total_cost
        irrs = be.clip(irrs, -0.99, 10)
        time_to_exit = be.sum(exit_years, axis=1) / n

        # Drawdown proxy: simulate value path, get max drawdown
        # Simplified: use (min_irr - max_irr) of sorted as proxy
        sorted_irr = be.sort(irrs)
        drawdown_proxy = float(be.mean(sorted_irr[: max(1, n_trials // 20)]) - be.mean(sorted_irr[-max(1, n_trials // 20):]))

        # Exposure by sector
        exposure_by_sector: dict[str, float] = {}
        for i, sec in enumerate(sectors):
            sec_exit = be.sum(exit_values[:, i : i + 1], axis=0)
            exposure_by_sector[sec] = float(be.mean(sec_exit))

        irr_q = {f"p{int(q*100)}": float(be.quantile(irrs, q)) for q in self.QUANTILES}
        moic_q = {f"p{int(q*100)}": float(be.quantile(moics, q)) for q in self.QUANTILES}
        tte_q = {f"p{int(q*100)}": float(be.quantile(time_to_exit, q)) for q in self.QUANTILES}

        sorted_irr = be.sort(irrs)
        sorted_np = be.as_numpy(sorted_irr)
        var_idx = max(0, int(0.05 * n_trials) - 1)
        var_95 = float(sorted_np[var_idx])
        cvar_95 = float(float(sorted_np[: var_idx + 1].mean()))
        threshold = 0.10
        downside_prob = be.proportion_less_than(irrs, threshold)

        irr_samples = be.tolist(irrs) if return_samples else None
        moic_samples = be.tolist(moics) if return_samples else None
        tte_samples = be.tolist(time_to_exit) if return_samples else None

        elapsed_ms = (time.perf_counter() - t0) * 1000
        trials_per_sec = n_trials / (elapsed_ms / 1000) if elapsed_ms > 0 else 0

        return SimulationResult(
            irr_quantiles=irr_q,
            moic_quantiles=moic_q,
            time_to_exit_quantiles=tte_q,
            var_95=var_95,
            cvar_95=cvar_95,
            downside_prob_below_threshold=downside_prob,
            threshold_irr=threshold,
            mean_irr=float(be.mean(irrs)),
            std_irr=float(be.std(irrs)),
            mean_moic=float(be.mean(moics)),
            std_moic=float(be.std(moics)),
            drawdown_proxy=drawdown_proxy,
            exposure_by_sector=exposure_by_sector,
            n_trials=n_trials,
            seed=seed,
            irr_samples=irr_samples,
            moic_samples=moic_samples,
            time_to_exit_samples=tte_samples,
            compute_backend_used=backend_name,
            torch_device_used=torch_dev,
            runtime_ms=round(elapsed_ms, 2),
            trials_per_sec=round(trials_per_sec, 1),
        )

    @staticmethod
    def aggregate_chunk_results(
        chunk_results: list[SimulationResult],
        backend: ComputeBackend | None = None,
    ) -> SimulationResult:
        """Aggregate results from chunked runs. Chunks must have return_samples=True."""
        if not chunk_results:
            return SimulationEngine()._empty_result(0, None)
        be = backend or get_backend()
        all_irr = []
        all_moic = []
        all_tte = []
        for r in chunk_results:
            if r.irr_samples:
                all_irr.extend(r.irr_samples)
            if r.moic_samples:
                all_moic.extend(r.moic_samples)
            if r.time_to_exit_samples:
                all_tte.extend(r.time_to_exit_samples)
        if not all_irr:
            return chunk_results[0]
        irrs = be.array(all_irr)
        moics = be.array(all_moic) if all_moic else be.ones(len(all_irr))
        n_trials = len(all_irr)
        irr_q = {f"p{int(q*100)}": float(be.quantile(irrs, q)) for q in SimulationEngine.QUANTILES}
        moic_q = {f"p{int(q*100)}": float(be.quantile(moics, q)) for q in SimulationEngine.QUANTILES}
        tte = be.array(all_tte) if all_tte else None
        tte_q = {f"p{int(q*100)}": float(be.quantile(tte, q)) for q in SimulationEngine.QUANTILES} if tte is not None else chunk_results[0].time_to_exit_quantiles
        sorted_irr = be.sort(irrs)
        var_idx = max(0, int(0.05 * n_trials) - 1)
        sorted_np = be.as_numpy(sorted_irr)
        var_95 = float(sorted_np[var_idx])
        cvar_95 = float(float(sorted_np[: var_idx + 1].mean()))
        threshold = 0.10
        downside_prob = be.proportion_less_than(irrs, threshold)
        exposure = chunk_results[0].exposure_by_sector if chunk_results else {}
        return SimulationResult(
            irr_quantiles=irr_q,
            moic_quantiles=moic_q,
            time_to_exit_quantiles=tte_q,
            var_95=var_95,
            cvar_95=cvar_95,
            downside_prob_below_threshold=downside_prob,
            threshold_irr=threshold,
            mean_irr=float(be.mean(irrs)),
            std_irr=float(be.std(irrs)),
            mean_moic=float(be.mean(moics)),
            std_moic=float(be.std(moics)),
            drawdown_proxy=chunk_results[0].drawdown_proxy if chunk_results else 0,
            exposure_by_sector=exposure,
            n_trials=n_trials,
            seed=chunk_results[0].seed if chunk_results else None,
            irr_samples=None,
            moic_samples=None,
            time_to_exit_samples=None,
            compute_backend_used=get_effective_compute_backend(),
            torch_device_used=get_effective_torch_device(),
            runtime_ms=0,
            trials_per_sec=0,
            timeseries_percentiles=None,
        )

    def run_with_timeline(
        self,
        portfolio: PortfolioInput,
        scenario: ScenarioParams,
        n_trials: int = 10000,
        months: int = 60,
        seed: int | None = None,
        backend: ComputeBackend | None = None,
    ) -> SimulationResult:
        """Digital Twin: monthly portfolio value + liquidity percentiles (p5, p50, p95)."""
        t0 = time.perf_counter()
        be = backend or get_backend()
        backend_name = get_effective_compute_backend()
        torch_dev = get_effective_torch_device()
        n_positions = len(portfolio.positions)
        if n_positions == 0:
            return self._empty_result(n_trials, seed)

        total_cost = portfolio.total_cost or sum(p.get("cost_basis", 0) or 0 for p in portfolio.positions)
        costs = be.array([float(p.get("cost_basis", 0) or 0) for p in portfolio.positions])
        current_vals = be.array([float(p.get("current_value") or p.get("cost_basis") or 0) for p in portfolio.positions])
        exit_years_base = be.array([float(p.get("expected_exit_years", 5) or 5) for p in portfolio.positions])
        rev_growth = be.array([float(p.get("revenue_growth", 0.1) or 0.1) for p in portfolio.positions])
        leverage = be.array([float(p.get("leverage", 0) or 0) for p in portfolio.positions])
        sectors = [p.get("sector", "default") for p in portfolio.positions]
        n = n_positions

        mult_shock = 1 + scenario.multiple_compression
        rev_shock = 1 + scenario.gdp_delta
        rev_growth_adj = rev_growth * rev_shock
        current_adj = current_vals * mult_shock
        sigma_base = be.reshape(0.3 + leverage * 0.1, (1, n))
        drift = be.reshape(rev_growth_adj - 0.5 * sigma_base**2, (1, n))

        Z = correlated_shocks(be, n_trials * months, n, scenario.correlation_matrix, seed)
        Z = be.reshape(Z, (n_trials, months, n))
        dt = 1 / 12
        sigma = be.reshape(sigma_base * be.sqrt(dt), (1, 1, n))
        shocks = Z * sigma
        drift_dt = be.reshape(drift * dt, (1, 1, n))
        log_returns = drift_dt + shocks
        current_expanded = be.reshape(current_adj, (1, 1, n))
        values = current_expanded * be.exp(be.cumsum(log_returns, axis=1))
        portfolio_values = be.sum(values, axis=2)
        liquidity = portfolio_values

        value_ts = []
        liquidity_ts = []
        for t in range(months):
            value_ts.append({
                "month": t + 1,
                "p5": float(be.quantile(portfolio_values[:, t], 0.05)),
                "p50": float(be.quantile(portfolio_values[:, t], 0.50)),
                "p95": float(be.quantile(portfolio_values[:, t], 0.95)),
            })
            liquidity_ts.append({
                "month": t + 1,
                "p5": float(be.quantile(liquidity[:, t], 0.05)),
                "p50": float(be.quantile(liquidity[:, t], 0.50)),
                "p95": float(be.quantile(liquidity[:, t], 0.95)),
            })

        exit_values = values[:, -1, :]
        total_exit = be.sum(exit_values, axis=1)
        exit_years = exit_years_base + scenario.exit_delay_years
        avg_exit = float(be.mean(exit_years))
        irrs = (total_exit / total_cost) ** (1 / max(avg_exit, 0.1)) - 1
        moics = total_exit / total_cost
        irrs = be.clip(irrs, -0.99, 10)

        irr_q = quantile_summary(be, irrs)
        moic_q = quantile_summary(be, moics)
        sorted_irr = be.sort(irrs)
        sorted_np = be.as_numpy(sorted_irr)
        var_idx = max(0, int(0.05 * n_trials) - 1)
        var_95 = float(sorted_np[var_idx])
        cvar_95 = float(float(sorted_np[: var_idx + 1].mean()))
        exposure = {s: float(be.mean(be.sum(exit_values[:, i:i+1], axis=0))) for i, s in enumerate(sectors)}

        elapsed_ms = (time.perf_counter() - t0) * 1000
        return SimulationResult(
            irr_quantiles=irr_q,
            moic_quantiles=moic_q,
            time_to_exit_quantiles={"p50": avg_exit},
            var_95=var_95,
            cvar_95=cvar_95,
            downside_prob_below_threshold=be.proportion_less_than(irrs, 0.10),
            threshold_irr=0.10,
            mean_irr=float(be.mean(irrs)),
            std_irr=float(be.std(irrs)),
            mean_moic=float(be.mean(moics)),
            std_moic=float(be.std(moics)),
            drawdown_proxy=0,
            exposure_by_sector=exposure,
            n_trials=n_trials,
            seed=seed,
            compute_backend_used=backend_name,
            torch_device_used=torch_dev,
            runtime_ms=round(elapsed_ms, 2),
            trials_per_sec=round(n_trials / (elapsed_ms / 1000), 1) if elapsed_ms > 0 else 0,
            timeseries_percentiles={
                "portfolio_value": value_ts,
                "liquidity": liquidity_ts,
            },
        )

    def _empty_result(self, n_trials: int, seed: int | None) -> SimulationResult:
        q = {f"p{int(x*100)}": 0.0 for x in self.QUANTILES}
        return SimulationResult(
            irr_quantiles=q,
            moic_quantiles={**q, "p50": 1.0},
            time_to_exit_quantiles=q,
            var_95=0,
            cvar_95=0,
            downside_prob_below_threshold=0,
            threshold_irr=0.10,
            mean_irr=0,
            std_irr=0,
            mean_moic=1,
            std_moic=0,
            drawdown_proxy=0,
            exposure_by_sector={},
            n_trials=n_trials,
            seed=seed,
            irr_samples=None,
            moic_samples=None,
            time_to_exit_samples=None,
            compute_backend_used=get_effective_compute_backend(),
            torch_device_used=get_effective_torch_device(),
            runtime_ms=0,
            trials_per_sec=0,
            timeseries_percentiles=None,
        )
