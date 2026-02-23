"""Tests for synthetic generators - determinism with seed."""
import pytest
from engine.synthetic import generate_portfolio, generate_graph


def test_portfolio_deterministic():
    p1 = generate_portfolio(n_companies=50, n_sectors=5, seed=42)
    p2 = generate_portfolio(n_companies=50, n_sectors=5, seed=42)
    assert p1.total_cost == p2.total_cost
    assert [pos["cost_basis"] for pos in p1.positions] == [pos["cost_basis"] for pos in p2.positions]


def test_portfolio_different_seeds():
    p1 = generate_portfolio(n_companies=20, seed=1)
    p2 = generate_portfolio(n_companies=20, seed=2)
    assert p1.total_cost != p2.total_cost


def test_graph_deterministic():
    g1 = generate_graph(n_nodes=100, n_edges=200, seed=42)
    g2 = generate_graph(n_nodes=100, n_edges=200, seed=42)
    e1 = sorted(g1.get_edges(), key=lambda x: (x["source"], x["target"]))
    e2 = sorted(g2.get_edges(), key=lambda x: (x["source"], x["target"]))
    assert len(e1) == len(e2) == 200
    assert [x["weight"] for x in e1] == [x["weight"] for x in e2]
