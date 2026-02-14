#!/bin/bash
set -e

# cd to repo root
cd "$(dirname "$0")/.."
REPO_ROOT=$(pwd)
echo "📂 Repo Root: $REPO_ROOT"

# Python Version Guard
# Priority: python3.12 (stable) > python3.14 (prompt path) > python3 (system)
if command -v python3.12 &> /dev/null; then
    PYTHON_CMD="python3.12"
elif [ -f "/Library/Frameworks/Python.framework/Versions/3.14/bin/python3" ]; then
    PYTHON_CMD="/Library/Frameworks/Python.framework/Versions/3.14/bin/python3"
else
    PYTHON_CMD="python3"
fi

VERSION=$($PYTHON_CMD -V 2>&1)
echo "🐍 Using Python: $VERSION ($PYTHON_CMD)"

if [[ "$VERSION" == *"3.14"* ]]; then
    echo "⚠️  Note: You are using Python 3.14."
    echo "    If install fails, use Python 3.12 (recommended)."
fi

# Create .venv if missing or broken
if [ ! -f ".venv/bin/activate" ]; then
    echo "🔨 Creating .venv (missing or broken)..."
    rm -rf .venv
    $PYTHON_CMD -m venv .venv
else
    echo "✅ .venv exists"
fi

# Activate
source .venv/bin/activate

# Upgrade pip and install requirements
echo "⬇️  Installing dependencies..."
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt

# Governance Gates (only check if files exist)
echo "🛡️  Running Governance Checks..."
if [ -f "backend/governance_check.py" ]; then
    python backend/governance_check.py
else
    echo "⚠️  backend/governance_check.py not found, skipping."
fi

if [ -f "backend/invariant_check.py" ]; then
    python backend/invariant_check.py
else
    echo "⚠️  backend/invariant_check.py not found, skipping."
fi

echo "✅ Bootstrap Complete."
echo "   Run backend with: bash scripts/dev_run_backend.sh"
echo "   Run uvicorn manually: cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"
