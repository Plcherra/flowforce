export const DATA_LIFECYCLE_STATUSES = [
  "active",
  "archive_pending",
  "archived",
  "delete_pending",
  "deleted",
  "legal_hold",
] as const;

export type DataLifecycleStatus = (typeof DATA_LIFECYCLE_STATUSES)[number];

export const DATA_EXPORT_STATUSES = [
  "requested",
  "processing",
  "ready",
  "failed",
  "expired",
] as const;

export type DataExportStatus = (typeof DATA_EXPORT_STATUSES)[number];

export const LEGAL_HOLD_STATUSES = ["active", "released"] as const;
export type LegalHoldStatus = (typeof LEGAL_HOLD_STATUSES)[number];

export type LifecycleRetentionClass =
  | "tenant_configuration"
  | "employee_profile"
  | "operational_record"
  | "financial_record"
  | "audit_record"
  | "generated_report"
  | "system_cache";

export type LifecycleDisposition =
  | "soft_delete"
  | "archive_then_delete"
  | "retain"
  | "purge_cache";

export type LifecyclePolicyRule = {
  table: string;
  retentionClass: LifecycleRetentionClass;
  defaultRetentionDays: number;
  disposition: LifecycleDisposition;
  exportable: boolean;
  legalHoldEligible: boolean;
  restoreWindowDays: number;
  notes: string;
};

export const DATA_LIFECYCLE_POLICY: LifecyclePolicyRule[] = [
  {
    table: "companies",
    retentionClass: "tenant_configuration",
    defaultRetentionDays: 2555,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes:
      "Tenant root record; delete only after export and owner confirmation.",
  },
  {
    table: "profiles",
    retentionClass: "employee_profile",
    defaultRetentionDays: 1095,
    disposition: "soft_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Employee identity data must support offboarding restore.",
  },
  {
    table: "company_members",
    retentionClass: "employee_profile",
    defaultRetentionDays: 1095,
    disposition: "soft_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Membership history is retained for access and audit context.",
  },
  {
    table: "tasks",
    retentionClass: "operational_record",
    defaultRetentionDays: 730,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Operational task history can be archived after active use.",
  },
  {
    table: "messages",
    retentionClass: "operational_record",
    defaultRetentionDays: 730,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 14,
    notes: "Team communications are exportable and legal-hold eligible.",
  },
  {
    table: "forms",
    retentionClass: "operational_record",
    defaultRetentionDays: 1095,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Form definitions are kept longer than routine task records.",
  },
  {
    table: "form_submissions",
    retentionClass: "operational_record",
    defaultRetentionDays: 1095,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Compliance submissions require longer default retention.",
  },
  {
    table: "documents",
    retentionClass: "generated_report",
    defaultRetentionDays: 1095,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Documents and attached files should share lifecycle decisions.",
  },
  {
    table: "expenses",
    retentionClass: "financial_record",
    defaultRetentionDays: 2555,
    disposition: "retain",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Financial records default to seven-year retention.",
  },
  {
    table: "payments",
    retentionClass: "financial_record",
    defaultRetentionDays: 2555,
    disposition: "retain",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Payment records default to seven-year retention.",
  },
  {
    table: "inventory_items",
    retentionClass: "operational_record",
    defaultRetentionDays: 1095,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Legacy inventory rows stay exportable during domain transition.",
  },
  {
    table: "inv_items",
    retentionClass: "operational_record",
    defaultRetentionDays: 1095,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Current inventory item rows are lifecycle managed.",
  },
  {
    table: "schedules",
    retentionClass: "operational_record",
    defaultRetentionDays: 1095,
    disposition: "archive_then_delete",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 30,
    notes: "Published schedules are employment context and exportable.",
  },
  {
    table: "audit_log",
    retentionClass: "audit_record",
    defaultRetentionDays: 2555,
    disposition: "retain",
    exportable: true,
    legalHoldEligible: true,
    restoreWindowDays: 0,
    notes: "Audit rows are retained and not user-restored.",
  },
  {
    table: "daily_insights",
    retentionClass: "system_cache",
    defaultRetentionDays: 365,
    disposition: "purge_cache",
    exportable: false,
    legalHoldEligible: false,
    restoreWindowDays: 0,
    notes: "Generated cache can be recreated from source records.",
  },
];

export function getLifecyclePolicyForTable(table: string) {
  return DATA_LIFECYCLE_POLICY.find((rule) => rule.table === table) ?? null;
}

export function isLifecycleStatus(value: string): value is DataLifecycleStatus {
  return DATA_LIFECYCLE_STATUSES.includes(value as DataLifecycleStatus);
}
