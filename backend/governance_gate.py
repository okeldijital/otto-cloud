#!/usr/bin/env python3
import sys
import re
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
INSTALLER = ROOT / "installer"

FORBIDDEN_REPO_DB_FILES = [
    ROOT / "backend" / "app.db",
    ROOT / "backend" / "otto.db",
    ROOT / "backend" / "db" / "app.db",
    ROOT / "backend" / "db" / "otto.db",
]

def fail(msg: str) -> None:
    print(f"❌ GOVERNANCE GATE FAIL: {msg}")
    raise SystemExit(1)

def ok(msg: str) -> None:
    print(f"✅ {msg}")

def run_dependency_lock():
    # Runs the existing dependency lock checker
    p = subprocess.run([sys.executable, str(BACKEND / "governance_check.py")], capture_output=True, text=True)
    if p.stdout:
        print(p.stdout.strip())
    if p.returncode != 0:
        if p.stderr:
            print(p.stderr.strip())
        raise SystemExit(p.returncode)

def check_docs_exist():
    required = [
        ROOT / "docs" / "GOVERNANCE.md",
        ROOT / "docs" / "ADE_WORK_ORDER.md",
    ]
    for p in required:
        if not p.exists():
            fail(f"Missing required governance doc: {p.relative_to(ROOT)}")
    ok("Governance docs present")

def check_no_repo_db_files():
    for p in FORBIDDEN_REPO_DB_FILES:
        if p.exists():
            fail(f"Forbidden DB file exists in repo: {p.relative_to(ROOT)}")
    ok("No forbidden repo DB files detected")

def check_no_fixed_ports():
    # Hard rule: Electron launcher must not listen on fixed ports (8000/8006).
    main_js = INSTALLER / "electron" / "main.js"
    if not main_js.exists():
        ok("No installer/electron/main.js found (skipping fixed-port check)")
        return

    txt = main_js.read_text(encoding="utf-8", errors="ignore")

    if re.search(r"\.listen\(\s*8000\s*[,\)]", txt) or re.search(r"\.listen\(\s*8006\s*[,\)]", txt):
        fail("Fixed port found in installer/electron/main.js (8000/8006). Must select a free port dynamically.")
    ok("No obvious fixed-port listens detected")

def main():
    print("OTTO Governance Gate")
    run_dependency_lock()
    check_docs_exist()
    check_no_repo_db_files()
    check_no_fixed_ports()
    print("✅ GOVERNANCE GATE PASS")

if __name__ == "__main__":
    main()