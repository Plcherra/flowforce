#!/bin/bash
# Quick test script to verify dev server can start

echo "=== Testing Next.js Dev Server Startup ==="
echo ""

# Clean caches
echo "1. Cleaning caches..."
rm -rf .next node_modules/.cache 2>/dev/null
echo "   ✓ Caches cleaned"
echo ""

# Kill any existing process
echo "2. Checking port 3000..."
if lsof -ti :3000 > /dev/null 2>&1; then
  lsof -ti :3000 | xargs kill -9 2>/dev/null
  echo "   ✓ Killed existing process"
  sleep 1
else
  echo "   ✓ Port 3000 is free"
fi
echo ""

# Try to start dev server with timeout
echo "3. Starting dev server (10 second timeout)..."
echo "   This will test if the server can compile..."
echo ""

timeout 10 npm run dev 2>&1 | head -30 &
DEV_PID=$!

sleep 8

# Check if process is still running
if kill -0 $DEV_PID 2>/dev/null; then
  echo ""
  echo "   ✅ SUCCESS: Dev server started and is running!"
  echo "   The server should be accessible at http://localhost:3000"
  kill $DEV_PID 2>/dev/null
  echo ""
  echo "=== Test Complete - Server can start ==="
  exit 0
else
  echo ""
  echo "   ❌ FAILED: Dev server did not start or crashed"
  echo "   Check the output above for errors"
  echo ""
  echo "=== Test Failed ==="
  exit 1
fi
