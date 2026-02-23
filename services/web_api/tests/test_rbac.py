"""API tests: RBAC, org isolation."""
import pytest
from fastapi.testclient import TestClient

from web_api.main import app
from web_api.database import SessionLocal
from web_api.models import User, Organization, UserOrganization, Portfolio, Role
from web_api.auth import get_password_hash, create_token

client = TestClient(app)


@pytest.fixture
def db():
    return SessionLocal()


@pytest.fixture
def org(db):
    o = Organization(name="Test Org")
    db.add(o)
    db.commit()
    db.refresh(o)
    return o


@pytest.fixture
def user(db, org):
    u = User(email="analyst@test.com", hashed_password=get_password_hash("pass"))
    db.add(u)
    db.commit()
    db.refresh(u)
    uo = UserOrganization(user_id=u.id, org_id=org.id, role=Role.analyst)
    db.add(uo)
    db.commit()
    return u


@pytest.fixture
def token(user):
    return create_token({"sub": str(user.id)})


def test_viewer_cannot_create_portfolio(db, org):
    u = User(email="viewer@test.com", hashed_password=get_password_hash("pass"))
    db.add(u)
    db.commit()
    db.refresh(u)
    uo = UserOrganization(user_id=u.id, org_id=org.id, role=Role.viewer)
    db.add(uo)
    db.commit()
    t = create_token({"sub": str(u.id)})
    r = client.post("/portfolios", json={"name": "X"}, headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 403


def test_org_isolation(db, org, user, token):
    other_org = Organization(name="Other")
    db.add(other_org)
    db.commit()
    p = Portfolio(org_id=other_org.id, name="Other Portfolio")
    db.add(p)
    db.commit()
    r = client.get(f"/portfolios/{p.id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404
