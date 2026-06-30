export type AccountingProviderKey = "quickbooks" | "xero";
export type PayrollProviderKey = "gusto" | "adp" | "paychex";

export type AccountingExportObjectKey =
  | "purchase_bills"
  | "expenses"
  | "payments"
  | "vendor_credits"
  | "owner_summaries"
  | "journal_entries";

export type PayrollImportObjectKey =
  | "employees"
  | "labor_actuals"
  | "pay_periods"
  | "wage_rates"
  | "payroll_journal_summary";

export type IntegrationRunStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "retry_scheduled"
  | "needs_reconciliation";

export type AccountingExportScope = {
  key: AccountingExportObjectKey;
  label: string;
  providers: AccountingProviderKey[];
  sourceTables: string[];
  destinationObject: string;
  requiredFields: string[];
  reconciliationKey: string;
};

export type PayrollImportScope = {
  key: PayrollImportObjectKey;
  label: string;
  providers: PayrollProviderKey[];
  destinationTables: string[];
  requiredFields: string[];
  reconciliationKey: string;
};

export type IntegrationRetryPolicy = {
  id: string;
  appliesTo: "accounting_export" | "payroll_import";
  maxAttempts: number;
  backoffMinutes: number[];
  terminalStatuses: IntegrationRunStatus[];
};

export type IntegrationExportLog = {
  id: string;
  companyId: string;
  provider: AccountingProviderKey | PayrollProviderKey;
  direction: "flowforce_to_provider" | "provider_to_flowforce";
  objectKey: AccountingExportObjectKey | PayrollImportObjectKey;
  status: IntegrationRunStatus;
  attemptCount: number;
  payloadHash: string;
  idempotencyKey: string;
  reconciliationId: string;
  nextRetryAt: string | null;
  errorCategory: string | null;
};

export type ReconciliationViewDefinition = {
  key: string;
  label: string;
  compares: string[];
  owner: "bookkeeper" | "operator" | "payroll_admin";
  blockingStates: IntegrationRunStatus[];
};

export const accountingProviders: AccountingProviderKey[] = [
  "quickbooks",
  "xero",
] as const;

export const payrollProviders: PayrollProviderKey[] = [
  "gusto",
  "adp",
  "paychex",
] as const;

export const accountingExportScopes: AccountingExportScope[] = [
  {
    key: "purchase_bills",
    label: "Purchase bills",
    providers: ["quickbooks", "xero"],
    sourceTables: ["purchase_orders", "purchase_order_items", "inv_purchases"],
    destinationObject: "Bill",
    requiredFields: [
      "vendor_externalid",
      "bill_date",
      "due_date",
      "line_item_account",
      "amount",
      "tax_code",
    ],
    reconciliationKey: "provider_billid",
  },
  {
    key: "expenses",
    label: "Expenses",
    providers: ["quickbooks", "xero"],
    sourceTables: ["expenses"],
    destinationObject: "Expense",
    requiredFields: [
      "expense_date",
      "merchant_name",
      "category_account",
      "amount",
      "payment_account",
    ],
    reconciliationKey: "provider_expenseid",
  },
  {
    key: "payments",
    label: "Payments",
    providers: ["quickbooks", "xero"],
    sourceTables: ["payments", "payment_approvals"],
    destinationObject: "Payment",
    requiredFields: [
      "payment_date",
      "vendor_externalid",
      "payment_account",
      "amount",
      "approval_status",
    ],
    reconciliationKey: "provider_paymentid",
  },
  {
    key: "vendor_credits",
    label: "Vendor credits",
    providers: ["quickbooks", "xero"],
    sourceTables: ["inv_adjustments", "purchase_order_items"],
    destinationObject: "VendorCredit",
    requiredFields: [
      "vendor_externalid",
      "credit_date",
      "reason",
      "line_item_account",
      "amount",
    ],
    reconciliationKey: "provider_creditid",
  },
  {
    key: "owner_summaries",
    label: "Owner summaries",
    providers: ["quickbooks", "xero"],
    sourceTables: ["sales_ledger", "labor_entries", "invwaste", "expenses"],
    destinationObject: "ReportAttachment",
    requiredFields: [
      "period_start",
      "period_end",
      "net_sales",
      "labor_cost",
      "waste_cost",
      "controllable_expenses",
    ],
    reconciliationKey: "period_summaryid",
  },
  {
    key: "journal_entries",
    label: "Journal entries",
    providers: ["quickbooks", "xero"],
    sourceTables: ["sales_ledger", "labor_entries", "inv_adjustments"],
    destinationObject: "JournalEntry",
    requiredFields: [
      "posting_date",
      "debit_account",
      "credit_account",
      "amount",
      "memo",
    ],
    reconciliationKey: "provider_journal_entryid",
  },
] as const;

