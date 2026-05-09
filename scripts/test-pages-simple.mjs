#!/usr/bin/env node

/**
 * Simple Page Testing Script (No Playwright Required)
 * 
 * This script uses curl/fetch to test if pages are accessible
 * and checks for basic HTTP errors. Useful for quick checks.
 * 
 * Usage:
 *   npm run test:pages:simple
 *   or
 *   node scripts/test-pages-simple.mjs
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const PAGE_ROUTES = [
  '/',
  '/app/dashboard',
  '/app/messages',
  '/app/tasks',
  '/app/goals',
  '/app/forms',
  '/app/employees',
  '/app/calendar',
  '/app/operations',
  '/app/analytics',
  '/app/reports',
  '/app/admin',
  '/app/settings',
  '/app/expenses',
  '/app/time-off',
  '/app/enhanced-scheduling', // availability redirects here
  '/app/inventory-actions',
  '/app/items-setup',
  '/app/performance',
  '/app/learning-center',
  '/app/company-updates',
  '/app/help-desk',
  '/app/availability/manage',
  '/app/scheduling/timeoff',
  '/app/schedule-lobby',
  '/app/cookbook',
  '/app/purchasing',
  '/app/certifications',
  '/app/leaderboard',
  '/app/recognition',
  '/app/meetings',
  '/app/ai-insights',
  '/app/profile',
  '/app/position-management',
  '/app/sections-permissions',
  '/app/invite-employee',
  '/app/add-section',
];

async function testPage(route) {
  const url = `${BASE_URL}${route}`;
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PageTester/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const loadTime = Date.now() - startTime;
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');
    
    let contentLength = 0;
    let finalUrl = url;
    try {
      const text = await response.text();
      contentLength = text.length;
      finalUrl = response.url;
    } catch {
      // Ignore
    }

    // Check if redirected to auth page (common for protected routes)
    const redirectedToAuth = finalUrl.includes('/auth') || finalUrl.includes('/login');
    const isProtected = redirectedToAuth && status >= 200 && status < 400;

    return {
      route,
      status,
      loadTime,
      isHtml,
      contentLength,
      success: (status >= 200 && status < 400) || isProtected,
      redirected: response.redirected,
      finalUrl: finalUrl !== url ? finalUrl : undefined,
      isProtected,
    };
  } catch (error) {
    const loadTime = Date.now() - startTime;
    const errorMessage = error.message || String(error);
    const isNetworkError = errorMessage.includes('fetch failed') || 
                          errorMessage.includes('ECONNREFUSED') ||
                          errorMessage.includes('aborted');
    
    return {
      route,
      status: isNetworkError ? 'NETWORK_ERROR' : 'ERROR',
      loadTime,
      error: errorMessage,
      success: false,
      isNetworkError,
    };
  }
}

async function main() {
  console.log('🚀 Starting simple page testing...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = [];

  for (const route of PAGE_ROUTES) {
    const result = await testPage(route);
    results.push(result);
    
    const icon = result.success ? '✅' : '❌';
    const status = typeof result.status === 'number' ? result.status : result.status;
    const time = `${(result.loadTime / 1000).toFixed(2)}s`;
    console.log(`${icon} ${route.padEnd(30)} ${String(status).padStart(4)} ${time}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  
  console.log(`Total: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  const networkErrors = results.filter((r) => r.isNetworkError);
  const httpErrors = results.filter((r) => !r.success && !r.isNetworkError);
  const protectedPages = results.filter((r) => r.isProtected);

  if (networkErrors.length > 0) {
    console.log('\n⚠️  NETWORK ERRORS (Server may not be running):');
    networkErrors.forEach((r) => {
      console.log(`  ${r.route}: ${r.error || 'Connection failed'}`);
    });
  }

  if (httpErrors.length > 0) {
    console.log('\n🚨 HTTP ERRORS:');
    httpErrors.forEach((r) => {
      console.log(`  ${r.route}: ${r.status} ${r.error || ''}`);
    });
  }

  if (protectedPages.length > 0) {
    console.log('\n🔒 PROTECTED PAGES (Require authentication):');
    protectedPages.forEach((r) => {
      console.log(`  ${r.route} → ${r.finalUrl || 'auth page'}`);
    });
  }

  // Save results
  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(process.cwd(), 'docs', 'test-results', 'simple-page-test.json');
  const reportDir = path.join(process.cwd(), 'docs', 'test-results');
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        results,
      },
      null,
      2
    )
  );

  console.log(`\n📄 Report saved to: ${reportPath}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
