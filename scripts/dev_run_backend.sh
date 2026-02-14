#!/bin/bash
set -e

# cd to repo root
cd "$(dirname "$0")/.."
REPO_ROOT=$(pwd)
echo "📂 Repo Root: $REPO_ROOT"

# Check .venv
if [ ! -d ".venv" ]; then
    echo "❌ Error: .venv not found. Run 'bash scripts/dev_bootstrap.sh' first."
    exit 1
fi

source .venv/bin/activate
echo "✅ Activated .venv"

PYTHON_VERSION=$(python -V 2>&1)
echo "🐍 Using Python: $PYTHON_VERSION"
if [[ "$PYTHON_VERSION" == *"3.14"* ]]; then
    echo "⚠️  Running on Python 3.14. If errors occur, switch to 3.12."
fi

# Set OTTO_NODE_ROLE if missing (defaults to hub in backend but good to be explicit for dev local)
export OTTO_NODE_ROLE=${OTTO_NODE_ROLE:-hub}

echo "🚀 Starting Backend on Port 8001..."
echo "   Health Check: http://127.0.0.1:8001/api/health"

cd backend
# Use --reload for dev as requested
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
