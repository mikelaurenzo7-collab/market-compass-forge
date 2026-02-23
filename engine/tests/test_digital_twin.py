"""Tests for Digital Twin and mitigation."""
import pytest
from engine.simulation import SimulationEngine, PortfolioInput, ScenarioParams
from engine.graph.in_memory_graph import InMemoryGraph
from engine.graph.contagion import GraphSimulationEngine, MitigationAction


def test_timeline_percentiles_ordered():
    """p5 <= p50 <= p95 for all time steps."""
    engine = SimulationEngine()
    portfolio = PortfolioInput(
        positions=[
            {"cost_basis": 10, "current_value": 12, "expected_exit_years": 5, "revenue_growth": 0.15, "leverage": 0.3},
        ],
        total_cost=10,
        total_value=12,
    )
    result = engine.run_with_timeline(portfolio, ScenarioParams(), n_trials=1000, months=24, seed=42)
    assert result.timeseries_percentiles is not None
    for step in result.timeseries_percentiles["portfolio_value"]:
        assert step["p5"] <= step["p50"] <= step["p95"]


def test_mitigation_monotonic_improvement():
    """Mitigation cannot increase total risk (monotonic improvement)."""
    g = InMemoryGraph()
    g.add_node("a")
    g.add_node("b")
    g.add_node("c")
    g.add_edge("a", "b", 1.0)
    g.add_edge("b", "c", 1.0)
    engine = GraphSimulationEngine()
    mitigation = MitigationAction(edge_reduction={("a", "b"): 0.5})
    result = engine.simulate_with_mitigation(g, {"a"}, mitigation, shock_size=1.0, decay=0.5, steps=5)
    assert result.total_risk_delta >= 0
