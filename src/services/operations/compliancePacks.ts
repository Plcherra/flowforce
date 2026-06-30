export type CompliancePackKey =
  | "food_safety"
  | "labor_compliance"
  | "training"
  | "cleaning"
  | "equipment";

export type CompliancePackDashboardRow = {
  company_id: string;
  packid: string;
  pack_key: CompliancePackKey;
  pack_name: string;
  category: string;
  description: string | null;
  retention_days: number;
  status: string;
  total_runs: number;
  completed_runs: number;
  pending_review_runs: number;
  overdue_runs: number;
  evidence_count: number;
  expiring_evidence_count: number;
  open_exceptions: number;
  last_completed_at: string | null;
  compliance_score: number;
};

export type CompliancePackRpcResult = {
  packid?: string;
  pack_key?: CompliancePackKey;
  workflowid?: string;
  exportid?: string;
  status?: string;
};

export const compliancePackCatalog: Array<{
  key: CompliancePackKey;
  label: string;
  category: string;
  retentionDays: number;
}> = [
  {
    key: "food_safety",
    label: "Food Safety",
    category: "food_safety",
    retentionDays: 2555,
  },
  {
    key: "labor_compliance",
    label: "Labor Compliance",
    category: "labor",
    retentionDays: 1095,
  },
  {
    key: "training",
    label: "Training",
    category: "training",
    retentionDays: 1095,
  },
  {
    key: "cleaning",
    label: "Cleaning",
    category: "cleaning",
    retentionDays: 730,
  },
  {
    key: "equipment",
    label: "Equipment",
    category: "equipment",
    retentionDays: 1825,
  },
];

export const summarizeCompliancePacks = (
  packs: CompliancePackDashboardRow[],
) => ({
  installed: packs.length,
  averageScore:
    packs.length > 0
      ? Math.round(
          packs.reduce((total, pack) => total + pack.compliance_score, 0) /
            packs.length,
        )
      : 0,
  overdueRuns: packs.reduce((total, pack) => total + pack.overdue_runs, 0),
  openExceptions: packs.reduce(
    (total, pack) => total + pack.open_exceptions,
    0,
  ),
});

export const sortCompliancePacks = (packs: CompliancePackDashboardRow[]) =>
  [...packs].sort((left, right) => {
    if (left.compliance_score !== right.compliance_score) {
      return left.compliance_score - right.compliance_score;
    }

    return left.pack_name.localeCompare(right.pack_name);
  });

export const isCompliancePackInstalled = (
  installedPacks: CompliancePackDashboardRow[],
  packKey: CompliancePackKey,
) => installedPacks.some((pack) => pack.pack_key === packKey);
