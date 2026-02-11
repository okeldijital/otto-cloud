#!/bin/bash
set -e

# Get script directory to run relatively
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔍 Running Governance Checks..."
cd "$REPO_ROOT"

echo "1️⃣ Checking Backend Dependencies (Lock Baseline)..."
python3 backend/governance_check.py

echo "2️⃣ Running Pre-flight Checks (Runtime)..."
python3 backend/preflight_check.py

echo "3️⃣ Checking Change Invariants (Scope Boundaries)..."
# Ensure we have git to check diffs
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    python3 backend/invariant_check.py
else
    echo "⚠️ Not a git repository or git error. Skipping invariant check."
fi

echo "4️⃣ Checking Frontend Governance..."
if command -v node &> /dev/null; then
    node frontend/governance_check.js
else
    echo "⚠️ Node.js not found, skipping frontend check."
fi
    
echo "5️⃣ Checking Installer Binary (Smoke Test)..."
BINARY_PATH="installer/backend/dist/otto_backend/otto_backend"

if [ -f "$BINARY_PATH" ]; then
    echo "   Found binary at $BINARY_PATH"
    
    # Ensure executable permissions
    if [ ! -x "$BINARY_PATH" ]; then
        echo "   Fixing permissions (chmod +x)..."
        chmod +x "$BINARY_PATH"
    fi
    
    # Run help smoke test
    echo "   Running --help smoke test..."
    if "$BINARY_PATH" --help > /dev/null 2>&1; then
        echo "✅ Binary smoke test passed"
    else
        echo "❌ Binary smoke test FAILED (crashed or returned error)"
        exit 1
    fi
else
    echo "   Skipping (binary not found at $BINARY_PATH)"
fi

echo "✅ All Governance Checks Passed."