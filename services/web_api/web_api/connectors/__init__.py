"""Data connectors for external sources (Dropbox, Drive, CRM, accounting, cap table tools)."""

from web_api.connectors.base import (
    ConnectorType,
    ConnectorResult,
    DataConnector,
)
from web_api.connectors.file_connector import FileSystemConnector
from web_api.connectors.registry import get_connector

__all__ = [
    "ConnectorType",
    "ConnectorResult",
    "DataConnector",
    "FileSystemConnector",
    "get_connector",
]
