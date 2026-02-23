"""Hardware detection and device configuration."""
import logging
import os

logger = logging.getLogger(__name__)


def detect_gpu() -> bool:
    """Return True if a CUDA GPU is available (CuPy or PyTorch)."""
    try:
        import cupy
        try:
            return cupy.cuda.runtime.getDeviceCount() > 0
        except Exception:
            return True
    except ImportError:
        pass
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        pass
    return False


def get_compute_backend_name() -> str:
    """Return current compute backend (numpy|cupy)."""
    return os.environ.get("COMPUTE_BACKEND", "numpy").lower()


def get_torch_device() -> str:
    """Return torch device: cuda if available and TORCH_DEVICE=cuda, else cpu."""
    device = os.environ.get("TORCH_DEVICE", "cpu").lower()
    if device == "cuda":
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
        except ImportError:
            pass
    return "cpu"


def get_hardware_summary() -> dict:
    """Full hardware summary for /system/hardware endpoint."""
    info = get_hardware_info()
    info["compute_backend_effective"] = _get_effective_backend()
    info["torch_device_effective"] = _get_effective_torch_device()
    return info


def get_effective_compute_backend() -> str:
    """Backend actually in use (may be fallback). Use in result metadata."""
    return _get_effective_backend()


def _get_effective_backend() -> str:
    """Backend actually in use (may be fallback)."""
    requested = os.environ.get("COMPUTE_BACKEND", "numpy").lower()
    if requested == "cupy":
        try:
            import cupy
            if not detect_gpu():
                logger.warning("COMPUTE_BACKEND=cupy but no CUDA device; falling back to numpy")
                return "numpy(fallback)"
            return "cupy"
        except ImportError:
            logger.warning("COMPUTE_BACKEND=cupy but cupy not installed; falling back to numpy")
            return "numpy(fallback)"
    return "numpy"


def get_effective_torch_device() -> str:
    """Torch device actually in use (may be fallback). Use in result metadata."""
    return _get_effective_torch_device()


def _get_effective_torch_device() -> str:
    """Torch device actually in use (may be fallback)."""
    requested = os.environ.get("TORCH_DEVICE", "cpu").lower()
    if requested == "cuda":
        try:
            import torch
            if not torch.cuda.is_available():
                logger.warning("TORCH_DEVICE=cuda but not available; falling back to cpu")
                return "cpu(fallback)"
            return "cuda"
        except ImportError:
            return "cpu(fallback)"
    return "cpu"


def get_hardware_info() -> dict:
    """Basic hardware info for benchmarks."""
    info = {
        "gpu_present": detect_gpu(),
        "compute_backend": get_compute_backend_name(),
        "torch_device": get_torch_device(),
    }
    try:
        import platform
        info["cpu_model"] = platform.processor() or "unknown"
    except Exception:
        info["cpu_model"] = "unknown"
    try:
        import psutil
        info["ram_gb"] = round(psutil.virtual_memory().total / (1024**3), 1)
    except ImportError:
        info["ram_gb"] = None
    try:
        import torch
        if torch.cuda.is_available():
            info["cuda_device_name"] = torch.cuda.get_device_name(0)
        else:
            info["cuda_device_name"] = None
    except ImportError:
        info["cuda_device_name"] = None
    try:
        import cupy
        if detect_gpu():
            info["cupy_available"] = True
        else:
            info["cupy_available"] = False
    except ImportError:
        info["cupy_available"] = False
    info["rapids_cugraph"] = os.environ.get("RAPIDS_CUGRAPH", "").lower() == "1"
    return info


def get_gpu_roadmap() -> dict:
    """GPU acceleration roadmap for /system/gpu-roadmap endpoint."""
    return {
        "current": {
            "compute": "numpy (CPU) or CuPy (GPU)",
            "graph": "in-memory Python",
            "scoring": "PyTorch (CPU/CUDA)",
        },
        "roadmap": [
            "CuPy in production: set COMPUTE_BACKEND=cupy",
            "RAPIDS cuGraph: graph analytics on GPU (future)",
            "Multi-GPU distributed: Dask + CuPy (future)",
        ],
    }
