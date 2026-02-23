"""Pytest fixtures for web_api tests. Requires Postgres running."""
import os
import pytest

os.environ.setdefault("DATABASE_URL", "postgresql://grapevine:grapevine@localhost:5432/grapevine_web")
os.environ.setdefault("SECRET_KEY", "test-secret")


@pytest.fixture
def db():
    from web_api.database import SessionLocal
    return SessionLocal()


@pytest.fixture
def org(db):
    from web_api.models import Organization
    o = Organization(name="Test Org")
    db.add(o)
    db.commit()
    db.refresh(o)
    return o


@pytest.fixture
def admin_user(db, org):
    from web_api.auth import get_password_hash
    from web_api.models import User, UserOrganization, Role
    u = User(email="admin@test.com", hashed_password=get_password_hash("pass"))
    db.add(u)
    db.commit()
    db.refresh(u)
    uo = UserOrganization(user_id=u.id, org_id=org.id, role=Role.admin)
    db.add(uo)
    db.commit()
    return u


@pytest.fixture
def analyst_user(db, org):
    from web_api.auth import get_password_hash
    from web_api.models import User, UserOrganization, Role
    u = User(email="analyst@test.com", hashed_password=get_password_hash("pass"))
    db.add(u)
    db.commit()
    db.refresh(u)
    uo = UserOrganization(user_id=u.id, org_id=org.id, role=Role.analyst)
    db.add(uo)
    db.commit()
    return u


@pytest.fixture
def viewer_user(db, org):
    from web_api.auth import get_password_hash
    from web_api.models import User, UserOrganization, Role
    u = User(email="viewer@test.com", hashed_password=get_password_hash("pass"))
    db.add(u)
    db.commit()
    db.refresh(u)
    uo = UserOrganization(user_id=u.id, org_id=org.id, role=Role.viewer)
    db.add(uo)
    db.commit()
    return u


@pytest.fixture
def portfolio(db, org, admin_user):
    from web_api.models import Company, Portfolio, Position
    c = Company(org_id=org.id, name="TestCo", revenue_growth=0.1, leverage=0.3)
    db.add(c)
    db.commit()
    db.refresh(c)
    p = Portfolio(org_id=org.id, name="Test Portfolio")
    db.add(p)
    db.commit()
    db.refresh(p)
    pos = Position(portfolio_id=p.id, company_id=c.id, cost_basis=10, current_value=12, expected_exit_years=5)
    db.add(pos)
    db.commit()
    return p


@pytest.fixture
def admin_token(admin_user):
    from web_api.auth import create_token
    return create_token({"sub": str(admin_user.id)})


@pytest.fixture
def analyst_token(analyst_user):
    from web_api.auth import create_token
    return create_token({"sub": str(analyst_user.id)})


@pytest.fixture
def viewer_token(viewer_user):
    from web_api.auth import create_token
    return create_token({"sub": str(viewer_user.id)})
