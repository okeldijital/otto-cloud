#!/bin/bash

echo "🔍 OTTO Desktop Shell Diagnostic"
echo "================================"
echo ""

echo "1. Checking if OTTO app is running..."
if pgrep -f "otto.app" > /dev/null; then
    echo "   ✅ OTTO app is running"
    ps aux | grep "otto.app" | grep -v grep
else
    echo "   ❌ OTTO app is NOT running"
fi

echo ""
echo "2. Checking if backend process is running..."
if pgrep -f "backend" > /dev/null; then
    echo "   ✅ Backend is running"
    ps aux | grep "backend" | grep -v grep
else
    echo "   ❌ Backend is NOT running"
fi

echo ""
echo "3. Checking if port 8000 is in use..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "   ✅ Port 8000 is in use"
    lsof -i :8000
else
    echo "   ❌ Port 8000 is NOT in use (backend not listening)"
fi

echo ""
echo "4. Checking backend binary..."
if [ -f "frontend/src-tauri/backend-aarch64-apple-darwin" ]; then
    echo "   ✅ Backend binary exists"
    ls -lh frontend/src-tauri/backend-aarch64-apple-darwin
else
    echo "   ❌ Backend binary NOT found"
fi

echo ""
echo "5. Testing backend health endpoint..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ Backend health check passed"
    curl -s http://localhost:8000/health
else
    echo "   ❌ Backend health check failed (not reachable)"
fi

echo ""
echo "6. Checking Console.app logs for backend errors..."
echo "   Last 10 OTTO-related log entries:"
log show --predicate 'process == "otto"' --last 5m --info 2>/dev/null | tail -20 || echo "   (No recent logs found)"

echo ""
echo "================================"
echo "Diagnostic complete!"
