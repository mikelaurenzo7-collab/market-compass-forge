"""Numpy implementation of ComputeBackend."""
from typing import Any
import numpy as np
from numpy.typing import NDArray


class NumpyBackend:
    """CPU backend using numpy."""

    def array(self, data: Any, dtype: Any = None) -> NDArray:
        return np.array(data, dtype=dtype)

    def zeros(self, shape: tuple[int, ...], dtype: Any = None) -> NDArray:
        return np.zeros(shape, dtype=dtype or np.float64)

    def ones(self, shape: tuple[int, ...], dtype: Any = None) -> NDArray:
        return np.ones(shape, dtype=dtype or np.float64)

    def random_normal(self, size: tuple[int, ...], mean: float = 0, std: float = 1, seed: int | None = None) -> NDArray:
        rng = np.random.default_rng(seed)
        return rng.normal(mean, std, size).astype(np.float64)

    def random_student_t(self, df: float, size: tuple[int, ...], seed: int | None = None) -> NDArray:
        rng = np.random.default_rng(seed)
        return rng.standard_t(df, size).astype(np.float64)

    def random_uniform(self, low: float, high: float, size: tuple[int, ...], seed: int | None = None) -> NDArray:
        rng = np.random.default_rng(seed)
        return rng.uniform(low, high, size).astype(np.float64)

    def dot(self, a: Any, b: Any) -> NDArray:
        return np.dot(a, b)

    def matmul(self, a: Any, b: Any) -> NDArray:
        return np.matmul(a, b)

    def cholesky(self, a: Any) -> NDArray:
        return np.linalg.cholesky(a)

    def quantile(self, a: Any, q: float) -> float:
        return float(np.quantile(a, q))

    def quantiles(self, a: Any, q: list[float]) -> list[float]:
        return [float(np.quantile(a, qi)) for qi in q]

    def mean(self, a: Any) -> float:
        return float(np.mean(a))

    def std(self, a: Any) -> float:
        return float(np.std(a))

    def clip(self, a: Any, min_val: float, max_val: float) -> NDArray:
        return np.clip(a, min_val, max_val)

    def exp(self, a: Any) -> NDArray:
        return np.exp(a)

    def log(self, a: Any) -> NDArray:
        return np.log(a)

    def sqrt(self, a: Any) -> NDArray:
        return np.sqrt(a)

    def sum(self, a: Any, axis: int | None = None) -> Any:
        return np.sum(a, axis=axis)

    def sort(self, a: Any) -> NDArray:
        return np.sort(a)

    def reshape(self, a: Any, shape: tuple[int, ...]) -> NDArray:
        return np.reshape(a, shape)

    def cumsum(self, a: Any, axis: int | None = None) -> NDArray:
        return np.cumsum(a, axis=axis)

    def as_numpy(self, a: Any) -> NDArray:
        return np.asarray(a) if not isinstance(a, np.ndarray) else a

    def tolist(self, a: Any) -> list:
        return np.asarray(a).tolist()

    def proportion_less_than(self, a: Any, threshold: float) -> float:
        return float(np.mean(np.asarray(a) < threshold))
