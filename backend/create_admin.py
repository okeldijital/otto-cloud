from sqlalchemy.orm import Session
from database import SessionLocal
from models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = SessionLocal()
    email = "admin@otto.com"
    password = "admin"
    
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"Updating existing admin: {email}")
        user.hashed_password = pwd_context.hash(password)
        user.is_superuser = True
        user.role = "admin"
        user.is_active = True
    else:
        print(f"Creating new admin: {email}")
        user = User(
            email=email,
            hashed_password=pwd_context.hash(password),
            full_name="System Admin",
            is_active=True,
            is_superuser=True,
            role="admin"
        )
        db.add(user)
    
    db.commit()
    print("Admin user ready.")
    db.close()

if __name__ == "__main__":
    create_admin()
