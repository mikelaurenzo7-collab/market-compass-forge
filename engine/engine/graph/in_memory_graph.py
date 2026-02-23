"""In-memory graph for tests and seed data."""
from engine.graph.graph_repository import GraphRepository


class InMemoryGraph(GraphRepository):
    """In-memory graph implementation."""

    def __init__(self):
        self._nodes: dict[str, dict] = {}
        self._edges: list[tuple[str, str, float, str]] = []

    def add_node(self, node_id: str, label: str = "", node_type: str = "default"):
        self._nodes[node_id] = {"id": node_id, "label": label or node_id, "type": node_type}

    def add_edge(self, source: str, target: str, weight: float = 1.0, edge_type: str = "default"):
        self._edges.append((source, target, weight, edge_type))

    def get_nodes(self) -> list[dict]:
        return list(self._nodes.values())

    def get_edges(self) -> list[dict]:
        return [
            {"source": s, "target": t, "weight": w, "type": et}
            for s, t, w, et in self._edges
        ]

    def get_neighbors(self, node_id: str, direction: str = "out") -> list[tuple[str, float]]:
        result = []
        for s, t, w, _ in self._edges:
            if direction == "out" and s == node_id:
                result.append((t, w))
            elif direction == "in" and t == node_id:
                result.append((s, w))
            elif direction == "both" and (s == node_id or t == node_id):
                other = t if s == node_id else s
                result.append((other, w))
        return result
