import sys
import os
import socket
from pathlib import Path

REQUIRED_MODULES = [
    "fastapi",
    "uvicorn",
    "sqlalchemy",
    "alembic",
    "email_validator",
    "passlib.handlers.bcrypt",
]

FORBIDDEN_DBS = [
    Path.home() / "Library/Application Support/OTTO/otto.db",
    Path.home() / "Library/Application Support/OTTO/db/app.db",
    Path.home() / "otto/backend/app.db",
    Path.home() / "otto/backend/otto.db",
]

# Canonical path from config/governance
CANONICAL_DB = Path.home() / ".otto/data/db/otto.sqlite"

def check_modules():
    failures = []
    for m in REQUIRED_MODULES:
        try:
            __import__(m)
        except Exception as e:
            failures.append(f"Missing module {m}: {e}")
    return failures

def check_port(port: int = 8001):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        result = sock.connect_ex(('127.0.0.1', port))
        if result == 0:
            return [f"Port {port} is already in use. Cannot start backend."]
    except Exception:
        pass
    finally:
        sock.close()
    return []

def check_dbs():
    failures = []
    # Check for forbidden DBs
    existing_forbidden = []
    for db_path in FORBIDDEN_DBS:
        if db_path.exists():
            existing_forbidden.append(str(db_path))
    
    if existing_forbidden:
        failures.append(f"Forbidden DB files detected (must use canonical {CANONICAL_DB}):")
        for f in existing_forbidden:
            failures.append(f"  - {f}")
    
    # Check if multiple valid-looking DBs exist?
    # The prompt says "Detect check multiple OTTO db files and fail with a list."
    # If the standard ones are detected, we already fail.
    # What if canonical exists AND forbidden exists? We fail.
    
    return failures

def main():
    failures = []
    failures.extend(check_modules())
    failures.extend(check_port())
    failures.extend(check_dbs())

    if failures:
        print("❌ PRE-FLIGHT FAILED")
        for f in failures:
            print(" -", f)
        sys.exit(1)

    print("✅ Pre-flight dependency check passed")

if __name__ == "__main__":
    main()
