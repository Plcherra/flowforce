import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const service = readText("src/services/integrations/integrationMonitoring.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const ui = readText(
  "src/features/system/components/IntegrationSettingsPanel.tsx",
);
const doc = readText("docs/integration-monitoring.md");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-09-integration-monitoring-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "IntegrationMonitorKey",
    "IntegrationStatusDashboardRow",
    "IntegrationAlertRule",
    "IntegrationSupportDiagnostic",
    "integrationStatusDashboardRows",
    "integrationAlertRules",
    "buildIntegrationStatusDashboard",
    "buildIntegrationSupportDiagnostics",
    "buildIntegrationMonitoringSnapshot",
    "buildIntegrationMonitoringReadiness",
    "isIntegrationMonitoringReady",
    '"toast_pos"',
    '"quickbooks_accounting"',
    '"marketman_migration"',
    '"webhooks"',
    "lastSuccessfulSyncAt",
    "consecutiveFailures",
    "nextRetryAt",
    "warnings",
  ],
  "integration monitoring service",
);

requireIncludes(
  auditEvents,
  [
    "integrationMonitoringHealthChecked",
    "integrationMonitoringAlertTriggered",
    "integrationMonitoringDiagnosticsGenerated",
    "integration.monitoring.health_checked",
    "integration.monitoring.alert_triggered",
    "integration.monitoring.diagnostics_generated",
  ],
  "audit event definitions",
);

requireIncludes(
  ui,
  [
    "Integration monitoring",
    "buildIntegrationStatusDashboard",
    "buildIntegrationMonitoringReadiness",
    "buildIntegrationSupportDiagnostics",
    "Status dashboard",
    "Critical alerts",
    "Diagnostics",
    "Simulated failures",
  ],
  "integration settings UI",
);

requireIncludes(
  doc,
  [
    "CSV imports.",
    "Toast POS is failing",
    "QuickBooks accounting has rate-limit retry warnings.",
    "MarketMan migration has unit conversion warnings.",
    "Webhooks have delivery retry warnings.",
    "Critical sync failure",
    "Support-safe diagnostics include",
    "integration.monitoring.health_checked",
    "npm run check:integration-monitoring",
  ],
  "integration monitoring doc",
);

requireIncludes(
  plan,
  [
    "- [x] Add sync status dashboard.",
    "- [x] Add last successful sync, failures, retries, and warnings.",
    "- [x] Add alerting for broken critical syncs.",
    "- [x] Add support diagnostics.",
    "09.09 Integration Monitoring",
    "integration-monitoring.md",
  ],
  "Plan 09 roadmap",
);

const phaseNineBlock = plan.match(
  /### Phase 9: Integration Monitoring[\s\S]*?(?=### Phase 10: Migration And Integration Signoff)/,
)?.[0];

if (!phaseNineBlock || phaseNineBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 9 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "Last phase report: [10.08 CI/CD Release Gates]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "imports, migrations, POS, accounting, payroll, public API, and webhooks",
    "Toast POS, QuickBooks accounting, MarketMan migration, and webhooks",
    "support-safe diagnostics",
    "Phase 09.10",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:integration-monitoring",
    "scripts/check-integration-monitoring-contract.mjs",
  ],
  "package scripts",
);

const monitoring = await jiti.import(
  join(root, "src/services/integrations/integrationMonitoring.ts"),
);

if (!monitoring.isIntegrationMonitoringReady()) {
  throw new Error("Integration monitoring readiness check failed");
}

const dashboard = monitoring.buildIntegrationStatusDashboard();

if (
  dashboard.totalIntegrations < 10 ||
  dashboard.failingCount < 1 ||
  dashboard.retryingCount < 3 ||
  dashboard.staleCriticalCount < 1
) {
  throw new Error(
    "Integration monitoring dashboard should expose simulated failures and retries",
  );
}

for (const requiredKey of [
  "csv_imports",
  "workforce_migration",
  "checklist_migration",
  "marketman_migration",
  "toast_pos",
  "quickbooks_accounting",
  "xero_accounting",
  "gusto_payroll",
  "public_api",
  "webhooks",
]) {
  if (!dashboard.rows.some((row) => row.key === requiredKey)) {
    throw new Error(`Integration dashboard missing ${requiredKey}`);
  }
}

if (
  !dashboard.rows.every(
    (row) =>
      "lastSuccessfulSyncAt" in row &&
      "consecutiveFailures" in row &&
      "nextRetryAt" in row &&
      Array.isArray(row.warnings),
  )
) {
  throw new Error(
    "Integration dashboard rows must expose last success, failures, retries, and warnings",
  );
}

const alertRules = monitoring.getIntegrationAlertRules();

if (
  !alertRules.some(
    (rule) =>
      rule.id === "critical_sync_three_failures" &&
      rule.severity === "critical" &&
      rule.appliesTo.includes("toast_pos") &&
      rule.notify.includes("support"),
  )
) {
  throw new Error(
    "Critical sync alert rule should notify support for broken critical syncs",
  );
}

const diagnostics = monitoring.buildIntegrationSupportDiagnostics();

if (
  diagnostics.length < 4 ||
  !diagnostics.every((diagnostic) => diagnostic.safeForSupport) ||
  !diagnostics.some((diagnostic) => diagnostic.integrationKey === "toast_pos")
) {
  throw new Error(
    "Support diagnostics should be safe and include failing Toast POS",
  );
}

const snapshot = monitoring.buildIntegrationMonitoringSnapshot();

if (
  snapshot.rows.length !== dashboard.totalIntegrations ||
  snapshot.alerts.length !== alertRules.length ||
  snapshot.diagnostics.length !== diagnostics.length
) {
  throw new Error(
    "Monitoring snapshot should include dashboard, alerts, and diagnostics",
  );
}

const readiness = monitoring.buildIntegrationMonitoringReadiness();

if (
  !readiness.syncStatusDashboardReady ||
  !readiness.lastSuccessFailuresRetriesWarningsReady ||
  !readiness.criticalAlertingReady ||
  !readiness.supportDiagnosticsReady ||
  !readiness.simulatedFailuresVisible ||
  readiness.readyForLiveMonitoringWorkers
) {
  throw new Error(
    "Integration monitoring readiness flags should match phase scope",
  );
}

console.log("OK integration monitoring contract");
