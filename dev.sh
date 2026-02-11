#!/bin/bash

# OTTO Development Server Startup Script
# Starts both backend and frontend simultaneously

echo "🚀 Starting OTTO Development Servers..."

# Set environment variables for backend
export OTTO_NODE_ROLE=hub
export PORT=8001
# export CORS_ORIGINS=*  <-- REMOVED: Causes CORS error with credentials. Defaults in main.py include localhost.
export APP_DATA_DIR=$HOME/.otto/data
export DATABASE_URL=sqlite:///$HOME/.otto/data/db/otto.sqlite

# Create data directory if it doesn't exist
mkdir -p $HOME/.otto/data/db

# Start backend in background
echo "📦 Starting Backend (port 8001)..."
cd backend
python3 main.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

# Start frontend in background
echo "🎨 Starting Frontend (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ OTTO Development Servers Running:"
echo "   Backend:  http://localhost:8001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Wait for both processes
wait
