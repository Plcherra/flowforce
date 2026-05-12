#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15000);

const ROUTES = [
  { name: "Marketing home", path: "/" },
  { name: "Company registration", path: "/company-registration" },
  { name: "Dashboard", path: "/app/dashboard", authRequired: true },
  { name: "Employees", path: "/app/employees", authRequired: true },
  { name: "Tasks", path: "/app/tasks", authRequired: true },
  { name: "Messages", path: "/app/messages", authRequired: true },
  { name: "Company updates", path: "/app/company-updates", authRequired: true },
  { name: "Calendar", path: "/app/calendar", authRequired: true },
  {
    name: "Scheduling",
    path: "/app/enhanced-scheduling",
    authRequired: true,
    note: "Canonical scheduling route. /app/scheduling is not a page.",
  },
  {
    name: "Inventory actions",
    path: "/app/inventory-actions",
    authRequired: true,
  },
  { name: "Analytics", path: "/app/analytics", authRequired: true },
];

function isAuthRedirect(url) {
  return (
    url.includes("/auth") ||
    url.includes("/login") ||
    url.includes("/register")
  );
}

function hasErrorShell(html) {
  const lower = html.toLowerCase();
  return (
    lower.includes("something went wrong") ||
    lower.includes("application error") ||
    lower.includes("runtime error")
  );
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "FlowForceSmokeTest/1.0",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function testRoute(route) {
  const startedAt = Date.now();
  const url = `${BASE_URL}${route.path}`;

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const durationMs = Date.now() - startedAt;
    const finalUrl = response.url;
    const redirectedToAuth = isAuthRedirect(finalUrl);
    const httpOk = response.status >= 200 && response.status < 400;
    const authOk = route.authRequired && redirectedToAuth && httpOk;
    const hasContent = html.trim().length > 100;
    const hasError = hasErrorShell(html);

    return {
      ...route,
      status: response.status,
      finalUrl: finalUrl === url ? undefined : finalUrl,
      durationMs,
      ok: (httpOk || authOk) && hasContent && !hasError,
      redirectedToAuth,
      hasContent,
      hasError,
      error: null,
    };
  } catch (error) {
    return {
      ...route,
      status: "ERROR",
      finalUrl: undefined,
      durationMs: Date.now() - startedAt,
      ok: false,
      redirectedToAuth: false,
      hasContent: false,
      hasError: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printResult(result) {
  const state = result.ok ? "PASS" : "FAIL";
  const status = String(result.status).padStart(5);
  const seconds = `${(result.durationMs / 1000).toFixed(2)}s`.padStart(7);
  const auth = result.redirectedToAuth ? " auth-redirect" : "";
  process.stdout.write(
    `${state} ${status} ${seconds} ${result.path} - ${result.name}${auth}\n`,
  );

  if (!result.ok && result.error) {
    process.stdout.write(`  error: ${result.error}\n`);
  }

  if (!result.ok && result.hasError) {
    process.stdout.write("  error: rendered an application error shell\n");
  }

  if (!result.ok && !result.hasContent) {
    process.stdout.write("  error: response body looked empty\n");
  }
}

async function main() {
  process.stdout.write("FlowForce visible-module smoke test\n");
  process.stdout.write(`Base URL: ${BASE_URL}\n\n`);

  const results = [];
  for (const route of ROUTES) {
    const result = await testRoute(route);
    results.push(result);
    printResult(result);
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  const reportDir = join(process.cwd(), "docs", "test-results");
  const reportPath = join(reportDir, "visible-modules-smoke.json");

  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        timeoutMs: TIMEOUT_MS,
        summary: { total: results.length, passed, failed },
        results,
      },
      null,
      2,
    ),
  );

  process.stdout.write(
    `\nSummary: ${passed}/${results.length} passed. Report: ${reportPath}\n`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`Smoke test failed: ${error.message}\n`);
  process.exitCode = 1;
});
