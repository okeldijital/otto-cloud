import requests
import sys

BASE_URL = "http://localhost:8000/api"

def run_test():
    # Login
    resp = requests.post(f"{BASE_URL}/auth/token", data={"username": "admin@otto.com", "password": "admin"})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get current
    resp = requests.get(f"{BASE_URL}/admin/backup/schedule", headers=headers)
    print(f"Current schedule: {resp.json()}")

    # Set to daily
    print("Setting to daily...")
    resp = requests.post(f"{BASE_URL}/admin/backup/schedule", json={"frequency": "daily"}, headers=headers)
    print(f"Set response: {resp.json()}")

    # Verify
    resp = requests.get(f"{BASE_URL}/admin/backup/schedule", headers=headers)
    print(f"New schedule: {resp.json()}")
    
    if resp.json()["frequency"] == "daily":
        print("SUCCESS: Schedule updated and persisted (in memory/file)")
    else:
        print("FAILURE: Schedule did not update")

if __name__ == "__main__":
    run_test()
