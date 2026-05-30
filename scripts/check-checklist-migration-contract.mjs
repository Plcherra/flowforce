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

const service = readText("src/services/integrations/checklistMigrationPath.ts");
const doc = readText("docs/checklist-platform-migration.md");
const plan = readText("docs/roadmap/09-integrations-and-migration-tools.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/09-04-checklist-platform-migration-2026-05-30.md",
);
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "checklistMigrationDataObjects",
    "checklists",
    "sops",
    "forms",
    "locations",
    "recurring_tasks",
    "checklistTemplateMapping",
    "sampleChecklistExport",
    "buildChecklistWorkflowPreview",
    "buildChecklistMigrationPreviews",
    "buildChecklistPostImportReview",
    "buildChecklistMigrationCompletionReport",
    "isChecklistMigrationPathReady",
    "create_exception_on_failed_required_step",
  ],
  "checklist migration service",
);

requireIncludes(
  doc,
  [
    "Checklists: become executable workflow templates.",
    "SOPs: become workflow templates with forms and review required.",
    "Forms: checklist step input types become form fields and workflow steps.",
    "Locations: imported location names are preserved for assignment review.",
    "Recurring tasks: recurrence becomes workflow assignment schedule rules.",
    "Post-Import Workflow Review",
    "npm run check:checklist-migration",
  ],
  "checklist migration doc",
);

requireIncludes(
  plan,
  [
    "- [x] Define imported data: checklists, SOPs, forms, locations, recurring tasks.",
    "- [x] Add template mapping.",
    "- [x] Add import preview and validation.",
    "- [x] Add post-import workflow review.",
    "09.04 Checklist Platform Migration Path",
    "checklist-platform-migration.md",
  ],
  "Plan 09 roadmap",
);

const phaseFourBlock = plan.match(
  /### Phase 4: Checklist Platform Migration Path[\s\S]*?(?=### Phase 5: MarketMan Migration Path)/,
)?.[0];

if (!phaseFourBlock || phaseFourBlock.includes("- [ ]")) {
  throw new Error("Plan 09 phase 4 still has unchecked tasks");
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
    "executable `create_sop_checklist_template` payloads",
    "Every imported workflow template requires manager review",
    "Phase 09.05",
  ],
  "Plan 09 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:checklist-migration",
    "scripts/check-checklist-migration-contract.mjs",
  ],
  "package scripts",
);

const checklist = await jiti.import(
  join(root, "src/services/integrations/checklistMigrationPath.ts"),
);

if (!checklist.isChecklistMigrationPathReady()) {
  throw new Error("Checklist migration path readiness check failed");
}

const previews = checklist.buildChecklistMigrationPreviews(
  checklist.sampleChecklistExport,
);

if (
  previews.length !== 2 ||
  previews.some((preview) => !preview.canCreateWorkflow)
) {
  throw new Error(
    "Sample checklist exports should create two valid workflow previews",
  );
}

if (
  previews[0].payload.workflow_kind !== "checklist" ||
  previews[1].payload.workflow_kind !== "sop"
) {
  throw new Error("Checklist and SOP workflow kinds were not preserved");
}

if (
  previews[0].payload.steps[0].field_type !== "temperature" ||
  previews[0].payload.steps[2].evidence_required !== true
) {
  throw new Error("Checklist field and evidence mapping is incorrect");
}

const reportResult = checklist.buildChecklistMigrationCompletionReport(
  checklist.sampleChecklistExport,
);

if (
  !reportResult.readyForTenantImport ||
  reportResult.importedObjects.forms !== 5 ||
  reportResult.postImportReviews.length !== 2
) {
  throw new Error("Checklist completion report is not ready");
}

if (
  reportResult.postImportReviews.some(
    (review) =>
      review.reviewRequired !== true ||
      !review.checks.some((check) => check.key === "manager_approval"),
  )
) {
  throw new Error("Checklist post-import review must require manager approval");
}

const invalidPreview = checklist.buildChecklistWorkflowPreview({
  name: "",
  steps: [],
});

if (
  invalidPreview.canCreateWorkflow ||
  !invalidPreview.issues.some(
    (issue) => issue.code === "missing_template_name",
  ) ||
  !invalidPreview.issues.some((issue) => issue.code === "missing_steps")
) {
  throw new Error("Invalid checklist export should produce blocking errors");
}

process.stdout.write("OK checklist migration contract\n");
