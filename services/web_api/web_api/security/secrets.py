"""Secrets vault abstraction for SOC2 - encrypt sensitive data (connector tokens, API keys)."""

import base64
import os


def encrypt_value(plain: str) -> str:
    """Encrypt for at-rest storage. Production: use Vault/AWS KMS."""
    # Stub: base64. Add cryptography.fernet for real encryption.
    return base64.b64encode(plain.encode()).decode()


def decrypt_value(encrypted: str) -> str:
    """Decrypt a stored value."""
    try:
        return base64.b64decode(encrypted.encode()).decode()
    except Exception:
        return ""
