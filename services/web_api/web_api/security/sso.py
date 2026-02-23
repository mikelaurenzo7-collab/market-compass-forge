"""SSO/SAML scaffold for SOC2 readiness. Stub - integrate with IdP (Okta, Auth0, etc.)."""

from typing import Any


def get_saml_metadata_url() -> str:
    """Return IdP metadata URL for SP configuration. Configure via SAML_ENTITY_ID env."""
    import os
    return os.environ.get("SAML_METADATA_URL", "")


def get_saml_sp_entity_id() -> str:
    """Return SP entity ID for IdP configuration."""
    import os
    return os.environ.get("SAML_SP_ENTITY_ID", "https://app.grapevine.example/saml")


def validate_saml_response(saml_response: str) -> dict[str, Any] | None:
    """
    Validate SAML response from IdP. Returns user attributes or None.
    Stub - integrate with python3-saml or similar.
    """
    # TODO: Implement with python3-saml
    return None


def is_sso_enabled() -> bool:
    """Return True if SSO/SAML is configured."""
    import os
    return bool(os.environ.get("SAML_METADATA_URL"))
