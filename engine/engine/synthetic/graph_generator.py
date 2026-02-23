"""Synthetic graph generator for scale benchmarks."""
import random
from engine.graph.in_memory_graph import InMemoryGraph


def generate_graph(
    n_nodes: int = 10000,
    n_edges: int = 50000,
    seed: int | None = None,
) -> InMemoryGraph:
    """Generate weighted directed graph. Deterministic given seed."""
    rng = random.Random(seed)
    g = InMemoryGraph()
    for i in range(n_nodes):
        g.add_node(str(i), f"n{i}", "node")
    edges_added = 0
    while edges_added < n_edges:
        s = rng.randint(0, n_nodes - 1)
        t = rng.randint(0, n_nodes - 1)
        if s != t:
            w = 0.1 + rng.gammavariate(1, 0.5)
            g.add_edge(str(s), str(t), round(w, 4), "exposure")
            edges_added += 1
    return g
