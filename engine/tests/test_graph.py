"""Unit tests for graph analytics and contagion."""
import pytest
from engine.graph.in_memory_graph import InMemoryGraph
from engine.graph.analytics import degree_centrality, eigenvector_centrality, betweenness_centrality, exposure_propagation
from engine.graph.contagion import GraphSimulationEngine


def test_degree_centrality():
    g = InMemoryGraph()
    g.add_node("a")
    g.add_node("b")
    g.add_node("c")
    g.add_edge("a", "b")
    g.add_edge("b", "c")
    g.add_edge("a", "c")
    deg = degree_centrality(g)
    assert deg["a"] == 2
    assert deg["b"] == 2
    assert deg["c"] == 2


def test_exposure_propagation_monotonicity():
    g = InMemoryGraph()
    g.add_node("a")
    g.add_node("b")
    g.add_node("c")
    g.add_edge("a", "b", weight=1.0)
    g.add_edge("b", "c", weight=1.0)
    r1 = exposure_propagation(g, {"a"}, shock_size=1.0, decay=0.5, steps=2)
    r2 = exposure_propagation(g, {"a"}, shock_size=1.0, decay=0.5, steps=5)
    assert r2["c"] >= r1["c"]


def test_contagion_determinism():
    g = InMemoryGraph()
    g.add_node("x")
    g.add_node("y")
    g.add_edge("x", "y", weight=1.0)
    engine = GraphSimulationEngine()
    r1 = engine.simulate_liquidity_shock(g, {"x"}, shock_size=1.0, decay=0.5, steps=3, seed=42)
    r2 = engine.simulate_liquidity_shock(g, {"x"}, shock_size=1.0, decay=0.5, steps=3, seed=42)
    assert r1.per_node_risk == r2.per_node_risk
    assert r1.top_impacted_nodes == r2.top_impacted_nodes
