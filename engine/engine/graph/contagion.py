"""Capital contagion simulation - liquidity shock propagation."""
from dataclasses import dataclass, field
from engine.graph.graph_repository import GraphRepository
from engine.graph.analytics import exposure_propagation


@dataclass
class ContagionResult:
    """Result of contagion simulation."""
    per_node_risk: dict[str, float]
    top_impacted_nodes: list[tuple[str, float]]
    total_risk: float
    num_impacted: int


class GraphSimulationEngine:
    """Simulate liquidity shock contagion over a relationship graph."""

    def simulate_liquidity_shock(
        self,
        graph: GraphRepository,
        shocked_nodes: set[str],
        shock_size: float = 1.0,
        decay: float = 0.5,
        steps: int = 5,
        seed: int | None = None,
    ) -> ContagionResult:
        """Run contagion simulation. Deterministic given seed (shocked_nodes order)."""
        risk = exposure_propagation(graph, shocked_nodes, shock_size, decay, steps)
        sorted_nodes = sorted(risk.items(), key=lambda x: -x[1])
        top_impacted = [(n, r) for n, r in sorted_nodes if r > 0][:20]
        total_risk = sum(risk.values())
        num_impacted = sum(1 for r in risk.values() if r > 0)
        return ContagionResult(
            per_node_risk=risk,
            top_impacted_nodes=top_impacted,
            total_risk=total_risk,
            num_impacted=num_impacted,
        )
