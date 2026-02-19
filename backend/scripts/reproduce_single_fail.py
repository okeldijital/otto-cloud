import os
import sys
import uuid
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_active_user, get_current_organization_id
from main import app
from models.user import User

TEST_DB = "./reproduce_single.db"
CONTRACT_PATH = "/Users/m2krproduction/Desktop/M2kr Remixer Contracts/KAARGO AGREEMENT/KAARGO M2KR Remix Agreement.pdf"

def setup():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    
    engine = create_engine(f"sqlite:///{TEST_DB}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create a test user
    user = User(
        email="repro_single@example.com",
        hashed_password="x",
        full_name="Repro User",
        organization_id=uuid.UUID(int=19201),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_get_db():
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: user
    app.dependency_overrides[get_current_organization_id] = lambda: user.organization_id
    
    return TestClient(app)

def run_repro():
    client = setup()
    
    if not os.path.exists(CONTRACT_PATH):
        print(f"ERROR: Contract not found at {CONTRACT_PATH}")
        return

    with open(CONTRACT_PATH, "rb") as f:
        pdf_bytes = f.read()
    
    print(f"Testing SINGLE extract with file: {CONTRACT_PATH} ({len(pdf_bytes)} bytes)")
    
    # Matching the test's URL exactly
    url = "/api/ai/contracts/extract"
    print(f"POST {url}")
    response = client.post(
        url,
        files={"file": ("KAARGO_Agreement.pdf", pdf_bytes, "application/pdf")}
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text}")
        return

    payload = response.json()
    print(f"Version: {payload.get('version')}")
    data = payload.get("data", {})
    print(f"Extracted Title: {data.get('title')}")

if __name__ == "__main__":
    try:
        run_repro()
    finally:
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)
