"""Graph repository interface. Implement with Postgres or Neo4j."""

from abc import ABC, abstractmethod
from typing import Any


class GraphRepository(ABC):
    """Abstract graph repository. Swap Postgres/Neo4j implementations."""

    @abstractmethod
    def get_entities(self, org_id: str, entity_types: list[str] | None = None, limit: int = 500) -> list[dict]:
        pass

    @abstractmethod
    def get_relationships(
        self,
        org_id: str,
        source_id: str | None = None,
        target_id: str | None = None,
        rel_types: list[str] | None = None,
        limit: int = 200,
    ) -> list[dict]:
        pass

    @abstractmethod
    def get_subgraph(self, org_id: str, center_id: str, depth: int = 2) -> dict[str, Any]:
        pass


def degree_centrality(relationships: list[dict]) -> list[tuple[str, int]]:
    """Simple degree centrality from relationship list."""
    counts: dict[str, int] = {}
    for r in relationships:
        for key in ("source_id", "target_id"):
            if key in r:
                sid = str(r[key])
                counts[sid] = counts.get(sid, 0) + 1
    return sorted(counts.items(), key=lambda x: -x[1])
