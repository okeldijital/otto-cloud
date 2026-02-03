import uuid
import requests
import sys

BASE_URL = "http://localhost:8000/api"

# 1. Login
login_url = f"{BASE_URL}/auth/token"
login_data = {"username": "admin@otto.com", "password": "admin"}
print(f"Logging in to {login_url}...")
resp = requests.post(login_url, data=login_data)
if resp.status_code != 200:
    print(f"Login failed: {resp.status_code} {resp.text}")
    sys.exit(1)

token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Login successful.")

# 2. Get Contracts
contracts_url = f"{BASE_URL}/contracts"
print(f"Getting contracts from {contracts_url}...")
resp = requests.get(contracts_url, headers=headers)
if resp.status_code != 200:
    print(f"Get contracts failed: {resp.status_code} {resp.text}")
else:
    print(f"Get contracts success: {len(resp.json())} contracts found.")

# 3. Create Contract (Minimal)
print("Creating contract...")
# Mimic frontend FormData
# title=Test
# contract_number=CTR-TEST-1
# status=Draft
data = {
    "title": "Test Contract API",
    "contract_number": "CTR-TEST-API-" + str(uuid.uuid4())[:8],
    "status_value": "Draft",
    "contract_type": "Recording"
}
# requests.post(..., data=data) sends x-www-form-urlencoded if data is dict, or multipart if files provided.
# The endpoint uses Form(...), so we should use `data` (multipart or urlencoded).
# But if it expects multipart/form-data specifically, we might need to verify.
# Frontend uses FormData, which sends multipart/form-data.
resp = requests.post(contracts_url, headers=headers, data=data)

if resp.status_code != 201:
    print(f"Create contract failed: {resp.status_code} {resp.text}")
else:
    print("Create contract successful.")
    print(resp.json())
