#!/usr/bin/env node

/**
 * Comprehensive Page Testing Script
 * 
 * This script systematically tests all pages in the application to identify:
 * - Console errors
 * - Runtime errors
 * - Missing functionality
 * - Broken features
 * 
 * Usage:
 *   npm run test:pages
 *   or
 *   node scripts/test-all-pages.mjs
 */

import { chromium } from 'playwright';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds per page
const CONCURRENT_PAGES = 3; // Test 3 pages at a time

// Pages to test - extracted from app/app directory structure
// Note: All app pages are under /app/ prefix
const PAGE_ROUTES = [
  // Core pages
  '/',
  '/app/dashboard',
  '/app/messages',
  '/app/tasks',
  '/app/goals',
  '/app/forms',
  '/app/employees',
  
  // Calendar & Scheduling
  '/app/calendar',
  '/app/enhanced-scheduling',
  '/app/scheduling/timeoff',
  '/app/schedule-lobby',
  '/app/time-off',
  '/app/enhanced-scheduling?tab=availability', // availability redirects here
  '/app/availability/manage',
  
  // Operations
  '/app/operations',
  '/app/company-updates',
  '/app/help-desk',
  
  // Analytics & Reports
  '/app/analytics',
  '/app/reports',
  '/app/ai-insights',
  
  // Inventory
  '/app/inventory-actions',
  '/app/inventory-count-execution',
  '/app/items-setup',
  '/app/purchasing',
  '/app/cookbook',
  
  // HR Development
  '/app/performance',
  '/app/learning-center',
  '/app/certifications',
  '/app/leaderboard',
  '/app/recognition',
  '/app/meetings',
  
  // Admin
  '/app/admin',
  '/app/settings',
  '/app/position-management',
  '/app/sections-permissions',
  '/app/invite-employee',
  '/app/add-section',
  
  // Resources
  '/app/resources',
  '/app/resources/docs',
  '/app/resources/docs/getting-started',
  '/app/resources/docs/user-manual',
  '/app/resources/docs/integrations',
  '/app/resources/docs/api',
  
  // Other
  '/app/expenses',
  '/app/profile',
  '/app/events/calendar',
];

// Pages that require authentication (will be skipped if not logged in)
const AUTH_REQUIRED = [
  '/app/dashboard',
  '/app/messages',
  '/app/tasks',
  '/app/goals',
  '/app/forms',
  '/app/employees',
  '/app/calendar',
  '/app/operations',
  '/app/admin',
  '/app/settings',
];

// Pages that might have dynamic routes
const DYNAMIC_ROUTES = [
  '/messages/[filter]',
  '/resources/blog/[id]',
  '/resources/docs/[id]',
  '/resources/videos/[id]',
  '/templates/[templateId]',
  '/section/[path]/[[...wildcard]]',
];

class PageTester {
  constructor(browser, baseUrl) {
    this.browser = browser;
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async testPage(route) {
    const startTime = Date.now();
    const result = {
      route,
      status: 'pending',
      errors: [],
      warnings: [],
      loadTime: 0,
      authenticated: false,
      hasContent: false,
      issues: [],
    };

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // Capture console errors and warnings
    const consoleMessages = [];
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      // Filter out common non-critical messages
      const ignoredPatterns = [
        /baseline-browser-mapping/i,
        /devtools/i,
        /source map/i,
        /hydration/i,
      ];
      
      const shouldIgnore = ignoredPatterns.some(pattern => pattern.test(text));
      if (shouldIgnore) return;
      
      if (type === 'error') {
        result.errors.push({
          type: 'console',
          message: text,
          location: msg.location(),
        });
      } else if (type === 'warning') {
        result.warnings.push({
          type: 'console',
          message: text,
        });
      }
      
      consoleMessages.push({ type, text });
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      result.errors.push({
        type: 'page',
        message: error.message,
        stack: error.stack,
      });
    });

