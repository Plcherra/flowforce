#!/bin/bash
# Debug script for Next.js dev server

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=== Next.js Dev Server Debug ==="
echo "Working directory: $(pwd)"
echo ""

# Check if we're in the right place
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: package.json not found!"
  echo "Current directory: $(pwd)"
  exit 1
fi

echo "✓ Found package.json"
echo ""

# Kill any existing processes
echo "1. Cleaning up..."
pkill -f "next dev" 2>/dev/null
sleep 1
lsof -ti :3000 | xargs kill -9 2>/dev/null
echo "✓ Cleaned up processes"
echo ""

# Clean caches
echo "2. Cleaning caches..."
rm -rf .next node_modules/.cache 2>/dev/null
echo "✓ Caches cleaned"
echo ""

# Check Node version
echo "3. Environment check..."
echo "   Node version: $(node -v)"
echo "   NPM version: $(npm -v)"
NEXT_VERSION=$(grep -o '"next": "[^"]*"' package.json | cut -d'"' -f4)
echo "   Next.js version: $NEXT_VERSION"
echo ""

# Check env vars
echo "4. Environment variables..."
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "   ⚠️  SUPABASE_URL not set"
else
  echo "   ✓ SUPABASE_URL is set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "   ⚠️  SUPABASE_SERVICE_ROLE_KEY not set"
else
  echo "   ✓ SUPABASE_SERVICE_ROLE_KEY is set"
fi
echo ""

# Try to start with timeout
echo "5. Starting dev server (30 second test)..."
echo "   This will show the first 50 lines of output..."
echo ""

timeout 30 npm run dev 2>&1 | head -50 &
DEV_PID=$!

sleep 15

# Check if process is still running
if kill -0 $DEV_PID 2>/dev/null; then
  echo ""
  echo "   ⏳ Process is still running..."
  
  # Check if port is listening
  if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ✅ Port 3000 is listening!"
    echo "   ✅ Server appears to be working!"
    kill $DEV_PID 2>/dev/null
    exit 0
  else
    echo "   ⚠️  Port 3000 is NOT listening yet"
    echo "   Process may still be compiling..."
  fi
  
  # Wait a bit more
  sleep 10
  
  if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ✅ Port 3000 is now listening!"
    kill $DEV_PID 2>/dev/null
    exit 0
  else
    echo "   ❌ Port 3000 still not listening after 25 seconds"
    echo "   Server may be hanging during compilation"
    kill $DEV_PID 2>/dev/null
    exit 1
  fi
else
  echo ""
  echo "   ❌ Process exited or crashed"
  echo "   Check the output above for errors"
  exit 1
fi
