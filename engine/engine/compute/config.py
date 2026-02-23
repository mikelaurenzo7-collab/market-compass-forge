"""Compute backend selection and device config."""
import os

from engine.compute.numpy_backend import NumpyBackend
from engine.compute.cupy_backend import CupyBackend


def get_backend() -> "ComputeBackend":
    """Select backend from COMPUTE_BACKEND env (numpy|cupy). Default: numpy."""
    backend = os.environ.get("COMPUTE_BACKEND", "numpy").lower()
    if backend == "cupy":
        return CupyBackend()
    return NumpyBackend()


def get_torch_device() -> str:
    """Return torch device from TORCH_DEVICE env (cpu|cuda)."""
    device = os.environ.get("TORCH_DEVICE", "cpu").lower()
    if device == "cuda":
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
        except ImportError:
            pass
    return "cpu"


from engine.compute.backend import ComputeBackend
