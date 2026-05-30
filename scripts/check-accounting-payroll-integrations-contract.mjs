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

const service = readText(
  "src/services/integrations/accountingPayrollIntegrations.ts",
);
const auditEvents = readText("src/services/audit/auditEvents.ts");
const ui = readText(
  "src/features/system/components/IntegrationSettingsPanel.tsx",
);
const doc = readText("docs/accounting-payroll-integrations.md");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-07-accounting-payroll-integrations-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "AccountingProviderKey",
    '"quickbooks"',
    '"xero"',
    '"gusto"',
    '"adp"',
    '"paychex"',
    "accountingExportScopes",
    "payrollLaborImportScopes",
    "integrationRetryPolicies",
    "reconciliationViews",
    "sampleAccountingExportLog",
    "buildAccountingExportPayload",
    "buildPayrollLaborImportManifest",
    "buildIntegrationExportLog",
    "calculateNextRetryAt",
    "buildAccountingPayrollReadiness",
    "isAccountingPayrollIntegrationReady",
  ],
  "accounting payroll integration service",
);

requireIncludes(
  auditEvents,
  [
    "integrationAccountingExportQueued",
    "integrationAccountingExportCompleted",
    "integrationAccountingExportFailed",
    "integrationPayrollImportValidated",
    "integrationReconciliationViewed",
    "integration.accounting_export.queued",
    "integration.accounting_export.completed",
    "integration.accounting_export.failed",
    "integration.payroll_import.validated",
    "integration.reconciliation.viewed",
  ],
  "audit event definitions",
);

requireIncludes(
  ui,
  [
    "Accounting and payroll readiness",
    "buildAccountingPayrollReadiness",
    "getAccountingExportScopes",
    "getPayrollLaborImportScopes",
    "getAccountingPayrollReconciliationViews",
    "QuickBooks/Xero bills",
    "Payroll imports",
    "Logs and retries",
    "Reconciliation",
  ],
  "integration settings UI",
);

requireIncludes(
  doc,
  [
    "QuickBooks Online and Xero",
    "Purchase bills: vendor",
    "The first payroll/labor providers are Gusto, ADP, and Paychex.",
    "Payload hash",
    "Idempotency key",
    "Accounting export reconciliation",
    "Payroll labor reconciliation",
    "Cost of goods reconciliation",
    "integration.accounting_export.queued",
    "npm run check:accounting-payroll-integrations",
  ],
  "accounting payroll integration doc",
);

requireIncludes(
  plan,
  [
    "- [x] Define QuickBooks/Xero export scope.",
    "- [x] Define payroll/labor import scope.",
    "- [x] Add export logs and retry behavior.",
    "- [x] Add reconciliation views.",
    "09.07 Accounting And Payroll Integrations",
    "accounting-payroll-integrations.md",
  ],
  "Plan 09 roadmap",
);

const phaseSevenBlock = plan.match(
  /### Phase 7: Accounting And Payroll Integrations[\s\S]*?(?=### Phase 8: Webhooks And Public API)/,
)?.[0];

if (!phaseSevenBlock || phaseSevenBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 7 still has unchecked tasks");
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
    "QuickBooks Online and Xero",
    "purchase bills, expenses, payments, vendor credits, owner summaries, and journal entries",
    "employees, labor actuals, pay periods, wage rates, and payroll journal summaries",
    "Phase 09.08",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:accounting-payroll-integrations",
    "scripts/check-accounting-payroll-integrations-contract.mjs",
  ],
  "package scripts",
);

const accountingPayroll = await jiti.import(
  join(root, "src/services/integrations/accountingPayrollIntegrations.ts"),
);

if (!accountingPayroll.isAccountingPayrollIntegrationReady()) {
  throw new Error("Accounting payroll integration readiness check failed");
}

const accountingScopes = accountingPayroll.getAccountingExportScopes();
const payrollScopes = accountingPayroll.getPayrollLaborImportScopes();
const reconciliationViews =
  accountingPayroll.getAccountingPayrollReconciliationViews();

if (accountingScopes.length !== 6) {
  throw new Error("Accounting export scope should include six export objects");
}

if (
  !accountingScopes.every(
    (scope) =>
      scope.providers.includes("quickbooks") &&
      scope.providers.includes("xero") &&
      scope.reconciliationKey,
  )
) {
  throw new Error(
    "Accounting exports must support QuickBooks, Xero, and reconciliation keys",
  );
}

if (payrollScopes.length !== 5) {
  throw new Error(
    "Payroll labor import scope should include five import objects",
  );
}

if (
  !payrollScopes.every(
    (scope) =>
      scope.providers.includes("gusto") &&
      scope.providers.includes("adp") &&
      scope.providers.includes("paychex") &&
      scope.reconciliationKey,
  )
) {
  throw new Error(
    "Payroll imports must support Gusto, ADP, Paychex, and reconciliation keys",
  );
}

const accountingPayload = accountingPayroll.buildAccountingExportPayload({
  provider: "xero",
  companyId: "company-a",
  periodStart: "2026-05-01",
  periodEnd: "2026-05-31",
});

if (
  accountingPayload.schemaVersion !== "accounting-export-v1" ||
  accountingPayload.exports.length !== 6 ||
  !accountingPayload.exports.every((item) =>
    item.idempotencyKey.startsWith("company-a:xero:"),
  )
) {
  throw new Error(
    "Accounting export payload should be provider-scoped and idempotent",
  );
}

const payrollManifest = accountingPayroll.buildPayrollLaborImportManifest({
  provider: "gusto",
  companyId: "company-a",
  checkpoint: "2026-05-30T00:00:00.000Z",
});

if (
  payrollManifest.schemaVersion !== "payroll-labor-import-v1" ||
  payrollManifest.imports.length !== 5
) {
  throw new Error("Payroll import manifest should include all import scopes");
}

const exportLog = accountingPayroll.buildIntegrationExportLog({
  companyId: "company-a",
  provider: "quickbooks",
  direction: "flowforce_to_provider",
  objectKey: "purchase_bills",
  attemptCount: 2,
  status: "retry_scheduled",
  payloadHash: "sha256:test",
  reconciliationId: "recon-test",
  errorCategory: "provider_rate_limited",
});

if (
  !exportLog.idempotencyKey.includes("sha256:test") ||
  !exportLog.nextRetryAt ||
  exportLog.errorCategory !== "provider_rate_limited"
) {
  throw new Error(
    "Export logs should include idempotency, retry, and error state",
  );
}

if (
  reconciliationViews.length !== 3 ||
  !reconciliationViews.some(
    (view) => view.key === "accounting_export_reconciliation",
  ) ||
  !reconciliationViews.some(
    (view) => view.key === "payroll_labor_reconciliation",
  ) ||
  !reconciliationViews.some(
    (view) => view.key === "cost_of_goods_reconciliation",
  )
) {
  throw new Error("Accounting payroll reconciliation views are incomplete");
}

const readiness = accountingPayroll.buildAccountingPayrollReadiness();

if (
  !readiness.quickBooksAndXeroExportScopesReady ||
  !readiness.payrollLaborImportScopesReady ||
  !readiness.exportLogsAndRetriesReady ||
  !readiness.reconciliationViewsReady ||
  readiness.readyForLiveProviderSync
) {
  throw new Error(
    "Accounting payroll readiness flags should match phase scope",
  );
}

console.log("OK accounting payroll integrations contract");
