export type IntegrationMonitorKey =
  | "csv_imports"
  | "workforce_migration"
  | "checklist_migration"
  | "marketman_migration"
  | "toast_pos"
  | "quickbooks_accounting"
  | "xero_accounting"
  | "gusto_payroll"
  | "public_api"
  | "webhooks";

export type IntegrationMonitorStatus =
  | "not_configured"
  | "healthy"
  | "warning"
  | "failing"
  | "paused";

export type IntegrationMonitorSeverity = "info" | "warning" | "critical";

export type IntegrationStatusDashboardRow = {
  key: IntegrationMonitorKey;
  label: string;
  status: IntegrationMonitorStatus;
  critical: boolean;
  lastSuccessfulSyncAt: string | null;
  consecutiveFailures: number;
  nextRetryAt: string | null;
  warnings: string[];
  owner: "operator" | "bookkeeper" | "payroll_admin" | "support";
};

export type IntegrationAlertRule = {
  id: string;
  severity: IntegrationMonitorSeverity;
  appliesTo: IntegrationMonitorKey[];
  trigger: string;
  notify: string[];
  supportAction: string;
};

export type IntegrationSupportDiagnostic = {
  id: string;
  integrationKey: IntegrationMonitorKey;
  status: IntegrationMonitorStatus;
  evidence: string[];
  recommendedAction: string;
  safeForSupport: boolean;
};

export type IntegrationMonitoringSnapshot = {
  generatedAt: string;
  rows: IntegrationStatusDashboardRow[];
  alerts: IntegrationAlertRule[];
  diagnostics: IntegrationSupportDiagnostic[];
};

export const integrationStatusDashboardRows: IntegrationStatusDashboardRow[] = [
  {
    key: "csv_imports",
    label: "CSV imports",
    status: "healthy",
    critical: false,
    lastSuccessfulSyncAt: "2026-05-30T11:00:00.000Z",
    consecutiveFailures: 0,
    nextRetryAt: null,
    warnings: [],
    owner: "operator",
  },
  {
    key: "workforce_migration",
    label: "Workforce migration",
    status: "healthy",
    critical: false,
    lastSuccessfulSyncAt: "2026-05-30T10:30:00.000Z",
    consecutiveFailures: 0,
    nextRetryAt: null,
    warnings: [],
    owner: "operator",
  },
  {
    key: "checklist_migration",
    label: "Checklist migration",
    status: "healthy",
    critical: false,
    lastSuccessfulSyncAt: "2026-05-30T10:15:00.000Z",
    consecutiveFailures: 0,
    nextRetryAt: null,
    warnings: [],
    owner: "operator",
  },
  {
    key: "marketman_migration",
    label: "MarketMan migration",
    status: "warning",
    critical: false,
    lastSuccessfulSyncAt: "2026-05-30T09:00:00.000Z",
    consecutiveFailures: 1,
    nextRetryAt: "2026-05-30T12:30:00.000Z",
    warnings: ["Unit conversion review needed for imported catch-weight item."],
    owner: "operator",
  },
  {
    key: "toast_pos",
    label: "Toast POS",
    status: "failing",
    critical: true,
    lastSuccessfulSyncAt: "2026-05-29T23:00:00.000Z",
    consecutiveFailures: 4,
    nextRetryAt: "2026-05-30T13:00:00.000Z",
    warnings: ["Sales sync is more than 12 hours stale."],
    owner: "support",
  },
  {
    key: "quickbooks_accounting",
    label: "QuickBooks accounting",
    status: "warning",
    critical: true,
    lastSuccessfulSyncAt: "2026-05-30T08:00:00.000Z",
    consecutiveFailures: 2,
    nextRetryAt: "2026-05-30T14:00:00.000Z",
    warnings: ["Purchase bill export waiting for provider rate-limit retry."],
    owner: "bookkeeper",
  },
  {
    key: "xero_accounting",
    label: "Xero accounting",
    status: "not_configured",
    critical: false,
    lastSuccessfulSyncAt: null,
    consecutiveFailures: 0,
    nextRetryAt: null,
    warnings: ["Provider not connected."],
    owner: "bookkeeper",
  },
  {
    key: "gusto_payroll",
    label: "Gusto payroll",
    status: "healthy",
    critical: true,
    lastSuccessfulSyncAt: "2026-05-30T07:30:00.000Z",
    consecutiveFailures: 0,
    nextRetryAt: null,
    warnings: [],
    owner: "payroll_admin",
  },
  {
    key: "public_api",
    label: "Public API",
    status: "healthy",
    critical: false,
    lastSuccessfulSyncAt: "2026-05-30T11:45:00.000Z",
    consecutiveFailures: 0,
    nextRetryAt: null,
    warnings: [],
    owner: "support",
  },
  {
    key: "webhooks",
    label: "Webhooks",
    status: "warning",
    critical: false,
    lastSuccessfulSyncAt: "2026-05-30T11:20:00.000Z",
    consecutiveFailures: 2,
    nextRetryAt: "2026-05-30T12:20:00.000Z",
    warnings: ["One endpoint returned HTTP 503 during delivery retry."],
    owner: "support",
  },
] as const;

