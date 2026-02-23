"""Deal scoring - PyTorch MLP, GPU-ready."""

from engine.scoring.features import prepare_features, FEATURE_NAMES
from engine.scoring.model import DealScorerModel
from engine.scoring.inference import PyTorchModelScorer
from engine.scoring.train import train_model
from engine.scoring.registry import register_version, get_latest_version

__all__ = [
    "prepare_features",
    "FEATURE_NAMES",
    "DealScorerModel",
    "PyTorchModelScorer",
    "train_model",
    "register_version",
    "get_latest_version",
]
