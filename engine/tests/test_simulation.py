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
    assert len(result.irr_distribution) == 100
    assert result.mean_irr != 0
    assert result.var_95 is not None


def test_simulation_empty_portfolio():
    engine = SimulationEngine()
    portfolio = PortfolioInput(positions=[], total_cost=0, total_value=0)
    result = engine.run(portfolio, ScenarioParams(), n_trials=10)
    assert result.n_trials == 10
    assert result.mean_moic == 1
