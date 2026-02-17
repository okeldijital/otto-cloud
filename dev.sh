#!/bin/bash
set -euo pipefail

# OTTO Development Server Startup Script
# Starts both backend and frontend simultaneously

echo "🚀 Starting OTTO Development Servers..."

# Set environment variables for backend
export OTTO_NODE_ROLE=hub
export PORT=8001
# export CORS_ORIGINS=*  <-- REMOVED: Causes CORS error with credentials. Defaults in main.py include localhost.
export APP_DATA_DIR="${APP_DATA_DIR:-$HOME/.otto/data}"
export DATABASE_URL="${DATABASE_URL:-sqlite:///$HOME/.otto/data/db/otto.sqlite}"

# Create data directory if it doesn't exist
mkdir -p "$HOME/.otto/data/db"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_LOG="/tmp/otto_backend_dev.log"
FRONTEND_LOG="/tmp/otto_frontend_dev.log"

# Start backend in background
echo "📦 Starting Backend (port 8001)..."
cd "$ROOT_DIR/backend"
python3 main.py >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
cd "$ROOT_DIR"

# Wait for backend health or early crash
BACKEND_OK=0
for _ in $(seq 1 25); do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "❌ Backend process exited during startup."
        echo "--- backend log ---"
        tail -n 80 "$BACKEND_LOG" || true
        exit 1
    fi
    if curl -fsS http://127.0.0.1:8001/health >/dev/null 2>&1; then
        BACKEND_OK=1
        break
    fi
    sleep 0.4
done

if [ "$BACKEND_OK" -ne 1 ]; then
    echo "❌ Backend failed health check at http://127.0.0.1:8001/health"
    echo "--- backend log ---"
    tail -n 80 "$BACKEND_LOG" || true
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
fi

# Start frontend in background
echo "🎨 Starting Frontend..."
cd "$ROOT_DIR/frontend"
npm run dev >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
cd "$ROOT_DIR"

# Wait for frontend to report URL
FRONTEND_URL=""
for _ in $(seq 1 40); do
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "❌ Frontend process exited during startup."
        echo "--- frontend log ---"
        tail -n 80 "$FRONTEND_LOG" || true
        kill "$BACKEND_PID" 2>/dev/null || true
        exit 1
    fi
    if [ -f "$FRONTEND_LOG" ]; then
        FRONTEND_URL="$(rg -o 'http://localhost:[0-9]+' "$FRONTEND_LOG" | tail -n 1 || true)"
        if [ -n "${FRONTEND_URL:-}" ]; then
            break
        fi
    fi
    sleep 0.4
done

echo ""
echo "✅ OTTO Development Servers Running:"
echo "   Backend:  http://localhost:8001"
if [ -n "${FRONTEND_URL:-}" ]; then
    echo "   Frontend: $FRONTEND_URL"
else
    echo "   Frontend: (see log) $FRONTEND_LOG"
fi
echo "   Backend log:  $BACKEND_LOG"
echo "   Frontend log: $FRONTEND_LOG"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Wait for both processes
wait