export const integrationAlertRules: IntegrationAlertRule[] = [
  {
    id: "critical_sync_three_failures",
    severity: "critical",
    appliesTo: ["toast_pos", "quickbooks_accounting", "gusto_payroll"],
    trigger:
      "Critical integration has three or more consecutive failures or stale data older than 12 hours.",
    notify: ["tenant_admin", "support"],
    supportAction:
      "Open provider health, credential, retry, and last payload hash diagnostics.",
  },
  {
    id: "webhook_delivery_warning",
    severity: "warning",
    appliesTo: ["webhooks"],
    trigger:
      "Webhook delivery has two or more failures before terminal failure.",
    notify: ["tenant_admin"],
    supportAction:
      "Show endpoint status, response codes, and next retry timestamp.",
  },
  {
    id: "migration_warning",
    severity: "warning",
    appliesTo: ["marketman_migration", "csv_imports", "workforce_migration"],
    trigger:
      "Migration/import warnings require operator review before final signoff.",
    notify: ["operator"],
    supportAction: "Show validation warnings and rollback/report references.",
  },
] as const;

export function buildIntegrationStatusDashboard() {
  const rows = integrationStatusDashboardRows;
  const failing = rows.filter((row) => row.status === "failing");
  const warnings = rows.filter((row) => row.warnings.length > 0);
  const retrying = rows.filter((row) => row.nextRetryAt);
  const staleCritical = rows.filter(
    (row) => row.critical && row.consecutiveFailures >= 3,
  );

  return {
    totalIntegrations: rows.length,
    healthyCount: rows.filter((row) => row.status === "healthy").length,
    warningCount: warnings.length,
    failingCount: failing.length,
    retryingCount: retrying.length,
    staleCriticalCount: staleCritical.length,
    rows,
  };
}

export function getIntegrationAlertRules() {
  return integrationAlertRules;
}

export function buildIntegrationSupportDiagnostics(
  rows: readonly IntegrationStatusDashboardRow[] = integrationStatusDashboardRows,
): IntegrationSupportDiagnostic[] {
  return rows
    .filter(
      (row) =>
        row.status === "failing" ||
        row.status === "warning" ||
        row.warnings.length > 0,
    )
    .map((row) => ({
      id: `diagnostic:${row.key}`,
      integrationKey: row.key,
      status: row.status,
      evidence: [
        `last_success=${row.lastSuccessfulSyncAt ?? "none"}`,
        `consecutive_failures=${row.consecutiveFailures}`,
        `next_retry=${row.nextRetryAt ?? "none"}`,
        `warnings=${row.warnings.length}`,
      ],
      recommendedAction: resolveRecommendedAction(row),
      safeForSupport: true,
    }));
}

export function buildIntegrationMonitoringSnapshot(
  generatedAt = "2026-05-30T12:00:00.000Z",
): IntegrationMonitoringSnapshot {
  return {
    generatedAt,
    rows: integrationStatusDashboardRows,
    alerts: integrationAlertRules,
    diagnostics: buildIntegrationSupportDiagnostics(),
  };
}

export function buildIntegrationMonitoringReadiness() {
  const dashboard = buildIntegrationStatusDashboard();
  const diagnostics = buildIntegrationSupportDiagnostics();

  return {
    syncStatusDashboardReady: dashboard.totalIntegrations >= 10,
    lastSuccessFailuresRetriesWarningsReady: dashboard.rows.every(
      (row) =>
        "lastSuccessfulSyncAt" in row &&
        "consecutiveFailures" in row &&
        "nextRetryAt" in row &&
        Array.isArray(row.warnings),
    ),
    criticalAlertingReady: integrationAlertRules.some(
      (rule) =>
        rule.id === "critical_sync_three_failures" &&
        rule.severity === "critical" &&
        rule.appliesTo.includes("toast_pos"),
    ),
    supportDiagnosticsReady:
      diagnostics.length >= 4 &&
      diagnostics.every((diagnostic) => diagnostic.safeForSupport),
    simulatedFailuresVisible:
      dashboard.failingCount >= 1 &&
      dashboard.retryingCount >= 3 &&
      dashboard.staleCriticalCount >= 1,
    readyForLiveMonitoringWorkers: false,
  };
}

export function isIntegrationMonitoringReady() {
  const readiness = buildIntegrationMonitoringReadiness();
  const snapshot = buildIntegrationMonitoringSnapshot();

  return (
    readiness.syncStatusDashboardReady &&
    readiness.lastSuccessFailuresRetriesWarningsReady &&
    readiness.criticalAlertingReady &&
    readiness.supportDiagnosticsReady &&
    readiness.simulatedFailuresVisible &&
    !readiness.readyForLiveMonitoringWorkers &&
    snapshot.diagnostics.some(
      (diagnostic) => diagnostic.integrationKey === "toast_pos",
    )
  );
}

function resolveRecommendedAction(row: IntegrationStatusDashboardRow) {
  if (row.status === "failing" && row.critical) {
    return "Escalate to support, inspect credentials, provider health, retry queue, and last payload hash.";
  }

  if (row.nextRetryAt) {
    return "Wait for scheduled retry or manually retry after reviewing the warning.";
  }

  if (row.status === "not_configured") {
    return "Complete provider setup before enabling monitoring alerts.";
  }

  return "Review warnings and confirm owner signoff.";
}
