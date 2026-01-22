#!/bin/bash
# Next.js Dev Server Hang Diagnostic Script

echo "=== Next.js Hang Diagnostic ==="
echo ""

# 1. Check Node version
echo "1. Checking Node version..."
NODE_VERSION=$(node -v)
echo "   Current: $NODE_VERSION"
if [ -f package.json ]; then
  if grep -q '"engines"' package.json; then
    echo "   Required (from package.json):"
    grep -A 2 '"engines"' package.json | head -3
  else
    echo "   No engines field in package.json"
  fi
fi
echo ""

# 2. Check if port 3000 is in use
echo "2. Checking if port 3000 is in use..."
if lsof -i :3000 > /dev/null 2>&1; then
  echo "   ⚠️  Port 3000 is in use:"
  lsof -i :3000
  echo "   Kill with: lsof -ti :3000 | xargs kill -9"
else
  echo "   ✓ Port 3000 is free"
fi
echo ""

# 3. Check for .next and cache directories
echo "3. Checking build artifacts..."
if [ -d .next ]; then
  echo "   ⚠️  .next directory exists ($(du -sh .next | cut -f1))"
else
  echo "   ✓ No .next directory"
fi
if [ -d node_modules/.cache ]; then
  echo "   ⚠️  node_modules/.cache exists ($(du -sh node_modules/.cache | cut -f1))"
else
  echo "   ✓ No node_modules/.cache"
fi
echo ""

# 4. Check environment variables
echo "4. Checking required environment variables..."
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
    echo "   ❌ $var is NOT set"
  else
    echo "   ✓ $var is set"
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo ""
  echo "   ⚠️  Missing environment variables detected!"
  echo "   This may cause the dev server to hang or fail."
fi
echo ""

# 5. Check Next.js version
echo "5. Checking Next.js version..."
if [ -f package.json ]; then
  NEXT_VERSION=$(grep -o '"next": "[^"]*"' package.json | cut -d'"' -f4)
  echo "   Installed: $NEXT_VERSION"
  echo "   Latest 14.x: 14.2.18"
  echo "   Latest 15.x: 15.1.0"
  echo "   Latest 16.x: 16.0.5"
fi
echo ""

# 6. Check for common hanging issues
echo "6. Checking for common issues..."
if grep -q "requireEnv" src/lib/config.ts 2>/dev/null; then
  if grep -q "getEnvOrWarn" src/lib/config.ts 2>/dev/null; then
    echo "   ✓ config.ts uses safe getEnvOrWarn (fixed)"
  else
    echo "   ⚠️  Found requireEnv() in config.ts - may throw if env vars missing"
  fi
fi

if grep -q "throw new Error" app/api/_server/supabaseAdmin.ts 2>/dev/null; then
  if grep -q "getSupabaseAdmin\|Proxy" app/api/_server/supabaseAdmin.ts 2>/dev/null; then
    echo "   ✓ supabaseAdmin.ts uses lazy initialization (fixed)"
  else
    echo "   ❌ supabaseAdmin.ts throws during module load - THIS WILL HANG THE SERVER!"
    echo "      This is likely the cause of the hang. See FIX_NOT_COMPILING.md"
  fi
fi

if grep -q "createClient" src/integrations/supabase/client.ts 2>/dev/null; then
  if grep -q "safeUrl\|placeholder" src/integrations/supabase/client.ts 2>/dev/null; then
    echo "   ✓ Supabase client uses safe initialization (fixed)"
  else
    echo "   ⚠️  Supabase client initialization found"
  fi
fi
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "Next steps:"
echo "  - Run: ./fix-nextjs-hang.sh (to clean caches)"
echo "  - Or run: NEXT_VERBOSE=1 npm run dev (for verbose logging)"
echo "  - Or run: node --inspect ./node_modules/next/dist/bin/next dev (for debugging)"
