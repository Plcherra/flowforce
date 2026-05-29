import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

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

const doc = readText("docs/compliance-packs.md");
const roadmap = readText("docs/roadmap/06-operations-workflows-and-compliance.md");
const report = readText(
  "docs/roadmap/reports/06-07-compliance-packs-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260528001800_phase6_compliance_packs.sql",
);
const service = readText("src/services/operations/compliancePacks.ts");
const panel = readText(
  "src/features/operations/components/CompliancePacksPanel.tsx",
);
const hub = readText("src/features/operations/components/OperationsHub.tsx");
const dbTest = readText("supabase/tests/phase6_compliance_packs.test.sql");
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "workflow_compliance_packs",
    "workflow_compliance_audit_exports",
    "compliance_pack_definition",
    "install_compliance_pack",
    "set_workflow_evidence_compliance_retention",
    "operations_compliance_dashboard_v",
    "create_compliance_audit_export",
    "workflow.compliance_pack.installed",
    "workflow.compliance_audit_export.created",
  ],
  "Compliance packs migration",
);

requireIncludes(
  service,
  [
    "CompliancePackDashboardRow",
    "compliancePackCatalog",
    "summarizeCompliancePacks",
    "sortCompliancePacks",
    "isCompliancePackInstalled",
  ],
  "Compliance packs service",
);

requireIncludes(
  panel,
  [
    "CompliancePacksPanel",
    "operations_compliance_dashboard_v",
    "install_compliance_pack",
    "create_compliance_audit_export",
    "Compliance Packs",
  ],
  "Compliance packs panel",
);

requireIncludes(hub, ["CompliancePacksPanel"], "Operations Hub");

requireIncludes(
  doc,
  [
    "Compliance Packs",
    "food safety",
    "labor compliance",
    "training",
    "cleaning",
    "equipment",
    "operations_compliance_dashboard_v",
    "create_compliance_audit_export",
  ],
  "Compliance packs doc",
);

requireIncludes(
  roadmap,
  [
    "Create templates for food safety, labor compliance, training, cleaning, and equipment.",
    "Add evidence retention rules.",
    "Add compliance dashboard.",
    "Add exportable audit reports.",
    "06.07 Compliance Packs",
    "docs/compliance-packs.md",
  ],
  "Plan 06 roadmap",
);

const phaseSevenBlock = roadmap.match(
  /### Phase 7: Compliance Packs[\s\S]*?### Phase 8:/,
)?.[0];

if (!phaseSevenBlock || phaseSevenBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 7 still has unchecked tasks");
}

requireIncludes(
  dbTest,
  [
    "tenant manager can install a food safety compliance pack",
    "evidence inherits compliance pack from workflow",
    "evidence is promoted to compliance record retention",
    "compliance dashboard counts workflow runs",
    "manager can create a compliance audit export",
    "Tenant B cannot export Tenant A compliance data",
  ],
  "Compliance packs DB test",
);

requireIncludes(
  report,
  [
    "workflow_compliance_packs",
    "operations_compliance_dashboard_v",
    "CompliancePacksPanel",
    "Phase 06.08",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:compliance-packs",
    "scripts/check-compliance-packs-contract.mjs",
    "supabase/tests/phase6_compliance_packs.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK compliance packs contract\n");
