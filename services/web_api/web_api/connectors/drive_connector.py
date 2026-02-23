"""Google Drive connector - OAuth flow skeleton. Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET."""

from web_api.connectors.base import ConnectorType, ConnectorResult, DataConnector


class GoogleDriveConnector(DataConnector):
    """Google Drive integration - stub for OAuth + file listing."""

    def __init__(self, access_token: str | None = None):
        self.access_token = access_token

    @property
    def connector_type(self) -> ConnectorType:
        return ConnectorType.GOOGLE_DRIVE

    def fetch_portfolio_data(self, org_id: str, **kwargs) -> ConnectorResult:
        if not self.access_token:
            return ConnectorResult(
                success=False,
                data=[],
                error="Google Drive not connected. Complete OAuth flow first.",
                source="google_drive",
            )
        return ConnectorResult(
            success=False,
            data=[],
            error="Google Drive connector not fully implemented. Use file connector for local data.",
            source="google_drive",
        )

    def fetch_documents(self, org_id: str, **kwargs) -> ConnectorResult:
        if not self.access_token:
            return ConnectorResult(
                success=False,
                data=[],
                error="Google Drive not connected.",
                source="google_drive",
            )
        return ConnectorResult(
            success=False,
            data=[],
            error="Google Drive connector not fully implemented.",
            source="google_drive",
        )