export const payrollLaborImportScopes: PayrollImportScope[] = [
  {
    key: "employees",
    label: "Employees",
    providers: ["gusto", "adp", "paychex"],
    destinationTables: ["employees", "company_members"],
    requiredFields: [
      "provider_employee_id",
      "full_name",
      "email",
      "employment_status",
      "home_location",
    ],
    reconciliationKey: "provider_employee_id",
  },
  {
    key: "labor_actuals",
    label: "Labor actuals",
    providers: ["gusto", "adp", "paychex"],
    destinationTables: ["labor_entries"],
    requiredFields: [
      "provider_employee_id",
      "work_date",
      "clocked_hours",
      "role",
      "regular_pay",
      "overtime_pay",
    ],
    reconciliationKey: "provider_time_entryid",
  },
  {
    key: "pay_periods",
    label: "Pay periods",
    providers: ["gusto", "adp", "paychex"],
    destinationTables: ["labor_entries", "company_settings"],
    requiredFields: ["period_start", "period_end", "pay_date", "status"],
    reconciliationKey: "provider_pay_periodid",
  },
  {
    key: "wage_rates",
    label: "Wage rates",
    providers: ["gusto", "adp", "paychex"],
    destinationTables: ["labor_entries", "employees"],
    requiredFields: [
      "provider_employee_id",
      "effective_date",
      "role",
      "hourly_rate",
    ],
    reconciliationKey: "provider_wage_rateid",
  },
  {
    key: "payroll_journal_summary",
    label: "Payroll journal summary",
    providers: ["gusto", "adp", "paychex"],
    destinationTables: ["labor_entries", "payments"],
    requiredFields: [
      "period_start",
      "period_end",
      "gross_wages",
      "employer_taxes",
      "benefits",
      "total_payroll_cost",
    ],
    reconciliationKey: "provider_payroll_journalid",
  },
] as const;

export const integrationRetryPolicies: IntegrationRetryPolicy[] = [
  {
    id: "accounting_exports_are_replayable",
    appliesTo: "accounting_export",
    maxAttempts: 4,
    backoffMinutes: [5, 30, 120, 720],
    terminalStatuses: ["succeeded", "needs_reconciliation"],
  },
  {
    id: "payroll_imports_are_checkpointed",
    appliesTo: "payroll_import",
    maxAttempts: 4,
    backoffMinutes: [5, 30, 120, 720],
    terminalStatuses: ["succeeded", "needs_reconciliation"],
  },
] as const;

export const reconciliationViews: ReconciliationViewDefinition[] = [
  {
    key: "accounting_export_reconciliation",
    label: "Accounting export reconciliation",
    compares: [
      "FlowForce export log total",
      "provider accepted object count",
      "provider object ids",
      "payload hash",
    ],
    owner: "bookkeeper",
    blockingStates: ["failed", "needs_reconciliation"],
  },
  {
    key: "payroll_labor_reconciliation",
    label: "Payroll labor reconciliation",
    compares: [
      "scheduled hours",
      "imported clocked hours",
      "gross payroll cost",
      "employee/provider mapping gaps",
    ],
    owner: "payroll_admin",
    blockingStates: ["failed", "needs_reconciliation"],
  },
  {
    key: "cost_of_goods_reconciliation",
    label: "Cost of goods reconciliation",
    compares: [
      "purchase bills exported",
      "inventory receipt totals",
      "vendor credits",
      "cost engine valuation",
    ],
    owner: "operator",
    blockingStates: ["failed", "needs_reconciliation"],
  },
] as const;

export const sampleAccountingExportLog: IntegrationExportLog = {
  id: "acct-export-sample",
  companyId: "sample-company",
  provider: "quickbooks",
  direction: "flowforce_to_provider",
  objectKey: "purchase_bills",
  status: "retry_scheduled",
  attemptCount: 2,
  payloadHash: "sha256:sample-purchase-bill-payload",
  idempotencyKey: "sample-company:quickbooks:purchase_bills:2026-05",
  reconciliationId: "recon-purchase-bills-2026-05",
  nextRetryAt: "2026-05-30T14:30:00.000Z",
  errorCategory: "provider_rate_limited",
};

export function getAccountingExportScopes() {
  return accountingExportScopes;
}

export function getPayrollLaborImportScopes() {
  return payrollLaborImportScopes;
}

