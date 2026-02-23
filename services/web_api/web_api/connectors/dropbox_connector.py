"""Dropbox connector - OAuth flow skeleton. Requires DROPBOX_APP_KEY, DROPBOX_APP_SECRET."""

from web_api.connectors.base import ConnectorType, ConnectorResult, DataConnector


class DropboxConnector(DataConnector):
    """Dropbox integration - stub for OAuth + file listing."""

    def __init__(self, access_token: str | None = None):
        self.access_token = access_token

    @property
    def connector_type(self) -> ConnectorType:
        return ConnectorType.DROPBOX

    def fetch_portfolio_data(self, org_id: str, **kwargs) -> ConnectorResult:
        if not self.access_token:
            return ConnectorResult(
                success=False,
                data=[],
                error="Dropbox not connected. Complete OAuth flow first.",
                source="dropbox",
            )
        # TODO: Use dropbox SDK to list/fetch CSV files from /Grapevine/{org_id}/
        return ConnectorResult(
            success=False,
            data=[],
            error="Dropbox connector not fully implemented. Use file connector for local data.",
            source="dropbox",
        )

    def fetch_documents(self, org_id: str, **kwargs) -> ConnectorResult:
        if not self.access_token:
            return ConnectorResult(
                success=False,
                data=[],
                error="Dropbox not connected.",
                source="dropbox",
            )
        return ConnectorResult(
            success=False,
            data=[],
            error="Dropbox connector not fully implemented.",
            source="dropbox",
        )
