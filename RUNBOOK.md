# OTTO Runbook

## Developer Auth Flow (Canonical)

1. **Start Backend**:
   ```bash
   cd backend
   source ../.venv/bin/activate
   # Note: Do not use --reload if you want to avoid multiple seed runs or weird state, but it is supported.
   python -m uvicorn main:app --host 127.0.0.1 --port 8001 --log-level info
   ```
   (Note: Admin user `admin@otto.com` / `admin` is automatically seeded/updated on startup)

2. **Obtain Token**:
   ```bash
   curl -X POST "http://127.0.0.1:8001/api/auth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     --data "username=admin@otto.com&password=admin"
   ```
   
   Expected Response:
   ```json
   {"access_token":"...","token_type":"bearer"}
   ```

3. **Verify Health**:
   ```bash
   curl http://127.0.0.1:8001/health
   ```

## Development Commands

- **Run Tests**:
  ```bash
  cd backend
  python -m pytest -q
  ```
- **Run Governance Checks**:
  ```bash
  cd backend
  python invariant_check.py
  ```