export function getAccountingPayrollReconciliationViews() {
  return reconciliationViews;
}

export function buildAccountingExportPayload(params: {
  provider: AccountingProviderKey;
  companyId: string;
  periodStart: string;
  periodEnd: string;
}) {
  return {
    provider: params.provider,
    companyId: params.companyId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    schemaVersion: "accounting-export-v1",
    exports: accountingExportScopes.map((scope) => ({
      key: scope.key,
      destinationObject: scope.destinationObject,
      requiredFields: scope.requiredFields,
      reconciliationKey: scope.reconciliationKey,
      idempotencyKey: [
        params.companyId,
        params.provider,
        scope.key,
        params.periodStart,
        params.periodEnd,
      ].join(":"),
    })),
  };
}

export function buildPayrollLaborImportManifest(params: {
  provider: PayrollProviderKey;
  companyId: string;
  checkpoint: string;
}) {
  return {
    provider: params.provider,
    companyId: params.companyId,
    checkpoint: params.checkpoint,
    schemaVersion: "payroll-labor-import-v1",
    imports: payrollLaborImportScopes.map((scope) => ({
      key: scope.key,
      destinationTables: scope.destinationTables,
      requiredFields: scope.requiredFields,
      reconciliationKey: scope.reconciliationKey,
    })),
  };
}

export function buildIntegrationExportLog(params: {
  companyId: string;
  provider: AccountingProviderKey | PayrollProviderKey;
  direction: IntegrationExportLog["direction"];
  objectKey: AccountingExportObjectKey | PayrollImportObjectKey;
  attemptCount: number;
  status: IntegrationRunStatus;
  payloadHash: string;
  reconciliationId: string;
  errorCategory?: string | null;
}): IntegrationExportLog {
  return {
    id: [
      params.companyId,
      params.provider,
      params.objectKey,
      params.attemptCount,
    ].join(":"),
    companyId: params.companyId,
    provider: params.provider,
    direction: params.direction,
    objectKey: params.objectKey,
    status: params.status,
    attemptCount: params.attemptCount,
    payloadHash: params.payloadHash,
    idempotencyKey: [
      params.companyId,
      params.provider,
      params.objectKey,
      params.payloadHash,
    ].join(":"),
    reconciliationId: params.reconciliationId,
    nextRetryAt: calculateNextRetryAt(params.status, params.attemptCount),
    errorCategory: params.errorCategory ?? null,
  };
}

export function calculateNextRetryAt(
  status: IntegrationRunStatus,
  attemptCount: number,
  now = new Date("2026-05-30T12:00:00.000Z"),
) {
  if (status !== "failed" && status !== "retry_scheduled") {
    return null;
  }

  const delayMinutes =
    integrationRetryPolicies[0].backoffMinutes[
      Math.min(Math.max(attemptCount - 1, 0), 3)
    ];
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString();
}

export function buildAccountingPayrollReadiness() {
  return {
    quickBooksAndXeroExportScopesReady: accountingExportScopes.every(
      (scope) =>
        scope.providers.includes("quickbooks") &&
        scope.providers.includes("xero") &&
        scope.requiredFields.length >= 4,
    ),
    payrollLaborImportScopesReady: payrollLaborImportScopes.every(
      (scope) =>
        scope.providers.includes("gusto") &&
        scope.providers.includes("adp") &&
        scope.providers.includes("paychex") &&
        scope.requiredFields.length >= 4,
    ),
    exportLogsAndRetriesReady:
      integrationRetryPolicies.length === 2 &&
      sampleAccountingExportLog.payloadHash.startsWith("sha256:") &&
      sampleAccountingExportLog.idempotencyKey.length > 0,
    reconciliationViewsReady: reconciliationViews.length === 3,
    readyForLiveProviderSync: false,
  };
}

export function isAccountingPayrollIntegrationReady() {
  const readiness = buildAccountingPayrollReadiness();
  const accountingPayload = buildAccountingExportPayload({
    provider: "quickbooks",
    companyId: "sample-company",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
  });
  const payrollManifest = buildPayrollLaborImportManifest({
    provider: "gusto",
    companyId: "sample-company",
    checkpoint: "2026-05-30T00:00:00.000Z",
  });

  return (
    readiness.quickBooksAndXeroExportScopesReady &&
    readiness.payrollLaborImportScopesReady &&
    readiness.exportLogsAndRetriesReady &&
    readiness.reconciliationViewsReady &&
    !readiness.readyForLiveProviderSync &&
    accountingPayload.exports.length === 6 &&
    payrollManifest.imports.length === 5
  );
}
