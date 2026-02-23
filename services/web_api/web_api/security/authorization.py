"""RBAC: viewer, analyst, admin. Enforce at API layer."""
from enum import Enum
from functools import wraps

from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session

from web_api.database import get_db
from web_api.models import User, UserOrganization, Role


class Permission(str, Enum):
    READ_DASHBOARDS = "read_dashboards"
    DOWNLOAD_EXPORTS = "download_exports"
    CREATE_PORTFOLIO = "create_portfolio"
    CREATE_SCENARIO = "create_scenario"
    RUN_SIMULATION = "run_simulation"
    VIEW_RESULTS = "view_results"
    MANAGE_USERS = "manage_users"
    MANAGE_ORG = "manage_org"
    MODEL_TRAINING = "model_training"
    BENCHMARKS = "benchmarks"
    API_KEYS = "api_keys"


ROLE_PERMISSIONS = {
    Role.viewer: [
        Permission.READ_DASHBOARDS,
        Permission.DOWNLOAD_EXPORTS,
        Permission.VIEW_RESULTS,
    ],
    Role.analyst: [
        Permission.READ_DASHBOARDS,
        Permission.DOWNLOAD_EXPORTS,
        Permission.CREATE_PORTFOLIO,
        Permission.CREATE_SCENARIO,
        Permission.RUN_SIMULATION,
        Permission.VIEW_RESULTS,
    ],
    Role.admin: [
        Permission.READ_DASHBOARDS,
        Permission.DOWNLOAD_EXPORTS,
        Permission.CREATE_PORTFOLIO,
        Permission.CREATE_SCENARIO,
        Permission.RUN_SIMULATION,
        Permission.VIEW_RESULTS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_ORG,
        Permission.MODEL_TRAINING,
        Permission.BENCHMARKS,
        Permission.API_KEYS,
    ],
}


def get_user_role(user: User, org_id: str, db: Session) -> Role:
    uo = db.query(UserOrganization).filter(
        UserOrganization.user_id == user.id,
        UserOrganization.org_id == org_id,
    ).first()
    if not uo:
        raise HTTPException(403, "Not a member of this organization")
    return uo.role


def require_permission(permission: Permission):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            return f(*args, **kwargs)
        return wrapper
    return decorator


def check_permission(role: Role, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, [])


def verify_permission(user: User, org_id: str, permission: Permission, db: Session) -> Role:
    role = get_user_role(user, org_id, db)
    if not check_permission(role, permission):
        raise HTTPException(403, f"Permission denied: {permission.value}")
    return role
