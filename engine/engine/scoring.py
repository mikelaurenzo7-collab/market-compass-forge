"""Deal scoring interface. ModelTrainer / ModelScorer - swappable implementations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class ScoreResult:
    exit_probability: float
    risk_bucket: str
    model_version: str
    feature_contributions: dict[str, float]


class ModelScorer(ABC):
    """Abstract deal scorer."""

    @abstractmethod
    def score(self, deal: dict[str, Any]) -> ScoreResult:
        pass


class ModelTrainer(ABC):
    """Abstract model trainer."""

    @abstractmethod
    def train(self, X: list[dict], y: list[int]) -> None:
        """Train on historical deals. y: 1=successful exit, 0=failed."""
        pass