    // Capture request failures
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (failure && failure.errorText !== 'net::ERR_ABORTED') {
        result.errors.push({
          type: 'network',
          message: `Request failed: ${request.url()}`,
          error: failure.errorText,
        });
      }
    });

    try {
      // Navigate to page
      const response = await page.goto(`${this.baseUrl}${route}`, {
        waitUntil: 'networkidle',
        timeout: TIMEOUT,
      });

      if (!response) {
        result.status = 'failed';
        result.issues.push('No response from server');
        return result;
      }

      result.statusCode = response.status();

      if (response.status() >= 400) {
        result.status = 'failed';
        result.issues.push(`HTTP ${response.status()}`);
        return result;
      }

      // Wait for page to be interactive
      await page.waitForLoadState('domcontentloaded');

      // Check if page requires authentication
      const url = page.url();
      if (url.includes('/auth') || url.includes('/login') || url.includes('/register')) {
        result.authenticated = false;
        if (AUTH_REQUIRED.includes(route)) {
          result.status = 'skipped';
          result.issues.push('Authentication required');
          return result;
        }
      } else {
        result.authenticated = true;
      }

      // Check if page has content
      const bodyText = await page.textContent('body').catch(() => '');
      const hasMainContent = bodyText.length > 100; // At least some content
      result.hasContent = hasMainContent;

      if (!hasMainContent) {
        result.issues.push('Page appears empty');
      }

      // Check for actual error indicators (more specific)
      // Only check for destructive alerts and actual error messages
      const errorIndicators = [
        {
          selector: '[role="alert"][class*="destructive"]',
          description: 'Destructive alert',
        },
        {
          selector: '[data-error="true"]',
          description: 'Error data attribute',
        },
        {
          selector: '.text-destructive:has-text("error")',
          description: 'Error text',
        },
        {
          selector: 'text=/something went wrong/i',
          description: 'Error boundary',
        },
        {
          selector: 'text=/failed to/i',
          description: 'Failure message',
        },
      ];

      for (const indicator of errorIndicators) {
        try {
          const element = await page.locator(indicator.selector).first();
          if (await element.isVisible().catch(() => false)) {
            const text = await element.textContent().catch(() => '');
            const trimmedText = text?.trim();
            // Only report if there's actual error text
            if (trimmedText && trimmedText.length > 0) {
              result.issues.push(`${indicator.description}: ${trimmedText.substring(0, 150)}`);
            }
          }
        } catch {
          // Selector not found, continue
        }
      }

      // Check for React error boundaries
      const errorBoundary = await page.locator('text=/something went wrong/i').first();
      if (await errorBoundary.isVisible().catch(() => false)) {
        result.status = 'failed';
        result.issues.push('React Error Boundary triggered');
      }

      result.status = result.errors.length > 0 ? 'error' : 'success';
      result.loadTime = Date.now() - startTime;

    } catch (error) {
      result.status = 'failed';
      result.errors.push({
        type: 'exception',
        message: error.message,
        stack: error.stack,
      });
      result.issues.push(`Exception: ${error.message}`);
    } finally {
      await context.close();
    }

    return result;
  }

  async testAllPages(routes) {
    console.log(`\n🧪 Testing ${routes.length} pages...\n`);
    console.log(`Base URL: ${BASE_URL}\n`);

    // Test pages in batches to avoid overwhelming the server
    for (let i = 0; i < routes.length; i += CONCURRENT_PAGES) {
      const batch = routes.slice(i, i + CONCURRENT_PAGES);
      const batchResults = await Promise.all(
        batch.map((route) => this.testPage(route))
      );

      this.results.push(...batchResults);

      // Log progress
      batchResults.forEach((result) => {
        const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : result.status === 'skipped' ? '⏭️' : '⚠️';
        const errors = result.errors.length > 0 ? ` (${result.errors.length} errors)` : '';
        console.log(`${icon} ${result.route}${errors}`);
      });
    }

    return this.results;
  }

  generateReport() {
    const total = this.results.length;
    const successful = this.results.filter((r) => r.status === 'success').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const errors = this.results.filter((r) => r.status === 'error').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;

    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total pages tested: ${total}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Errors (but loaded): ${errors}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log('='.repeat(80));

    // Pages with errors
    const pagesWithErrors = this.results.filter((r) => r.errors.length > 0);
    if (pagesWithErrors.length > 0) {
      console.log('\n🚨 PAGES WITH ERRORS:\n');
      pagesWithErrors.forEach((result) => {
        console.log(`\n${result.route}:`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Errors: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach((error, idx) => {
          console.log(`    ${idx + 1}. [${error.type}] ${error.message.substring(0, 100)}`);
        });
        if (result.errors.length > 3) {
          console.log(`    ... and ${result.errors.length - 3} more errors`);
        }
      });
    }

    // Pages with issues
    const pagesWithIssues = this.results.filter((r) => r.issues.length > 0);
    if (pagesWithIssues.length > 0) {
      console.log('\n⚠️  PAGES WITH ISSUES:\n');
      pagesWithIssues.forEach((result) => {
        console.log(`\n${result.route}:`);
        result.issues.forEach((issue, idx) => {
          console.log(`  ${idx + 1}. ${issue}`);
        });
      });
    }

    // Slow pages
    const slowPages = this.results
      .filter((r) => r.loadTime > 5000)
      .sort((a, b) => b.loadTime - a.loadTime);
    if (slowPages.length > 0) {
      console.log('\n🐌 SLOW PAGES (>5s load time):\n');
      slowPages.forEach((result) => {
        console.log(`  ${result.route}: ${(result.loadTime / 1000).toFixed(2)}s`);
      });
    }

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      summary: {
        total,
        successful,
        failed,
        errors,
        skipped,
      },
      results: this.results,
    };

    return report;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive page testing...\n');

  // Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/api/health`).catch(() => null);
    if (!response) {
      console.log(`⚠️  Warning: Could not reach ${BASE_URL}`);
      console.log('   Make sure the dev server is running: npm run dev\n');
    }
  } catch {
    // Ignore
  }

  const browser = await chromium.launch({
    headless: true,
    timeout: 60000,
  });

  try {
    const tester = new PageTester(browser, BASE_URL);
    await tester.testAllPages(PAGE_ROUTES);

    const report = tester.generateReport();

    // Save report to file
    const fs = await import('fs');
    const reportPath = join(process.cwd(), 'test-results', 'page-test-report.json');
    const reportDir = join(process.cwd(), 'test-results');
    
    if (!existsSync(reportDir)) {
      await import('fs/promises').then(({ mkdir }) => mkdir(reportDir, { recursive: true }));
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}\n`);

    // Exit with error code if there are failures
    const hasFailures = report.summary.failed > 0 || report.summary.errors > 0;
    process.exit(hasFailures ? 1 : 0);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
