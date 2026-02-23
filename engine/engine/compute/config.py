"""Compute backend selection and device config. Graceful fallback when GPU unavailable."""
import logging
import os

from engine.compute.numpy_backend import NumpyBackend
from engine.compute.backend import ComputeBackend

logger = logging.getLogger(__name__)


def get_backend() -> ComputeBackend:
    """Select backend from COMPUTE_BACKEND env. Falls back to numpy if cupy/CUDA unavailable."""
    backend = os.environ.get("COMPUTE_BACKEND", "numpy").lower()
    if backend == "cupy":
        try:
            from engine.compute.cupy_backend import CupyBackend
            be = CupyBackend()
            try:
                import cupy
                if hasattr(cupy, "cuda") and hasattr(cupy.cuda, "runtime"):
                    if cupy.cuda.runtime.getDeviceCount() == 0:
                        logger.warning("CuPy loaded but no CUDA device; falling back to numpy")
                        return NumpyBackend()
            except Exception:
                pass
            return be
        except ImportError as e:
            logger.warning("COMPUTE_BACKEND=cupy but cupy not installed: %s; falling back to numpy", e)
            return NumpyBackend()
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
