
import uuid
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Adjust path to find backend modules
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from database import Base, SessionLocal
from models.network import Individual, Organization
from models.artist import Artist
from models.user import User
from config import settings
from utils.security import get_password_hash

def seed_scoping_test():
    db = SessionLocal()
    try:
        # Org UUIDs
        ORG_A_UUID = uuid.UUID("00000000-0000-0000-0000-0000000000A1")
        ORG_B_UUID = uuid.UUID("00000000-0000-0000-0000-0000000000B1")

        # Cleanup existing to avoid unique constraint issues if re-run
        db.query(User).filter(User.email == "orga_admin@otto.com").delete()
        db.query(Artist).filter(Artist.name.in_(["Oddxperienc", "GhostArtist"])).delete()
        db.query(Individual).filter(Individual.first_name.in_(["John", "Jane"])).delete()
        db.query(Organization).filter(Organization.name.in_(["M2KR Records", "Secret Label"])).delete()
        db.commit()

        # Create Org A Network Entities
        db.add(Organization(name="M2KR Records", organization_id=ORG_A_UUID))
        db.add(Individual(first_name="John", last_name="Producer", organization_id=ORG_A_UUID))
        db.add(Artist(name="Oddxperienc", organization_id=ORG_A_UUID))

        # Create Org B Network Entities
        db.add(Organization(name="Secret Label", organization_id=ORG_B_UUID))
        db.add(Individual(first_name="Jane", last_name="Hidden", organization_id=ORG_B_UUID))
        db.add(Artist(name="GhostArtist", organization_id=ORG_B_UUID))

        # Create User for Org A
        user_a = User(
            email="orga_admin@otto.com",
            hashed_password=get_password_hash("password123"),
            full_name="Org A Admin",
            is_active=True,
            is_superuser=False,
            role="admin",
            organization_id=ORG_A_UUID
        )
        db.add(user_a)

        db.commit()
        print(f"✅ Seeded Org A ({ORG_A_UUID}) and Org B ({ORG_B_UUID})")
        print(f"✅ Created User: orga_admin@otto.com")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_scoping_test()
