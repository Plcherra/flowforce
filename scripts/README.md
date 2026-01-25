# Page Testing Scripts

## Overview

These scripts systematically test all pages in the application to identify errors, broken functionality, and performance issues.

## Scripts

### 1. `test-all-pages.mjs` (Comprehensive Testing)

**Full-featured testing using Playwright** - Tests pages with a real browser, captures console errors, network failures, and React errors.

**Features:**
- ✅ Captures console errors and warnings
- ✅ Detects page errors and React error boundaries
- ✅ Monitors network request failures
- ✅ Checks page load times
- ✅ Verifies page content
- ✅ Generates detailed JSON report

**Usage:**
```bash
# Make sure dev server is running
npm run dev

# In another terminal, run the test
npm run test:pages
```

**Requirements:**
- Playwright installed (`npm install -D playwright`)
- Dev server running on `http://localhost:3000`

**Output:**
- Console output with real-time progress
- Detailed report in `test-results/page-test-report.json`

### 2. `test-pages-simple.mjs` (Quick Testing)

**Lightweight testing using fetch** - Quick HTTP checks to see if pages are accessible.

**Features:**
- ✅ Fast HTTP status checks
- ✅ Basic accessibility testing
- ✅ No dependencies required
- ✅ Works without browser

**Usage:**
```bash
# Make sure dev server is running
npm run dev

# Run simple test
npm run test:pages:simple
```

**Requirements:**
- Node.js 18+ (native fetch support)
- Dev server running

**Output:**
- Console summary
- JSON report in `test-results/simple-page-test.json`

## Test Results

All test results are saved to `test-results/` directory:

- `page-test-report.json` - Full Playwright test results
- `simple-page-test.json` - Simple HTTP test results

## Interpreting Results

### Status Codes
- `success` - Page loaded without errors
- `error` - Page loaded but has console/runtime errors
- `failed` - Page failed to load (HTTP error, exception, etc.)
- `skipped` - Page requires authentication or other condition

### Error Types
- `console` - Console.error() calls
- `page` - Uncaught JavaScript errors
- `network` - Failed HTTP requests
- `exception` - Test execution exceptions

## Next Steps

After running tests:

1. **Review the console output** - See which pages have issues
2. **Check the JSON report** - Detailed error information
3. **Fix errors page by page** - Start with most critical pages
4. **Re-run tests** - Verify fixes work

## Example Workflow

```bash
# 1. Start dev server
npm run dev

# 2. Run comprehensive tests (in another terminal)
npm run test:pages

# 3. Review results
cat test-results/page-test-report.json | jq '.results[] | select(.status != "success")'

# 4. Fix issues and re-test
npm run test:pages
```

## Customization

### Add/Remove Pages

Edit the `PAGE_ROUTES` array in either script to test different pages.

### Change Base URL

Set `TEST_URL` environment variable:
```bash
TEST_URL=http://localhost:3001 npm run test:pages
```

### Adjust Timeouts

Modify `TIMEOUT` constant in `test-all-pages.mjs` (default: 30 seconds)
