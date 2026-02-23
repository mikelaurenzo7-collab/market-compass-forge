"""PyTorch MLP for deal scoring - GPU-ready."""
try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from engine.scoring.features import FEATURE_NAMES


if TORCH_AVAILABLE:

    class DealScorerModel(nn.Module):
        """MLP: 8 -> 32 -> 16 -> 1 with sigmoid."""

        def __init__(self, input_dim: int = 8, hidden: list[int] = [32, 16]):
            super().__init__()
            layers = []
            prev = input_dim
            for h in hidden:
                layers.append(nn.Linear(prev, h))
                layers.append(nn.ReLU())
                layers.append(nn.Dropout(0.1))
                prev = h
            layers.append(nn.Linear(prev, 1))
            self.net = nn.Sequential(*layers)

        def forward(self, x):
            return torch.sigmoid(self.net(x))

else:
    DealScorerModel = None
