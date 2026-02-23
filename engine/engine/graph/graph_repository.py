"""Graph repository interface - implement with Postgres, Neo4j, or in-memory."""
from abc import ABC, abstractmethod
from typing import Any


class GraphRepository(ABC):
    """Abstract graph repository."""

    @abstractmethod
    def get_nodes(self) -> list[dict]:
        """Return all nodes with id, label, type."""
        pass

    @abstractmethod
    def get_edges(self) -> list[dict]:
        """Return all edges with source, target, weight, type."""
        pass

    @abstractmethod
    def get_neighbors(self, node_id: str, direction: str = "out") -> list[tuple[str, float]]:
        """Get (neighbor_id, weight) for node."""
        pass
