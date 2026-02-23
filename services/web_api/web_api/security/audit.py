"""Audit logging for important events."""
from uuid import UUID

from sqlalchemy.orm import Session

from web_api.models import AuditEvent


def log_event(
    db: Session,
    org_id: UUID | str,
    event_type: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    actor_user_id: UUID | None = None,
    actor_api_key_id: UUID | None = None,
    metadata: dict | None = None,
):
    ev = AuditEvent(
        org_id=UUID(org_id) if isinstance(org_id, str) else org_id,
        actor_user_id=actor_user_id,
        actor_api_key_id=actor_api_key_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata or {},
    )
    db.add(ev)
    db.flush()
