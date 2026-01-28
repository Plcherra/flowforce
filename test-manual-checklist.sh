#!/bin/bash

# Manual Test Checklist Automation Script
# This script helps verify the app is running and provides quick checks

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "FlowForce MVP Manual Test Helper"
echo "========================================="
echo ""

# Check if server is running
echo "Checking if server is running..."
if curl -s "$BASE_URL" > /dev/null; then
    echo -e "${GREEN}✓ Server is running on $BASE_URL${NC}"
else
    echo -e "${RED}✗ Server is not running. Please start with: npm run dev${NC}"
    exit 1
fi
echo ""

# Test core pages
echo "Testing core pages..."
PAGES=(
    "/app/dashboard"
    "/app/messages"
    "/app/tasks"
    "/app/goals"
    "/app/forms"
    "/app/employees"
    "/app/calendar"
    "/app/company-updates"
    "/app/operations"
    "/app/analytics"
    "/app/reports"
)

for page in "${PAGES[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page")
    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✓${NC} $page (HTTP $status)"
    elif [ "$status" = "302" ] || [ "$status" = "307" ] || [ "$status" = "308" ]; then
        echo -e "${YELLOW}⚠${NC} $page (HTTP $status - redirect, may require auth)"
    else
        echo -e "${RED}✗${NC} $page (HTTP $status)"
    fi
done
echo ""

# Check for common error patterns in build
echo "Checking for common issues..."
echo ""

# Check if error boundary exists
if grep -q "ErrorBoundary" src/components/ui/error-boundary.tsx 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Error boundary component exists"
else
    echo -e "${RED}✗${NC} Error boundary component not found"
fi

# Check if global error handlers exist
if grep -q "unhandledrejection" app/providers.tsx 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Global error handlers implemented"
else
    echo -e "${YELLOW}⚠${NC} Global error handlers may be missing"
fi

# Check React Query error handling
QUERY_HOOKS_WITH_ERROR_HANDLING=$(grep -l "throwOnError: false" src/hooks/*.tsx src/hooks/*.ts 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Found $QUERY_HOOKS_WITH_ERROR_HANDLING hooks with error handling"

echo ""
echo "========================================="
echo "Manual Testing Instructions:"
echo "========================================="
echo ""
echo "1. Open browser to: $BASE_URL"
echo "2. Open DevTools (F12 or Cmd+Option+I)"
echo "3. Go to Console tab"
echo "4. Navigate through all sidebar items"
echo "5. Test create/submit actions:"
echo "   - Create channel in Messages"
echo "   - Upload file in Reports"
echo "   - Create task in Tasks"
echo "   - Create goal in Goals"
echo "   - Create form in Forms"
echo "6. Check console for:"
echo "   - Unhandled promise rejections"
echo "   - React errors"
echo "   - Missing key warnings"
echo "   - Hydration mismatches"
echo "7. Check Network tab for:"
echo "   - Failed requests (401, 500, CORS)"
echo "   - Silent failures"
echo "8. Test error scenarios:"
echo "   - Disconnect network → try to create item"
echo "   - Submit invalid form data"
echo "   - Trigger 401 (if possible)"
echo ""
echo "See MANUAL_TEST_CHECKLIST.md for full checklist"
echo ""
