import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from dependencies import get_current_user
from main import app
from models.user import User

TEST_DB_FILE = "./test_debug_405.db"

@pytest.fixture
def client():
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
    engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    org_id = uuid.UUID(int=1)
    user = User(
        email="debug@example.com",
        hashed_password="...",
        full_name="Debug User",
        organization_id=org_id,
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()
    db.close()
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

def test_debug_405(client):
    print("\nDEBUG: Testing POST /api/ai/contracts/extract")
    pdf_bytes = b"%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF"
    
    # 1. Try with trailing slash
    res1 = client.post("/api/ai/contracts/extract", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    print(f"Result (no slash): {res1.status_code}")
    if res1.status_code == 405:
        print(f"Headers: {res1.headers}")
        print(f"Body: {res1.text}")

    # 2. Try with trailing slash
    res2 = client.post("/api/ai/contracts/extract/", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    print(f"Result (with slash): {res2.status_code}")

    # 3. List all routes in app
    print("\nDEBUG: App Routes:")
    for route in app.routes:
        if hasattr(route, "path"):
            methods = getattr(route, "methods", "N/A")
            print(f"  {route.path} -> {methods}")
