"""Graph analytics: centrality, exposure propagation."""
from typing import Any
from engine.graph.graph_repository import GraphRepository


def degree_centrality(graph: GraphRepository) -> dict[str, int]:
    """Degree centrality: count of edges per node."""
    nodes = {n["id"]: 0 for n in graph.get_nodes()}
    for e in graph.get_edges():
        nodes[e["source"]] = nodes.get(e["source"], 0) + 1
        nodes[e["target"]] = nodes.get(e["target"], 0) + 1
    return nodes


def eigenvector_centrality(graph: GraphRepository, max_iter: int = 100, tol: float = 1e-6) -> dict[str, float]:
    """Eigenvector centrality via power iteration."""
    nodes = [n["id"] for n in graph.get_nodes()]
    n = len(nodes)
    if n == 0:
        return {}
    idx = {ni: i for i, ni in enumerate(nodes)}
    import numpy as np
    A = np.zeros((n, n))
    for e in graph.get_edges():
        s, t = e["source"], e["target"]
        w = e.get("weight", 1.0)
        if s in idx and t in idx:
            A[idx[t], idx[s]] += w
    x = np.ones(n) / n
    for _ in range(max_iter):
        xnew = A @ x
        norm = np.linalg.norm(xnew)
        if norm < 1e-10:
            break
        xnew /= norm
        if np.linalg.norm(xnew - x) < tol:
            break
        x = xnew
    return {nodes[i]: float(x[i]) for i in range(n)}


def betweenness_centrality(graph: GraphRepository) -> dict[str, float]:
    """Betweenness centrality - count shortest paths through each node."""
    nodes = [n["id"] for n in graph.get_nodes()]
    n = len(nodes)
    if n == 0:
        return {}
    idx = {ni: i for i, ni in enumerate(nodes)}
    INF = 1e18
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for e in graph.get_edges():
        s, t = idx.get(e["source"]), idx.get(e["target"])
        if s is not None and t is not None:
            w = 1.0 / max(e.get("weight", 1.0), 0.01)
            dist[s][t] = min(dist[s][t], w)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    between = [0.0] * n
    for s in range(n):
        for t in range(n):
            if s != t and dist[s][t] < INF:
                for v in range(n):
                    if v != s and v != t and dist[s][v] + dist[v][t] <= dist[s][t] + 1e-9:
                        between[v] += 1.0
    return {nodes[i]: between[i] for i in range(n)}


def exposure_propagation(
    graph: GraphRepository,
    shocked_nodes: set[str],
    shock_size: float,
    decay: float,
    steps: int,
) -> dict[str, float]:
    """Propagate shock from initial nodes with decay over hops."""
    risk = {n["id"]: 0.0 for n in graph.get_nodes()}
    for sn in shocked_nodes:
        risk[sn] = shock_size
    for _ in range(steps - 1):
        new_risk = dict(risk)
        for e in graph.get_edges():
            s, t, w = e["source"], e["target"], e.get("weight", 1.0)
            if risk[s] > 0:
                new_risk[t] = max(new_risk[t], risk[s] * decay * w)
            if risk[t] > 0:
                new_risk[s] = max(new_risk[s], risk[t] * decay * w)
        risk = new_risk
    return risk
