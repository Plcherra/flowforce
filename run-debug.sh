#!/bin/bash
# Comprehensive debug script for Next.js dev server

# Navigate to script directory
cd "$(dirname "$0")"

echo "=========================================="
echo "  Next.js Dev Server Debug"
echo "=========================================="
echo ""
echo "Working directory: $(pwd)"
echo ""

# Verify we're in the right place
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: package.json not found!"
  echo "Please run this script from the project root directory"
  exit 1
fi

echo "✓ Found package.json"
echo ""

# Step 1: Clean up
echo "Step 1: Cleaning up..."
pkill -f "next dev" 2>/dev/null
sleep 1
if lsof -ti :3000 > /dev/null 2>&1; then
  lsof -ti :3000 | xargs kill -9 2>/dev/null
  echo "  ✓ Killed process on port 3000"
else
  echo "  ✓ Port 3000 is free"
fi
echo ""

# Step 2: Clean caches
echo "Step 2: Cleaning caches..."
rm -rf .next 2>/dev/null && echo "  ✓ Removed .next"
rm -rf node_modules/.cache 2>/dev/null && echo "  ✓ Removed node_modules/.cache"
echo ""

# Step 3: Check environment
echo "Step 3: Environment check..."
echo "  Node: $(node -v)"
echo "  NPM: $(npm -v)"
NEXT_VER=$(grep -o '"next": "[^"]*"' package.json | cut -d'"' -f4)
echo "  Next.js: $NEXT_VER"
echo ""

# Step 4: Check for syntax errors
echo "Step 4: Checking for TypeScript errors..."
if npm run typecheck > /tmp/typecheck.log 2>&1; then
  echo "  ✓ No TypeScript errors"
else
  echo "  ⚠️  TypeScript errors found:"
  head -20 /tmp/typecheck.log | sed 's/^/    /'
  echo "  (See /tmp/typecheck.log for full output)"
fi
echo ""

# Step 5: Check env vars
echo "Step 5: Environment variables..."
ENV_ISSUES=0
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "  ⚠️  SUPABASE_URL not set (may cause issues)"
  ENV_ISSUES=1
else
  echo "  ✓ SUPABASE_URL is set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "  ⚠️  SUPABASE_SERVICE_ROLE_KEY not set (API routes won't work)"
  ENV_ISSUES=1
else
  echo "  ✓ SUPABASE_SERVICE_ROLE_KEY is set"
fi
echo ""

# Step 6: Try to start
echo "Step 6: Starting dev server..."
echo "  This will run for 30 seconds to see if it compiles..."
echo "  Watch for 'Local: http://localhost:3000' message"
echo ""

# Start the server and capture output
npm run dev > /tmp/nextjs-output.log 2>&1 &
DEV_PID=$!

# Wait and check progress
for i in {1..6}; do
  sleep 5
  echo "  [${i}0s] Checking..."
  
  # Check if process is still running
  if ! kill -0 $DEV_PID 2>/dev/null; then
    echo ""
    echo "  ❌ Process exited!"
    echo "  Last 30 lines of output:"
    tail -30 /tmp/nextjs-output.log | sed 's/^/    /'
    exit 1
  fi
  
  # Check if port is listening
  if lsof -i :3000 > /dev/null 2>&1; then
    echo ""
    echo "  ✅ SUCCESS! Port 3000 is listening!"
    echo "  ✅ Server is running!"
    echo ""
    echo "  Output:"
    tail -20 /tmp/nextjs-output.log | sed 's/^/    /'
    echo ""
    echo "  You can now access: http://localhost:3000"
    echo "  (Server will continue running in background)"
    exit 0
  fi
  
  # Show recent output
  if [ -f /tmp/nextjs-output.log ]; then
    LINES=$(wc -l < /tmp/nextjs-output.log)
    if [ "$LINES" -gt 0 ]; then
      echo "    Recent output:"
      tail -3 /tmp/nextjs-output.log | sed 's/^/      /'
    fi
  fi
done

# If we get here, it didn't start
echo ""
echo "  ❌ Server did not start after 30 seconds"
echo ""
echo "  Full output:"
cat /tmp/nextjs-output.log | sed 's/^/    /'
echo ""
echo "  Next steps:"
echo "    1. Check the output above for errors"
echo "    2. Try: NEXT_VERBOSE=1 npm run dev"
echo "    3. Try: npm run dev:turbo"
echo "    4. Check: npm run typecheck"

kill $DEV_PID 2>/dev/null
exit 1
