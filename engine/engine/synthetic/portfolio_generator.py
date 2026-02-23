"""Synthetic portfolio generator for scale benchmarks."""
import random
from engine.simulation import PortfolioInput


def generate_portfolio(
    n_companies: int = 1000,
    n_sectors: int = 30,
    seed: int | None = None,
) -> PortfolioInput:
    """Generate a portfolio with realistic distributions. Deterministic given seed."""
    rng = random.Random(seed)
    sectors = [f"sector_{i % n_sectors}" for i in range(n_companies)]
    rng.shuffle(sectors)
    positions = []
    total_cost = 0
    total_value = 0
    for i in range(n_companies):
        cost = 5 + rng.gammavariate(2, 5)
        multiple = 0.8 + rng.gammavariate(2, 0.15)
        current = cost * multiple
        exit_years = 3 + rng.gammavariate(2, 1.5)
        rev_growth = 0.05 + rng.gammavariate(1.5, 0.05)
        leverage = rng.gammavariate(1, 0.2)
        positions.append({
            "company_name": f"Company_{i}",
            "sector": sectors[i],
            "cost_basis": round(cost, 2),
            "current_value": round(current, 2),
            "expected_exit_years": round(exit_years, 1),
            "revenue_growth": round(min(rev_growth, 0.5), 4),
            "leverage": round(min(leverage, 1.5), 4),
        })
        total_cost += positions[-1]["cost_basis"]
        total_value += positions[-1]["current_value"]
    return PortfolioInput(positions=positions, total_cost=total_cost, total_value=total_value)
