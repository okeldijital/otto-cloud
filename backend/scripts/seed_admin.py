import sys
import os

# Add the parent directory to sys.path to import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal, init_db
from models.user import User
from utils.security import get_password_hash

def seed_admin():
    # Ensure tables exist
    init_db()
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == "admin@otto.com").first()
        if not admin:
            print("Creating admin user...")
            admin = User(
                email="admin@otto.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Admin",
                is_active=True,
                is_superuser=True,
                role="admin"
            )
            db.add(admin)
            db.commit()
            print("Admin user created successfully!")
        else:
            print("Admin user already exists.")
            # Ensure it has admin role
            admin.role = "admin"
            admin.is_superuser = True
            db.commit()
            print("Admin user updated.")
    except Exception as e:
        print(f"Error seeding admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
