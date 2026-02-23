"""Shock generation kernels - backend-only for GPU swap."""
from typing import Any

from engine.compute.backend import ComputeBackend


def correlated_shocks(
    backend: ComputeBackend,
    n_trials: int,
    n_dim: int,
    correlation_matrix: list[list[float]] | None,
    seed: int | None = None,
) -> Any:
    """Generate correlated normal shocks. Z ~ N(0,I); shocks = Z @ L.T."""
    if correlation_matrix and len(correlation_matrix) >= n_dim:
        corr = backend.array([row[:n_dim] for row in correlation_matrix[:n_dim]])
        L = backend.cholesky(corr)
        Z = backend.random_normal((n_trials, n_dim), seed=seed)
        return backend.matmul(Z, L.T)
    return backend.random_normal((n_trials, n_dim), seed=seed)


def regime_switching_sampler(
    backend: ComputeBackend,
    n_trials: int,
    p_crisis: float,
    crisis_vol_mult: float,
    crisis_multiple_compression_extra: float,
    seed: int | None = None,
) -> tuple[Any, Any]:
    """Return (vol_mult, mult_extra) arrays of shape (n_trials, 1)."""
    if p_crisis <= 0:
        return backend.ones((n_trials, 1)), backend.zeros((n_trials, 1))
    crisis = backend.random_uniform(0, 1, (n_trials, 1), seed=seed)
    crisis_np = backend.as_numpy(crisis)
    is_crisis = backend.array((crisis_np < p_crisis).astype(float))
    vol_mult = backend.ones((n_trials, 1)) + (crisis_vol_mult - 1) * is_crisis
    mult_extra = crisis_multiple_compression_extra * is_crisis
    return vol_mult, mult_extra
