"""Acceleration-critical kernels - backend-only ops for numpy/cupy swap."""

from engine.kernels.shocks import correlated_shocks, regime_switching_sampler
from engine.kernels.summary import quantile_summary

__all__ = ["correlated_shocks", "regime_switching_sampler", "quantile_summary"]
