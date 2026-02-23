#!/usr/bin/env python3
"""Create grapevine_web and grapevine_engine databases if using Replit Postgres."""
import os
import sys

def main():
    url = os.environ.get("DATABASE_URL")
    if not url:
        return 0
    if "postgresql" not in url and "postgres" not in url:
        return 0
    try:
        from sqlalchemy import create_engine, text
        base = url.rsplit("/", 1)[0]
        engine = create_engine(f"{base}/postgres")
        for db in ["grapevine_web", "grapevine_engine"]:
            with engine.connect() as conn:
                r = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": db})
                if r.fetchone() is None:
                    conn.execute(text(f'CREATE DATABASE "{db}"'))
                    conn.commit()
                    print(f"Created database {db}", flush=True)
    except Exception as e:
        print(f"Init DB: {e}", file=sys.stderr)
    return 0

if __name__ == "__main__":
    sys.exit(main())
