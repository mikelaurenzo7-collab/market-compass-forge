"""CuPy implementation of ComputeBackend."""
from typing import Any


def _cupy_available() -> bool:
    try:
        import cupy
        return True
    except ImportError:
        return False


class CupyBackend:
    """GPU backend using CuPy. Raises if cupy not installed."""

    def __init__(self):
        try:
            import cupy as cp
            self._cp = cp
        except ImportError as e:
            raise ImportError(
                "CuPy is not installed. Install with: pip install cupy-cuda12x (or cupy-cuda11x). "
                "Set COMPUTE_BACKEND=numpy for CPU-only."
            ) from e

    def array(self, data: Any, dtype: Any = None) -> Any:
        return self._cp.array(data, dtype=dtype)

    def zeros(self, shape: tuple[int, ...], dtype: Any = None) -> Any:
        return self._cp.zeros(shape, dtype=dtype or self._cp.float64)

    def ones(self, shape: tuple[int, ...], dtype: Any = None) -> Any:
        return self._cp.ones(shape, dtype=dtype or self._cp.float64)

    def random_normal(self, size: tuple[int, ...], mean: float = 0, std: float = 1, seed: int | None = None) -> Any:
        rng = self._cp.random.default_rng(seed)
        return rng.normal(mean, std, size).astype(self._cp.float64)

    def random_student_t(self, df: float, size: tuple[int, ...], seed: int | None = None) -> Any:
        rng = self._cp.random.default_rng(seed)
        return rng.standard_t(df, size).astype(self._cp.float64)

    def random_uniform(self, low: float, high: float, size: tuple[int, ...], seed: int | None = None) -> Any:
        rng = self._cp.random.default_rng(seed)
        return rng.uniform(low, high, size).astype(self._cp.float64)

    def dot(self, a: Any, b: Any) -> Any:
        return self._cp.dot(a, b)

    def matmul(self, a: Any, b: Any) -> Any:
        return self._cp.matmul(a, b)

    def cholesky(self, a: Any) -> Any:
        return self._cp.linalg.cholesky(a)

    def quantile(self, a: Any, q: float) -> float:
        return float(self._cp.quantile(a, q))

    def quantiles(self, a: Any, q: list[float]) -> list[float]:
        return [float(self._cp.quantile(a, qi)) for qi in q]

    def mean(self, a: Any) -> float:
        return float(self._cp.mean(a))

    def std(self, a: Any) -> float:
        return float(self._cp.std(a))

    def clip(self, a: Any, min_val: float, max_val: float) -> Any:
        return self._cp.clip(a, min_val, max_val)

    def exp(self, a: Any) -> Any:
        return self._cp.exp(a)

    def log(self, a: Any) -> Any:
        return self._cp.log(a)

    def sqrt(self, a: Any) -> Any:
        return self._cp.sqrt(a)

    def sum(self, a: Any, axis: int | None = None) -> Any:
        return self._cp.sum(a, axis=axis)

    def sort(self, a: Any) -> Any:
        return self._cp.sort(a)

    def reshape(self, a: Any, shape: tuple[int, ...]) -> Any:
        return self._cp.reshape(a, shape)

    def as_numpy(self, a: Any):
        import numpy as np
        return np.asarray(a.get())

    def tolist(self, a: Any) -> list:
        return self.as_numpy(a).tolist()

    def proportion_less_than(self, a: Any, threshold: float) -> float:
        import numpy as np
        return float(np.mean(self.as_numpy(a) < threshold))
