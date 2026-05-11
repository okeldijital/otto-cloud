from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("Starting test client request...")
try:
    response = client.get("/api/health")
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    import traceback
    traceback.print_exc()
