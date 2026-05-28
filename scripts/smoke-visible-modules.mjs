#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const cwd = process.cwd();
const BASE_URL = process.env.TEST_URL || "http://127.0.0.1:3000";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 30000);
const HEADLESS = process.env.SMOKE_HEADED !== "1";
const KEEP_DATA = process.env.SMOKE_KEEP_DATA === "1";

const routeInventory = JSON.parse(
  readFileSync(
    join(cwd, "src/app-shell/navigation/moduleRouteInventory.json"),
    "utf8",
  ),
);

const ROUTES = routeInventory.routes
  .filter((route) => route.smoke)
  .map((route) => ({ name: route.label, path: route.path }));

const ERROR_TEXT_PATTERNS = [
  /application error/i,
  /runtime error/i,
  /something went wrong/i,
  /profile setup is incomplete/i,
  /tenant setup required/i,
  /failed to load profile/i,
  /supabasedataexception/i,
];

const IGNORED_CONSOLE_PATTERNS = [
  /download the react devtools/i,
  /fast refresh/i,
  /failed to load resource/i,
  /nextjs-toploader/i,
  /using placeholder client/i,
  /missing environment variable: next_public_openai/i,
  /task notifications subscription closed/i,
  /task notifications subscription channel_error/i,
  /websocket connection to .*\/realtime\/v1\/websocket.*failed/i,
  /websocket is closed before the connection is established/i,
];

function readEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(cwd, fileName);
    if (!existsSync(filePath)) continue;

    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [rawKey, ...rawValueParts] = trimmed.split("=");
      const key = rawKey.trim();
      let value = rawValueParts.join("=").trim();
      value = value.replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function requireEnv(name, fallbackName) {
  const value =
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new Error(`Missing ${name}${fallbackName ? `/${fallbackName}` : ""}`);
  }
  return value;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function shouldIgnoreConsole(text) {
  return IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
}

