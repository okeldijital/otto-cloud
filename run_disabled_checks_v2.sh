#!/bin/bash
export AI_ENABLED=false
export AI_CONTRACT_INTEL_ENABLED=false

# Start Backend
cd backend
source ../.venv/bin/activate
python -m uvicorn main:app --host 127.0.0.1 --port 8001 > /dev/null 2>&1 &
PID=$!

echo "Starting backend (PID $PID)..."
sleep 5

echo "--- /api/ai/health ---"
curl -s -i http://127.0.0.1:8001/api/ai/health

echo -e "\n--- /api/ai/tools (GET) ---"
curl -s -i http://127.0.0.1:8001/api/ai/tools

echo -e "\n--- /api/ai/chat (POST) ---"
curl -s -i -X POST http://127.0.0.1:8001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'

echo -e "\n--- /api/ai/contracts/extract (POST) ---"
curl -s -i -X POST http://127.0.0.1:8001/api/ai/contracts/extract \
  -F "file=@../KAARGO M2KR Remix Agreement.pdf"

# Kill backend
echo -e "\nStopping backend..."
kill $PID
wait $PID 2>/dev/null
