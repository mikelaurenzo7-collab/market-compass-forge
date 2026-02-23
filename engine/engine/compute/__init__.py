"""Compute backend abstraction - swap numpy/cupy for GPU acceleration."""

from engine.compute.backend import ComputeBackend
from engine.compute.config import get_backend
from engine.compute.numpy_backend import NumpyBackend
from engine.compute.cupy_backend import CupyBackend

__all__ = ["ComputeBackend", "get_backend", "NumpyBackend", "CupyBackend"]
