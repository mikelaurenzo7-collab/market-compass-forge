"""Training loop - saves checkpoint + metadata."""
from pathlib import Path
import json

from engine.scoring.features import prepare_features
from engine.scoring.model import TORCH_AVAILABLE, DealScorerModel

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "models" / "deal_scorer.pt"
DEFAULT_METADATA_PATH = Path(__file__).parent.parent.parent / "models" / "metadata.json"


def train_model(
    X: list[dict],
    y: list[int],
    model_path: Path | None = None,
    epochs: int = 50,
) -> dict:
    """Train on historical deals. Returns metrics dict."""
    if not TORCH_AVAILABLE:
        return {"error": "PyTorch not installed"}
    import torch
    import torch.nn as nn

    model_path = model_path or DEFAULT_MODEL_PATH
    model_path.parent.mkdir(parents=True, exist_ok=True)

    X_arr = torch.tensor([prepare_features(x) for x in X], dtype=torch.float32)
    y_arr = torch.tensor(y, dtype=torch.float32).unsqueeze(1)

    model = DealScorerModel()
    opt = torch.optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.BCELoss()

    for _ in range(epochs):
        opt.zero_grad()
        pred = model(X_arr)
        loss = criterion(pred, y_arr)
        loss.backward()
        opt.step()

    with torch.no_grad():
        pred = model(X_arr)
        acc = ((pred > 0.5) == (y_arr > 0.5)).float().mean().item()

    torch.save({"model_state_dict": model.state_dict(), "version": "v1.0.0"}, model_path)
    metrics = {"accuracy": acc, "loss": float(loss.item()), "epochs": epochs}
    (model_path.parent / "metadata.json").write_text(json.dumps(metrics))
    return metrics
