"""Monte Carlo portfolio simulation. Pure numpy - swappable to cupy/numba-cuda later."""
from dataclasses import dataclass, field
import numpy as np


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


@dataclass
class SimulationResult:
    """Simulation output."""
    irr_distribution: list[float]
    moic_distribution: list[float]
    time_to_exit_distribution: list[float]
    var_95: float
    cvar_95: float
    downside_prob_below_threshold: float
    threshold_irr: float
    mean_irr: float
    median_irr: float
    mean_moic: float
    median_moic: float
    n_trials: int
    seed: int | None


class SimulationEngine:
    """Monte Carlo simulation. Isolate numeric kernels for GPU swap (numpy -> cupy/numba)."""

    def run(
        self,
        portfolio: PortfolioInput,
        scenario: ScenarioParams,
        n_trials: int = 10000,
        seed: int | None = None,
    ) -> SimulationResult:
        rng = np.random.default_rng(seed)
        n_positions = len(portfolio.positions)
        if n_positions == 0:
            return self._empty_result(n_trials, seed)

        total_cost = portfolio.total_cost
        if total_cost <= 0:
            total_cost = sum(p.get("cost_basis", 0) or 0 for p in portfolio.positions)

        irrs = np.zeros(n_trials)
        moics = np.zeros(n_trials)
        exit_times = np.zeros(n_trials)

        for i in range(n_trials):
            trial_values = []
            trial_exits = []

            for pos in portfolio.positions:
                cost = float(pos.get("cost_basis", 0) or 0)
                current_val = float(pos.get("current_value", cost) or cost)
                exit_years = float(pos.get("expected_exit_years", 5) or 5)
                rev_growth = float(pos.get("revenue_growth", 0.1) or 0.1)
                leverage = float(pos.get("leverage", 0) or 0)

                exit_years += scenario.exit_delay_years
                mult_shock = 1 + scenario.multiple_compression
                rev_shock = 1 + scenario.gdp_delta
                rev_growth_adj = rev_growth * rev_shock
                current_val_adj = current_val * mult_shock

                sigma = 0.3 + leverage * 0.1
                exit_value = current_val_adj * np.exp(
                    (rev_growth_adj - 0.5 * sigma**2) * exit_years
                    + sigma * np.sqrt(exit_years) * rng.standard_normal()
                )
                exit_value = max(exit_value, cost * 0.1)

                trial_values.append(exit_value)
                trial_exits.append(exit_years + rng.uniform(-0.5, 0.5))

            total_exit = sum(trial_values)
            if total_cost > 0:
                avg_exit_years = np.mean(trial_exits)
                portfolio_irr = (total_exit / total_cost) ** (1 / avg_exit_years) - 1
                portfolio_moic = total_exit / total_cost
            else:
                portfolio_irr = 0
                portfolio_moic = 1

            irrs[i] = portfolio_irr
            moics[i] = portfolio_moic
            exit_times[i] = np.mean(trial_exits)

        sorted_irrs = np.sort(irrs)
        var_idx = int(0.05 * n_trials)
        var_95 = float(sorted_irrs[var_idx])
        cvar_95 = float(np.mean(sorted_irrs[: var_idx + 1]))
        threshold = 0.10
        downside_prob = float(np.mean(irrs < threshold))

        return SimulationResult(
            irr_distribution=irrs.tolist(),
            moic_distribution=moics.tolist(),
            time_to_exit_distribution=exit_times.tolist(),
            var_95=var_95,
            cvar_95=cvar_95,
            downside_prob_below_threshold=downside_prob,
            threshold_irr=threshold,
            mean_irr=float(np.mean(irrs)),
            median_irr=float(np.median(irrs)),
            mean_moic=float(np.mean(moics)),
            median_moic=float(np.median(moics)),
            n_trials=n_trials,
            seed=seed,
        )

    def _empty_result(self, n_trials: int, seed: int | None) -> SimulationResult:
        return SimulationResult(
            irr_distribution=[],
            moic_distribution=[],
            time_to_exit_distribution=[],
            var_95=0,
            cvar_95=0,
            downside_prob_below_threshold=0,
            threshold_irr=0.10,
            mean_irr=0,
            median_irr=0,
            mean_moic=1,
            median_moic=1,
            n_trials=n_trials,
            seed=seed,
        )
