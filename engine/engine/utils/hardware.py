"""Hardware detection and device configuration."""
import os


def detect_gpu() -> bool:
    """Return True if a CUDA GPU is available."""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        pass
    try:
        import cupy
        return True
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
    return info
