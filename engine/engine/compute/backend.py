"""ComputeBackend Protocol - required ops for simulation kernels."""
from typing import Protocol, Any
from numpy.typing import NDArray


class ComputeBackend(Protocol):
    """Protocol for numeric backends. Implement with numpy, cupy, or RAPIDS."""

    def array(self, data: Any, dtype: Any = None) -> Any:
        """Create array from data."""
        ...

    def zeros(self, shape: tuple[int, ...], dtype: Any = None) -> Any:
        """Create zeros array."""
        ...

    def ones(self, shape: tuple[int, ...], dtype: Any = None) -> Any:
        """Create ones array."""
        ...

    def random_normal(self, size: tuple[int, ...], mean: float = 0, std: float = 1, seed: int | None = None) -> Any:
        """Standard normal random samples."""
        ...

    def random_student_t(self, df: float, size: tuple[int, ...], seed: int | None = None) -> Any:
        """Student-t random samples for fat tails."""
        ...

    def random_uniform(self, low: float, high: float, size: tuple[int, ...], seed: int | None = None) -> Any:
        """Uniform random samples."""
        ...

    def dot(self, a: Any, b: Any) -> Any:
        """Matrix/vector dot product."""
        ...

    def matmul(self, a: Any, b: Any) -> Any:
        """Matrix multiplication."""
        ...

    def cholesky(self, a: Any) -> Any:
        """Cholesky decomposition L where a = L @ L.T."""
        ...

    def quantile(self, a: Any, q: float) -> float:
        """Quantile of array (0-1)."""
        ...

    def quantiles(self, a: Any, q: list[float]) -> list[float]:
        """Multiple quantiles."""
        ...

    def mean(self, a: Any) -> float:
        """Mean of array."""
        ...

    def std(self, a: Any) -> float:
        """Standard deviation."""
        ...

    def clip(self, a: Any, min_val: float, max_val: float) -> Any:
        """Clip values."""
        ...

    def exp(self, a: Any) -> Any:
        """Exponential."""
        ...

    def log(self, a: Any) -> Any:
        """Natural log."""
        ...

    def sqrt(self, a: Any) -> Any:
        """Square root."""
        ...

    def sum(self, a: Any, axis: int | None = None) -> Any:
        """Sum along axis."""
        ...

    def sort(self, a: Any) -> Any:
        """Sort array."""
        ...

    def reshape(self, a: Any, shape: tuple[int, ...]) -> Any:
        """Reshape array."""
        ...

    def cumsum(self, a: Any, axis: int | None = None) -> Any:
        """Cumulative sum along axis."""
        ...

    def as_numpy(self, a: Any) -> NDArray:
        """Convert to numpy for serialization. Must return numpy array."""
        ...

    def tolist(self, a: Any) -> list:
        """Convert to Python list."""
        ...

    def proportion_less_than(self, a: Any, threshold: float) -> float:
        """Proportion of elements < threshold."""
        ...
