#!/bin/bash
set -e

echo "--- Governance Check ---"
cd backend
python3 invariant_check.py
echo ""

echo "--- Tests ---"
python3 -m pytest -q
echo ""

# Start server in disabled mode
echo "--- Disabled Mode Check ---"
export AI_ENABLED=false
export AI_CONTRACT_INTEL_ENABLED=false
python3 -m uvicorn main:app --port 8003 > /dev/null 2>&1 &
PID_DISABLED=$!
sleep 5

HEALTH_DISABLED=$(curl -s http://127.0.0.1:8003/api/ai/health)
CONTRACTS_DISABLED=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8003/api/ai/contracts/extract)

kill $PID_DISABLED
wait $PID_DISABLED 2>/dev/null || true

echo "Health (expect {enabled:false}): $HEALTH_DISABLED"
echo "Extract (expect 404): $CONTRACTS_DISABLED"
echo ""

# Start server in enabled mode
echo "--- Enabled Mode Check ---"
export AI_ENABLED=true
export AI_CONTRACT_INTEL_ENABLED=true
# Create dummy PDF
echo "dummy content" > dummy.pdf

python3 -m uvicorn main:app --port 8004 > /dev/null 2>&1 &
PID_ENABLED=$!
sleep 5

HEALTH_ENABLED=$(curl -s http://127.0.0.1:8004/api/ai/health)

# Use token? Assuming dev mode auth disabled.
# Upload dummy.pdf to extract
if [ -f dummy.pdf ]; then
    EXTRACT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -F "file=@dummy.pdf" http://127.0.0.1:8004/api/ai/contracts/extract)
else
    EXTRACT_CODE="000 (File Missing)"
fi

kill $PID_ENABLED
wait $PID_ENABLED 2>/dev/null || true
rm dummy.pdf

echo "Health (expect {enabled:true}): $HEALTH_ENABLED"
echo "Extract (expect 200 or 422 if invalid PDF, but checking endpoint existence): $EXTRACT_CODE"
