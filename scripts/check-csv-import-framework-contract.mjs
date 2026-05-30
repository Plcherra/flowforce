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

const service = readText("src/services/integrations/csvImportFramework.ts");
const doc = readText("docs/csv-import-framework.md");
const migration = readText(
  "supabase/migrations/20260530000200_phase9_csv_import_framework.sql",
);
const auditEvents = readText("src/services/audit/auditEvents.ts");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-02-csv-import-framework-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "csvImportTemplates",
    "employees",
    "inventory_items",
    "suppliers",
    "schedules",
    "tasks",
    "parseCsvText",
    "inferCsvMapping",
    "buildCsvImportPreview",
    "buildCsvImportResult",
    "buildCsvRollbackPlan",
    "getCsvTemplateDownloadRows",
    "isCsvImportFrameworkReady",
    "integration.csv_import.started",
    "integration.csv_import.rolled_back",
  ],
  "CSV import framework service",
);

requireIncludes(
  doc,
  [
    "Upload CSV.",
    "Infer mapping from known aliases.",
    "Preview mapped rows.",
    "integration_import_batches",
    "integration_import_rows",
    "integration.csv_import.validated",
    "current_user_company_ids()",
    "npm run check:csv-import-framework",
  ],
  "CSV import framework doc",
);

requireIncludes(
  migration,
  [
    "integration_import_batches",
    "integration_import_rows",
    "integration_import_batch_summary_v",
    "record_integration_import_audit",
    "mark_integration_import_batch_status",
    "integration_import_readiness",
    "integration.csv_import.completed",
    "integration.csv_import.rolled_back",
    "current_user_company_ids()",
  ],
  "CSV import framework migration",
);

requireIncludes(
  auditEvents,
  [
    "integrationCsvImportStarted",
    "integrationCsvImportValidated",
    "integrationCsvImportCompleted",
    "integrationCsvImportFailed",
    "integrationCsvImportRolledBack",
    "integration.csv_import.started",
    "integration.csv_import.failed",
  ],
  "audit events",
);

requireIncludes(
  plan,
  [
    "- [x] Build generic CSV upload, mapping, preview, validation, and import result flow.",
    "- [x] Add rollback/error reporting.",
    "- [x] Add import audit logs.",
    "- [x] Add templates for employees, inventory items, suppliers, schedules, and tasks.",
    "09.02 CSV Import Framework",
    "csv-import-framework.md",
  ],
  "Plan 09 roadmap",
);

const phaseTwoBlock = plan.match(
  /### Phase 2: CSV Import Framework[\s\S]*?(?=### Phase 3: Workforce Platform Migration Path)/,
)?.[0];

if (!phaseTwoBlock || phaseTwoBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 2 still has unchecked tasks");
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
    "typed CSV import framework",
    "tenant-scoped import batch and row ledgers",
    "valid and invalid CSV files",
    "Phase 09.03",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:csv-import-framework",
    "scripts/check-csv-import-framework-contract.mjs",
  ],
  "package scripts",
);

const csvFramework = await jiti.import(
  join(root, "src/services/integrations/csvImportFramework.ts"),
);

if (!csvFramework.isCsvImportFrameworkReady()) {
  throw new Error("CSV import framework readiness check failed");
}

const validEmployeeCsv = [
  "First name,Last name,Email,Role,Department,Phone",
  "Maria,Santos,maria@example.com,team_member,Kitchen,+1 555 0100",
].join("\n");

const validPreview = csvFramework.buildCsvImportPreview({
  templateKey: "employees",
  filename: "employees.csv",
  csvText: validEmployeeCsv,
});

if (!validPreview.canImport || validPreview.summary.validRows !== 1) {
  throw new Error("Valid employee CSV should be importable");
}

const invalidScheduleCsv = [
  "Employee email,Shift date,Start time,End time",
  "not-an-email,06/01/2026,9am,17:00",
].join("\n");

const invalidPreview = csvFramework.buildCsvImportPreview({
  templateKey: "schedules",
  filename: "schedules.csv",
  csvText: invalidScheduleCsv,
});

if (invalidPreview.canImport || invalidPreview.summary.invalidRows !== 1) {
  throw new Error("Invalid schedule CSV should produce blocking errors");
}

const result = csvFramework.buildCsvImportResult({
  batchId: "batch-1",
  preview: validPreview,
  importedRecordIds: ["employee-1"],
});

if (!result.rollbackAvailable || result.status !== "completed") {
  throw new Error(
    "Successful import result should expose rollback availability",
  );
}

const rollback = csvFramework.buildCsvRollbackPlan({
  batchId: "batch-1",
  templateKey: "employees",
  targetRecordIds: ["employee-1"],
});

if (!rollback.canRollback || rollback.targetTable !== "employees") {
  throw new Error("Rollback plan should target imported employee records");
}

process.stdout.write("OK CSV import framework contract\n");
