#!/usr/bin/env python3
"""Database migration script for Otto."""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from database import engine, Base
from models import (
    User, Organization, Job, Subscription, Usage, Plan, Membership,
    Contract, Release, Track, Work, Royalty, Document, Note,
    Event, Playlist, AuditLog, Activity, Task, Label, Artist,
    PRO, Publisher, NetworkRelationship, Individual, Platform
)


def create_tables():
    """Create all tables."""
    print("Creating tables...")
    Base.metadata.create_all(engine)
    print("Tables created successfully.")


def create_default_plans():
    """Create default pricing plans."""
    from database import SessionLocal
    from models.plan import Plan

    db = SessionLocal()
    try:
        existing = db.query(Plan).first()
        if not existing:
            plans = [
                Plan(name="free", job_limit=100, price=None),
                Plan(name="pro", job_limit=500, price=29.00),
                Plan(name="enterprise", job_limit=10000, price=None),
            ]
            for p in plans:
                db.add(p)
            db.commit()
            print("Default plans created.")
        else:
            print("Plans already exist.")
    finally:
        db.close()


def main():
    create_tables()
    create_default_plans()


if __name__ == "__main__":
    main()