#!/bin/bash
# Next.js Dev Server Hang Fix Script

set -e

echo "=== Fixing Next.js Hang Issues ==="
echo ""

# 1. Kill any process on port 3000
echo "1. Killing processes on port 3000..."
if lsof -ti :3000 > /dev/null 2>&1; then
  lsof -ti :3000 | xargs kill -9 2>/dev/null || true
  echo "   ✓ Killed processes on port 3000"
  sleep 1
else
  echo "   ✓ Port 3000 is free"
fi
echo ""

# 2. Clean caches
echo "2. Cleaning caches..."
if [ -d .next ]; then
  rm -rf .next
  echo "   ✓ Removed .next directory"
fi

if [ -d node_modules/.cache ]; then
  rm -rf node_modules/.cache
  echo "   ✓ Removed node_modules/.cache"
fi

# Clean Next.js cache
if [ -d .next/cache ]; then
  rm -rf .next/cache
  echo "   ✓ Removed .next/cache"
fi
echo ""

# 3. Reinstall dependencies (optional, uncomment if needed)
# echo "3. Reinstalling dependencies..."
# npm install
# echo "   ✓ Dependencies reinstalled"
# echo ""

echo "=== Cleanup Complete ==="
echo ""
echo "You can now try running: npm run dev"
