"""Compute backend selection."""
import os

from engine.compute.backend import ComputeBackend
from engine.compute.numpy_backend import NumpyBackend
from engine.compute.cupy_backend import CupyBackend


def get_backend() -> ComputeBackend:
    """Select backend from COMPUTE_BACKEND env (numpy|cupy). Default: numpy."""
    backend = os.environ.get("COMPUTE_BACKEND", "numpy").lower()
    if backend == "cupy":
        return CupyBackend()
    return NumpyBackend()
