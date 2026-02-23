"""Local file system connector - reads from configured upload directory."""

import csv
import os
from pathlib import Path
from typing import Any

from web_api.connectors.base import ConnectorType, ConnectorResult, DataConnector


class FileSystemConnector(DataConnector):
    """Reads portfolio data and documents from a local directory."""

    def __init__(self, base_path: str | None = None):
        self.base_path = Path(base_path or os.environ.get("CONNECTOR_FILE_PATH", "/tmp/grapevine_connectors"))

    @property
    def connector_type(self) -> ConnectorType:
        return ConnectorType.FILE

    def fetch_portfolio_data(self, org_id: str, **kwargs: Any) -> ConnectorResult:
        """Read portfolio CSV from org/{org_id}/portfolio.csv if present."""
        org_path = self.base_path / org_id
        csv_path = org_path / "portfolio.csv"
        if not csv_path.exists():
            return ConnectorResult(
                success=False,
                data=[],
                error=f"File not found: {csv_path}",
                source="file",
            )
        try:
            with open(csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            return ConnectorResult(
                success=True,
                data=rows,
                source="file",
                row_count=len(rows),
            )
        except Exception as e:
            return ConnectorResult(
                success=False,
                data=[],
                error=str(e),
                source="file",
            )

    def fetch_documents(self, org_id: str, **kwargs: Any) -> ConnectorResult:
        """List files in org/{org_id}/documents/."""
        org_path = self.base_path / org_id / "documents"
        if not org_path.exists():
            return ConnectorResult(success=True, data=[], source="file", row_count=0)
        files = []
        for p in org_path.iterdir():
            if p.is_file():
                files.append({"path": str(p), "name": p.name, "size": p.stat().st_size})
        return ConnectorResult(success=True, data=files, source="file", row_count=len(files))
