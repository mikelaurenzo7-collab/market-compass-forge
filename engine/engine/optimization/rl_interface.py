"""RL-style portfolio optimization interface - policy gradient placeholder for future GPU RL."""

from dataclasses import dataclass
from typing import Any


@dataclass
class RLOptimizationResult:
    """Result from RL optimizer - placeholder for future PyTorch/DQN implementation."""
    weights: list[float]
    episode_reward: float
    n_episodes: int
    metadata: dict[str, Any]


class RLPortfolioOptimizer:
    """
    Reinforcement learning portfolio optimizer - stub for future multi-GPU RL.
    Uses simple heuristic (mean-variance style) as placeholder.
    """

    def optimize(
        self,
        scenario_returns: list[list[float]],
        n_episodes: int = 100,
        seed: int | None = None,
    ) -> RLOptimizationResult:
        """Placeholder: returns equal-weight allocation. Future: policy gradient / DQN."""
        n_assets = len(scenario_returns[0]) if scenario_returns else 0
        if n_assets == 0:
            return RLOptimizationResult(weights=[], episode_reward=0.0, n_episodes=0, metadata={})
        weights = [1.0 / n_assets] * n_assets
        import numpy as np
        R = np.array(scenario_returns)
        mean_ret = np.mean(R, axis=0)
        reward = float(np.dot(mean_ret, weights))
        return RLOptimizationResult(
            weights=weights,
            episode_reward=reward,
            n_episodes=n_episodes,
            metadata={"method": "placeholder_equal_weight", "future": "policy_gradient"},
        )
