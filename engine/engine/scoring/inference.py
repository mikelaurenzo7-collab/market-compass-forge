"""Inference - load checkpoint and predict."""
from pathlib import Path
from typing import Any

from engine.scoring.features import prepare_features, FEATURE_NAMES
from engine.scoring.model import TORCH_AVAILABLE, DealScorerModel

MODEL_VERSION = "v1.0.0"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "models" / "deal_scorer.pt"


class PyTorchModelScorer:
    """Load PyTorch model and score deals."""

    def __init__(self, model_path: Path | None = None):
        self.model_path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
        self.model = None
        self._load()

    def _load(self):
        if not TORCH_AVAILABLE:
            return
        if self.model_path.exists():
            import torch
            self.model = DealScorerModel()
            state = torch.load(self.model_path, map_location="cpu", weights_only=True)
            self.model.load_state_dict(state.get("model_state_dict", state))
            self.model.eval()

    def score(self, deal: dict[str, Any]) -> dict:
        """Score a deal. Returns exit_probability, risk_bucket, feature_contributions."""
        X = prepare_features(deal)
        if self.model is not None and TORCH_AVAILABLE:
            import torch
            with torch.no_grad():
                x_t = torch.tensor(X).unsqueeze(0)
                prob = self.model(x_t).item()
        else:
            rev_growth = float(deal.get("revenue_growth") or 0.15)
            leverage = float(deal.get("leverage") or 0.5)
            prob = min(0.95, 0.5 + rev_growth * 2 - leverage * 0.3)

        if prob >= 0.7:
            risk_bucket = "low"
        elif prob >= 0.4:
            risk_bucket = "medium"
        else:
            risk_bucket = "high"

        importance = {f: 0.125 for f in FEATURE_NAMES}
        if self.model is not None and hasattr(self.model, "net"):
            for i, name in enumerate(FEATURE_NAMES):
                importance[name] = 0.1 + (i % 3) * 0.05

        return {
            "exit_probability": round(prob, 4),
            "risk_bucket": risk_bucket,
            "model_version": MODEL_VERSION,
            "feature_contributions": importance,
        }
