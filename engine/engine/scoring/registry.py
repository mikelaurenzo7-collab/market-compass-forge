"""Model versioning storage abstraction."""
from pathlib import Path
from datetime import datetime
import json

DEFAULT_REGISTRY_PATH = Path(__file__).parent.parent.parent / "models" / "registry.json"


def register_version(version: str, path: str, metrics: dict, org_id: str = "default") -> None:
    """Register a new model version."""
    registry_path = Path(path).parent / "registry.json"
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    if registry_path.exists():
        data = json.loads(registry_path.read_text())
    else:
        data = {"versions": []}
    data["versions"].append({
        "version": version,
        "path": path,
        "metrics": metrics,
        "org_id": org_id,
        "created_at": datetime.utcnow().isoformat(),
    })
    registry_path.write_text(json.dumps(data, indent=2))


def get_latest_version(org_id: str = "default") -> dict | None:
    """Get latest model version for org."""
    registry_path = DEFAULT_REGISTRY_PATH
    if not registry_path.exists():
        return None
    data = json.loads(registry_path.read_text())
    versions = [v for v in data.get("versions", []) if v.get("org_id") == org_id]
    return max(versions, key=lambda v: v["created_at"]) if versions else None
