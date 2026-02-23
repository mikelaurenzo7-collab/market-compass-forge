"""Registry for connector implementations."""

from web_api.connectors.base import ConnectorType, DataConnector
from web_api.connectors.file_connector import FileSystemConnector
from web_api.connectors.dropbox_connector import DropboxConnector
from web_api.connectors.drive_connector import GoogleDriveConnector


_CONNECTORS: dict[ConnectorType, type[DataConnector]] = {
    ConnectorType.FILE: FileSystemConnector,
    ConnectorType.DROPBOX: DropboxConnector,
    ConnectorType.GOOGLE_DRIVE: GoogleDriveConnector,
}


def get_connector(connector_type: ConnectorType, **kwargs) -> DataConnector:
    """Return a connector instance for the given type."""
    cls = _CONNECTORS.get(connector_type)
    if not cls:
        raise ValueError(f"Unknown connector type: {connector_type}")
    return cls(**kwargs)
