"""Seed web API: org, user, portfolio with companies and positions."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from web_api.database import SessionLocal
from web_api.auth import get_password_hash
from web_api.models import Organization, User, UserOrganization, Portfolio, Company, Position, Role

def seed():
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="Acme Family Office")
            db.add(org)
            db.flush()

        user = db.query(User).filter(User.email == "demo@grapevine.io").first()
        if not user:
            user = User(email="demo@grapevine.io", hashed_password=get_password_hash("demo123"), full_name="Demo User")
            db.add(user)
            db.flush()

        if not db.query(UserOrganization).filter(UserOrganization.user_id == user.id, UserOrganization.org_id == org.id).first():
            db.add(UserOrganization(user_id=user.id, org_id=org.id, role=Role.admin))
            db.flush()

        companies = []
        for i, name in enumerate(["TechCorp", "HealthFlow", "FinServe", "InduMax", "ConsumerEdge", "DataSync", "BioPharm", "GreenEnergy", "LogiChain", "CloudScale"]):
            c = db.query(Company).filter(Company.org_id == org.id, Company.name == name).first()
            if not c:
                c = Company(org_id=org.id, name=name, revenue_growth=0.1 + i * 0.02, leverage=0.3 + i * 0.05)
                db.add(c)
                db.flush()
            companies.append(c)

        portfolio = db.query(Portfolio).filter(Portfolio.org_id == org.id, Portfolio.name == "Growth Fund I").first()
        if not portfolio:
            portfolio = Portfolio(org_id=org.id, name="Growth Fund I", description="Demo portfolio")
            db.add(portfolio)
            db.flush()

        if db.query(Position).filter(Position.portfolio_id == portfolio.id).count() == 0:
            for i, c in enumerate(companies):
                cost = 5 + i * 2
                db.add(Position(portfolio_id=portfolio.id, company_id=c.id, cost_basis=cost, current_value=cost * 1.1, expected_exit_years=5))

        db.commit()
        print("Seed complete. Login: demo@grapevine.io / demo123")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
