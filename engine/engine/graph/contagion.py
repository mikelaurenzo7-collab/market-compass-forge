"""Capital contagion simulation - liquidity shock propagation + mitigation."""
import time
from dataclasses import dataclass, field
from typing import Any

from engine.graph.graph_repository import GraphRepository
from engine.graph.analytics import exposure_propagation
from engine.utils.hardware import get_compute_backend_name, get_torch_device


@dataclass
class ContagionResult:
    """Result of contagion simulation."""
    per_node_risk: dict[str, float]
    top_impacted_nodes: list[tuple[str, float]]
    total_risk: float
    num_impacted: int
    compute_backend_used: str = "numpy"
    torch_device_used: str = "cpu"
    runtime_ms: float = 0


@dataclass
class MitigationAction:
    """Reduce edge weight or add liquidity buffer."""
    edge_reduction: dict[tuple[str, str], float] = field(default_factory=dict)
    liquidity_buffer: dict[str, float] = field(default_factory=dict)


@dataclass
class ContagionWithMitigationResult:
    """Baseline + mitigated + delta."""
    baseline: ContagionResult
    mitigated: ContagionResult
    delta_improvement: dict[str, float]
    total_risk_delta: float


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
        """Run contagion simulation."""
        t0 = time.perf_counter()
        risk = exposure_propagation(graph, shocked_nodes, shock_size, decay, steps)
        sorted_nodes = sorted(risk.items(), key=lambda x: -x[1])
        top_impacted = [(n, r) for n, r in sorted_nodes if r > 0][:20]
        total_risk = sum(risk.values())
        num_impacted = sum(1 for r in risk.values() if r > 0)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return ContagionResult(
            per_node_risk=risk,
            top_impacted_nodes=top_impacted,
            total_risk=total_risk,
            num_impacted=num_impacted,
            compute_backend_used=get_compute_backend_name(),
            torch_device_used=get_torch_device(),
            runtime_ms=round(elapsed_ms, 2),
        )

    def simulate_with_mitigation(
        self,
        graph: GraphRepository,
        shocked_nodes: set[str],
        mitigation: MitigationAction,
        shock_size: float = 1.0,
        decay: float = 0.5,
        steps: int = 5,
    ) -> ContagionWithMitigationResult:
        """Run baseline contagion, then with mitigated graph (reduced edges)."""
        baseline = self.simulate_liquidity_shock(graph, shocked_nodes, shock_size, decay, steps)
        mitigated_graph = _apply_mitigation(graph, mitigation)
        mitigated = self.simulate_liquidity_shock(
            mitigated_graph, shocked_nodes, shock_size, decay, steps
        )
        delta = {
            n: baseline.per_node_risk.get(n, 0) - mitigated.per_node_risk.get(n, 0)
            for n in set(baseline.per_node_risk) | set(mitigated.per_node_risk)
        }
        total_delta = baseline.total_risk - mitigated.total_risk
        return ContagionWithMitigationResult(
            baseline=baseline,
            mitigated=mitigated,
            delta_improvement=delta,
            total_risk_delta=total_delta,
        )


def _apply_mitigation(graph: GraphRepository, mitigation: MitigationAction) -> GraphRepository:
    """Return a graph with reduced edge weights (mitigation cannot increase risk)."""
    from engine.graph.in_memory_graph import InMemoryGraph
    g = InMemoryGraph()
    for n in graph.get_nodes():
        g.add_node(n["id"], n.get("label", ""), n.get("type", "default"))
    edge_reduction = mitigation.edge_reduction
    for e in graph.get_edges():
        s, t = e["source"], e["target"]
        w = e.get("weight", 1.0)
        red = edge_reduction.get((s, t)) or edge_reduction.get((t, s)) or 0
        w = max(0, w * (1 - red))
        g.add_edge(s, t, w, e.get("type", "default"))
    return g
