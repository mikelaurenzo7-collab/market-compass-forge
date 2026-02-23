"""Base interfaces for data connectors. No engine imports."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ConnectorType(str, Enum):
    """Supported data source types."""
    FILE = "file"
    DROPBOX = "dropbox"
    GOOGLE_DRIVE = "google_drive"
    QUICKBOOKS = "quickbooks"
    CARTA = "carta"
    HUBSPOT = "hubspot"
    SALESFORCE = "salesforce"


@dataclass
class ConnectorResult:
    """Result from a connector fetch operation."""
    success: bool
    data: dict[str, Any] | list[dict[str, Any]]
    error: str | None = None
    source: str = ""
    row_count: int = 0


class DataConnector(ABC):
    """Abstract base for external data connectors."""

    @property
    @abstractmethod
    def connector_type(self) -> ConnectorType:
        return ConnectorType.FILE

    @abstractmethod
    def fetch_portfolio_data(self, org_id: str, **kwargs: Any) -> ConnectorResult:
        """Fetch portfolio/position data from the source."""
        pass

    @abstractmethod
    def fetch_documents(self, org_id: str, **kwargs: Any) -> ConnectorResult:
        """Fetch deal documents or files."""
        pass

    def fetch_cap_table(self, org_id: str, **kwargs: Any) -> ConnectorResult:
        """Fetch cap table data (optional, for Carta etc.)."""
        return ConnectorResult(success=False, data=[], error="Not implemented", source=self.connector_type.value)
