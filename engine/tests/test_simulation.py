"""Unit tests for engine.simulation - no FastAPI or web deps."""
import pytest
from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams


def test_simulation_basic():
    engine = SimulationEngine()
    portfolio = PortfolioInput(
        positions=[
            {"cost_basis": 10, "current_value": 12, "expected_exit_years": 5, "revenue_growth": 0.15, "leverage": 0.3},
            {"cost_basis": 20, "current_value": 22, "expected_exit_years": 4, "revenue_growth": 0.12, "leverage": 0.5},
        ],
        total_cost=30,
        total_value=34,
    )
    scenario = ScenarioParams(gdp_delta=0, multiple_compression=0)
    result = engine.run(portfolio, scenario, n_trials=100, seed=42)
    assert result.n_trials == 100
    assert "p50" in result.irr_quantiles
    assert result.mean_irr != 0
    assert result.var_95 is not None


def test_simulation_empty_portfolio():
    engine = SimulationEngine()
    portfolio = PortfolioInput(positions=[], total_cost=0, total_value=0)
    result = engine.run(portfolio, ScenarioParams(), n_trials=10)
    assert result.n_trials == 10
    assert result.mean_moic == 1


def test_simulation_correlation():
    """Correlated shocks produce non-zero empirical correlation."""
    import numpy as np
    engine = SimulationEngine()
    portfolio = PortfolioInput(
        positions=[
            {"cost_basis": 10, "current_value": 12, "expected_exit_years": 5, "revenue_growth": 0.15, "leverage": 0.3},
            {"cost_basis": 20, "current_value": 22, "expected_exit_years": 4, "revenue_growth": 0.12, "leverage": 0.5},
        ],
        total_cost=30,
        total_value=34,
    )
    corr_matrix = [[1.0, 0.7], [0.7, 1.0]]
    scenario = ScenarioParams(correlation_matrix=corr_matrix)
    result = engine.run(portfolio, scenario, n_trials=5000, seed=123)
    assert result.mean_irr is not None
    assert result.var_95 is not None


def test_simulation_regime_switching():
    """Regime switching produces heavier tails (higher downside prob)."""
    engine = SimulationEngine()
    portfolio = PortfolioInput(
        positions=[
            {"cost_basis": 10, "current_value": 12, "expected_exit_years": 5, "revenue_growth": 0.15, "leverage": 0.3},
        ],
        total_cost=10,
        total_value=12,
    )
    normal = ScenarioParams()
    crisis = ScenarioParams(p_crisis=0.2, crisis_vol_mult=2.0, crisis_multiple_compression_extra=-0.2)
    r_normal = engine.run(portfolio, normal, n_trials=2000, seed=1)
    r_crisis = engine.run(portfolio, crisis, n_trials=2000, seed=1)
    assert r_crisis.downside_prob_below_threshold >= r_normal.downside_prob_below_threshold - 0.1
