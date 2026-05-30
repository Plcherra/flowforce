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

const service = readText("src/services/integrations/workforceMigrationPath.ts");
const doc = readText("docs/workforce-platform-migration.md");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-03-workforce-platform-migration-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "workforceMigrationDataObjects",
    "employees",
    "roles",
    "schedules",
    "tasks",
    "messages",
    "archive_only",
    "workforceMigrationMappingGuide",
    "normalizeWorkforceRole",
    "extractWorkforceRoles",
    "buildWorkforceCsvAdapter",
    "buildWorkforceMigrationCompletionReport",
    "sampleWorkforceExport",
    "isWorkforceMigrationPathReady",
  ],
  "workforce migration service",
);

requireIncludes(
  doc,
  [
    "Employees: imported through the `employees` CSV template.",
    "Roles: derived from employee export rows",
    "Schedules: imported through the `schedules` CSV template.",
    "Tasks: imported through the `tasks` CSV template.",
    "Messages: retained as archive-only migration evidence",
    "Role Normalization",
    "npm run check:workforce-migration",
  ],
  "workforce migration doc",
);

requireIncludes(
  plan,
  [
    "- [x] Define imported data: employees, roles, schedules, tasks, messages where possible.",
    "- [x] Create mapping docs.",
    "- [x] Add CSV/import adapters.",
    "- [x] Add migration completion report.",
    "09.03 Workforce Platform Migration Path",
    "workforce-platform-migration.md",
  ],
  "Plan 09 roadmap",
);

const phaseThreeBlock = plan.match(
  /### Phase 3: Workforce Platform Migration Path[\s\S]*?(?=### Phase 4: Checklist Platform Migration Path)/,
)?.[0];

if (!phaseThreeBlock || phaseThreeBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 3 still has unchecked tasks");
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
    "sample workforce export creates valid FlowForce import previews",
    "Messages are archive-only for v1.",
    "Phase 09.04",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:workforce-migration",
    "scripts/check-workforce-migration-contract.mjs",
  ],
  "package scripts",
);

const workforce = await jiti.import(
  join(root, "src/services/integrations/workforceMigrationPath.ts"),
);

if (!workforce.isWorkforceMigrationPathReady()) {
  throw new Error("Workforce migration path readiness check failed");
}

const employeeAdapter = workforce.buildWorkforceCsvAdapter({
  adapterKey: "employees",
  rows: workforce.sampleWorkforceExport.employees,
});

if (!employeeAdapter.preview.canImport) {
  throw new Error("Sample employee workforce export should be importable");
}

if (
  employeeAdapter.preview.rows[0].mapped.role !== "manager" ||
  employeeAdapter.preview.rows[1].mapped.role !== "team_member"
) {
  throw new Error("Workforce roles were not normalized correctly");
}

const scheduleAdapter = workforce.buildWorkforceCsvAdapter({
  adapterKey: "schedules",
  rows: workforce.sampleWorkforceExport.schedules,
});

if (
  !scheduleAdapter.preview.canImport ||
  scheduleAdapter.preview.summary.validRows !== 2
) {
  throw new Error(
    "Sample schedule workforce export should produce two valid rows",
  );
}

const taskAdapter = workforce.buildWorkforceCsvAdapter({
  adapterKey: "tasks",
  rows: workforce.sampleWorkforceExport.tasks,
});

if (
  !taskAdapter.preview.canImport ||
  taskAdapter.preview.summary.validRows !== 1
) {
  throw new Error("Sample task workforce export should produce one valid row");
}

const completionReport = workforce.buildWorkforceMigrationCompletionReport(
  workforce.sampleWorkforceExport,
);

if (
  !completionReport.readyForTenantImport ||
  completionReport.importedObjects.messages !== 0 ||
  completionReport.skippedObjects[0]?.object !== "messages"
) {
  throw new Error(
    "Workforce completion report should be ready and archive messages",
  );
}

process.stdout.write("OK workforce migration contract\n");