function redactDiagnosticText(value) {
  return String(value)
    .replace(/([?&]apikey=)[^&\s"'`]+/gi, "$1[redacted]")
    .replace(/([?&]access_token=)[^&\s"'`]+/gi, "$1[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "$1[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-jwt]");
}

function sanitizeDiagnosticValue(value) {
  if (typeof value === "string") {
    return redactDiagnosticText(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeDiagnosticValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeDiagnosticValue(entry),
      ]),
    );
  }

  return value;
}

function isAuthRedirect(url) {
  return (
    url.includes("/auth") ||
    url.includes("/login") ||
    url.includes("/register") ||
    url.includes("/company-registration")
  );
}

function hasErrorShell(text) {
  return ERROR_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function formatDiagnostics(result) {
  const lines = [];

  for (const error of result.errors.slice(0, 5)) {
    lines.push(`${error.type}: ${error.message}`);
  }

  if (result.errors.length > 5) {
    lines.push(`... ${result.errors.length - 5} more errors`);
  }

  for (const warning of result.warnings.slice(0, 3)) {
    lines.push(`warning/${warning.type}: ${warning.message}`);
  }

  return lines.join("; ");
}

function buildClients() {
  readEnvFiles();

  const supabaseUrl = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return {
    admin: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function assertBaseUrlAvailable() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(BASE_URL, {
      redirect: "manual",
      signal: controller.signal,
    });
    assert(
      response.status < 500,
      `Smoke base URL returned HTTP ${response.status}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Smoke base URL is not reachable: ${BASE_URL}. Start the app server first. ${message}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function removeRows(admin, table, column, value) {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error) {
    throw new Error(`${table} cleanup failed: ${error.message}`);
  }
}

async function insertRows(admin, table, rows) {
  const { error } = await admin.from(table).insert(rows);
  if (error) {
    throw new Error(`${table} seed failed: ${error.message}`);
  }
}

async function seedSmokeTenant(admin) {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const companyId = randomUUID();
  const userId = randomUUID();
  const departmentId = randomUUID();
  const roleId = randomUUID();
  const taskId = randomUUID();
  const channelId = randomUUID();
  const calendarEventId = randomUUID();
  const scheduleId = randomUUID();
  const itemId = randomUUID();
  const email = `module-smoke-${runId}@example.test`;
  const password = `FlowForce-${runId}!`;
  const now = new Date();
  const startAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      id: userId,
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: "Smoke",
        last_name: "Owner",
        company_id: companyId,
        active_company_id: companyId,
      },
      app_metadata: {
        company_id: companyId,
        active_company_id: companyId,
      },
    });

  if (createUserError) {
    throw new Error(`Smoke auth user seed failed: ${createUserError.message}`);
  }

  const authUserId = createdUser.user?.id ?? userId;

  await insertRows(admin, "companies", [
    {
      id: companyId,
      name: `Module Smoke ${runId}`,
      slug: `module-smoke-${runId}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
      created_by: authUserId,
      owner_id: authUserId,
      registration_complete: true,
      enabled_sections: [
        "dashboard",
        "employees",
        "tasks",
        "messages",
        "company-updates",
        "calendar",
        "scheduling",
        "forms",
        "inventory",
        "analytics",
        "settings",
      ],
    },
  ]);

  await insertRows(admin, "company_roles", [
    {
      id: roleId,
      company_id: companyId,
      name: "Owner",
      description: "Smoke owner role",
      hierarchy_level: 1,
      permissions: { all: true },
      is_system_role: true,
      is_active: true,
      created_by: authUserId,
    },
  ]);

  await insertRows(admin, "profiles", [
    {
      id: authUserId,
      company_id: companyId,
      first_name: "Smoke",
      last_name: "Owner",
      email,
      role: "owner",
      role_id: roleId,
      is_company_admin: true,
      employment_status: "active",
    },
  ]);

  await insertRows(admin, "company_members", [
    {
      company_id: companyId,
      user_id: authUserId,
      role: "owner",
      added_at: now.toISOString(),
    },
  ]);

  await insertRows(admin, "system_settings", [{ company_id: companyId }]);

  await insertRows(admin, "departments", [
    {
      id: departmentId,
      company_id: companyId,
      name: "Smoke Operations",
      type: "operations",
      manager_id: authUserId,
    },
  ]);

  await insertRows(admin, "tasks", [
    {
      id: taskId,
      company_id: companyId,
      title: "Smoke task",
      description: "Seeded by visible module smoke test",
      status: "open",
      priority: "medium",
      created_by: authUserId,
      assigned_to: authUserId,
      due_date: now.toISOString().slice(0, 10),
    },
  ]);

  await insertRows(admin, "message_channels", [
    {
      id: channelId,
      company_id: companyId,
      name: "Smoke channel",
      type: "team",
      created_by: authUserId,
      is_private: false,
    },
  ]);

  await insertRows(admin, "channel_members", [
    {
      channel_id: channelId,
      company_id: companyId,
      user_id: authUserId,
      role: "owner",
      joined_at: now.toISOString(),
    },
  ]);

  await insertRows(admin, "messages", [
    {
      channel_id: channelId,
      company_id: companyId,
      sender_id: authUserId,
      content: "Smoke message",
      message_type: "text",
    },
  ]);

  await insertRows(admin, "company_updates", [
    {
      company_id: companyId,
      title: "Smoke update",
      body: "Seeded by visible module smoke test",
      status: "published",
      author_id: authUserId,
      created_by: authUserId,
      publish_date: now.toISOString().slice(0, 10),
      update_type: "announcement",
    },
  ]);

  await insertRows(admin, "calendar_events", [
    {
      id: calendarEventId,
      company_id: companyId,
      title: "Smoke calendar event",
      description: "Seeded by visible module smoke test",
      event_type: "meeting",
      start_time: startAt,
      end_time: endAt,
      created_by: authUserId,
    },
  ]);

  await insertRows(admin, "schedules", [
    {
      id: scheduleId,
      company_id: companyId,
      title: "Smoke shift",
      user_id: authUserId,
      created_by: authUserId,
      start_time: startAt,
      end_time: endAt,
      status: "published",
      role: "owner",
      is_published: true,
    },
  ]);

  await insertRows(admin, "inventory_items", [
    {
      id: itemId,
      company_id: companyId,
      name: "Smoke item",
      sku: `SMOKE-${runId.slice(0, 8)}`,
      current_stock: 10,
      min_stock_level: 2,
      unit: "each",
      unit_price: 3.5,
      status: "active",
      created_by: authUserId,
    },
  ]);

  await insertRows(admin, "inventory_transactions", [
    {
      company_id: companyId,
      item_id: itemId,
      performed_by: authUserId,
      quantity: 1,
      transaction_type: "adjustment",
      notes: "Smoke transaction",
    },
  ]);

  await insertRows(admin, "kpi_insights", [
    {
      company_id: companyId,
      metric: "sales",
      label: "Smoke KPI",
      value: 100,
      delta: 5,
      trend: "up",
      unit: "count",
      recorded_at: now.toISOString(),
    },
  ]);

  return {
    runId,
    email,
    password,
    userId: authUserId,
    companyId,
    ids: {
      departmentId,
      roleId,
      taskId,
      channelId,
      calendarEventId,
      scheduleId,
      itemId,
    },
  };
}

async function cleanupSmokeTenant(admin, seed) {
  if (KEEP_DATA || !seed?.userId || !seed?.companyId) return;

  const companyTables = [
    "kpi_insights",
    "inventory_transactions",
    "inventory_items",
    "schedules",
    "calendar_events",
    "company_updates",
    "messages",
    "channel_members",
    "message_channels",
    "tasks",
    "departments",
    "system_settings",
    "company_members",
    "profiles",
    "company_roles",
    "companies",
  ];

  for (const table of companyTables) {
    if (table === "profiles") {
      await removeRows(admin, table, "id", seed.userId);
    } else if (table === "company_members") {
      await removeRows(admin, table, "user_id", seed.userId);
    } else if (table === "companies") {
      await removeRows(admin, table, "id", seed.companyId);
    } else {
      await removeRows(admin, table, "company_id", seed.companyId);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(seed.userId);
  if (error) {
    throw new Error(`Smoke auth user cleanup failed: ${error.message}`);
  }
}

function attachPageDiagnostics(page, result) {
  page.on("console", (message) => {
    const text = message.text();
    if (shouldIgnoreConsole(text)) return;

    if (message.type() === "error") {
      result.errors.push({
        type: "console",
        message: redactDiagnosticText(text),
        location: sanitizeDiagnosticValue(message.location()),
      });
    } else if (message.type() === "warning") {
      result.warnings.push({
        type: "console",
        message: redactDiagnosticText(text),
      });
    }
  });

  page.on("pageerror", (error) => {
    result.errors.push({
      type: "pageerror",
      message: redactDiagnosticText(error.message),
      stack: error.stack ? redactDiagnosticText(error.stack) : error.stack,
    });
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const resourceType = request.resourceType();
    if (!failure || failure.errorText === "net::ERR_ABORTED") return;
    if (!["document", "fetch", "xhr"].includes(resourceType)) return;

    result.errors.push({
      type: "requestfailed",
      message: redactDiagnosticText(`${resourceType} failed: ${request.url()}`),
      error: redactDiagnosticText(failure.errorText),
    });
  });

  page.on("response", (response) => {
    const status = response.status();
    const request = response.request();
    const resourceType = request.resourceType();
    if (status < 400) return;
    if (!["document", "fetch", "xhr"].includes(resourceType)) return;

    result.errors.push({
      type: "response",
      message: redactDiagnosticText(`${status} ${resourceType}: ${response.url()}`),
    });
  });
}

async function signIn(context, seed) {
  const page = await context.newPage();
  const result = {
    name: "Sign in",
    path: "/auth",
    errors: [],
    warnings: [],
  };
  attachPageDiagnostics(page, result);

  await page.goto(`${BASE_URL}/auth`, {
    waitUntil: "domcontentloaded",
    timeout: TIMEOUT_MS,
  });
  await page.fill("#signin-email", seed.email);
  await page.fill("#signin-password", seed.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app\/dashboard/, { timeout: TIMEOUT_MS });
  await page.waitForLoadState("networkidle", { timeout: TIMEOUT_MS }).catch(() => {});

  const bodyText = (await page.textContent("body").catch(() => "")) ?? "";
  assert(!hasErrorShell(bodyText), "Sign in reached an application error shell");
  assert(
    result.errors.length === 0,
    `Sign in produced page or console errors${
      result.errors.length > 0 ? `: ${formatDiagnostics(result)}` : ""
    }`,
  );

  await page.close();
}

async function testRoute(context, route) {
  const startedAt = Date.now();
  const page = await context.newPage();
  const result = {
    ...route,
    status: "pending",
    finalUrl: null,
    durationMs: 0,
    hasContent: false,
    hasErrorShell: false,
    errors: [],
    warnings: [],
    ok: false,
  };

  attachPageDiagnostics(page, result);

  try {
    const response = await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT_MS,
    });
    await page.waitForLoadState("networkidle", { timeout: TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(750);

    const bodyText = (await page.textContent("body").catch(() => "")) ?? "";
    result.status = response?.status() ?? "NO_RESPONSE";
    result.finalUrl = page.url();
    result.durationMs = Date.now() - startedAt;
    result.hasContent = bodyText.trim().length > 100;
    result.hasErrorShell = hasErrorShell(bodyText);

    const httpOk =
      typeof result.status === "number" &&
      result.status >= 200 &&
      result.status < 400;

    if (isAuthRedirect(result.finalUrl)) {
      result.errors.push({
        type: "auth",
        message: `Authenticated smoke route redirected to ${result.finalUrl}`,
      });
    }

    if (!result.hasContent) {
      result.errors.push({
        type: "content",
        message: "Response body looked empty",
      });
    }

    if (result.hasErrorShell) {
      result.errors.push({
        type: "application",
        message: "Rendered an application error/setup shell",
      });
    }

    result.ok = httpOk && result.hasContent && !result.hasErrorShell && result.errors.length === 0;
  } catch (error) {
    result.status = "ERROR";
    result.finalUrl = page.url();
    result.durationMs = Date.now() - startedAt;
    result.errors.push({
      type: "exception",
      message: redactDiagnosticText(
        error instanceof Error ? error.message : String(error),
      ),
    });
  } finally {
    await page.close().catch(() => {});
  }

  return result;
}

function printResult(result) {
  const state = result.ok ? "PASS" : "FAIL";
  const status = String(result.status).padStart(5);
  const seconds = `${(result.durationMs / 1000).toFixed(2)}s`.padStart(7);
  process.stdout.write(
    `${state} ${status} ${seconds} ${result.path} - ${result.name}\n`,
  );

  for (const error of result.errors.slice(0, 5)) {
    process.stdout.write(`  ${error.type}: ${error.message}\n`);
  }

  if (result.errors.length > 5) {
    process.stdout.write(`  ... ${result.errors.length - 5} more errors\n`);
  }
}

async function main() {
  const { admin } = buildClients();
  const reportDir = join(cwd, "docs", "test-results");
  const reportPath = join(reportDir, "visible-modules-smoke.json");
  let browser = null;
  let seed = null;
  let cleanupError = null;

  process.stdout.write("FlowForce authenticated visible-module smoke test\n");
  process.stdout.write(`Base URL: ${BASE_URL}\n\n`);

  try {
    rmSync(reportPath, { force: true });
    await assertBaseUrlAvailable();
    seed = await seedSmokeTenant(admin);
    process.stdout.write(`Seeded smoke tenant: ${seed.companyId}\n`);

    browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      ignoreHTTPSErrors: true,
    });

    await signIn(context, seed);
    process.stdout.write("Signed in smoke owner through /auth\n\n");

    const results = [];
    for (const route of ROUTES) {
      const result = await testRoute(context, route);
      results.push(result);
      printResult(result);
    }

    const passed = results.filter((result) => result.ok).length;
    const failed = results.length - passed;
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const report = sanitizeDiagnosticValue({
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      timeoutMs: TIMEOUT_MS,
      seed: {
        runId: seed.runId,
        companyId: seed.companyId,
        userId: seed.userId,
        kept: KEEP_DATA,
      },
      summary: { total: results.length, passed, failed },
      results,
    });

    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    process.stdout.write(
      `\nSummary: ${passed}/${results.length} passed. Report: ${reportPath}\n`,
    );

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }

    if (seed) {
      try {
        await cleanupSmokeTenant(admin, seed);
      } catch (error) {
        cleanupError = error;
      }
    }
  }

  if (cleanupError) {
    process.stderr.write(`Smoke cleanup failed: ${cleanupError.message}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`Smoke test failed: ${error.message}\n`);
  process.exitCode = 1;
});
