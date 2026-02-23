from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from web_api.database import get_db
from web_api.config import settings
from web_api.models import User, UserOrganization

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(hours=24)})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except JWTError:
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(401, "Invalid token")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user


def get_user_role(user: User, org_id: str, db: Session):
    uo = db.query(UserOrganization).filter(
        UserOrganization.user_id == user.id,
        UserOrganization.org_id == org_id,
    ).first()
    if not uo:
        raise HTTPException(403, "Not a member of this organization")
    return uo.role


def get_org_id(user: User, db: Session, x_org_id: str | None) -> str:
    if x_org_id:
        uo = db.query(UserOrganization).filter(
            UserOrganization.user_id == user.id,
            UserOrganization.org_id == x_org_id,
        ).first()
        if not uo:
            raise HTTPException(403, "Not a member of this organization")
        return str(x_org_id) if hasattr(x_org_id, '__str__') else x_org_id
    uo = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).first()
    if not uo:
        raise HTTPException(403, "No organization")
    return str(uo.org_id)
