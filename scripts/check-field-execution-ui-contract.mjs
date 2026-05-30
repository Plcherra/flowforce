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

const doc = readText("docs/field-execution-ui.md");
const roadmap = readText(
  "docs/roadmap/06-operations-workflows-and-compliance.md",
);
const report = readText(
  "docs/roadmap/reports/06-04-field-execution-ui-2026-05-28.md",
);
const migration = readText(
  "supabase/migrations/20260528001600_phase6_field_execution_ui.sql",
);
const service = readText("src/services/operations/fieldExecution.ts");
const panel = readText(
  "src/features/operations/components/FieldExecutionPanel.tsx",
);
const hub = readText("src/features/operations/components/OperationsHub.tsx");
const dbTest = readText("supabase/tests/phase6_field_execution_ui.test.sql");
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "operations_field_execution_queue_v",
    "operations_workflow_run_steps_v",
    "current_user_can_execute_workflow_run",
    "start_workflow_run",
    "save_workflow_step_draft",
    "complete_workflow_step",
    "complete_workflow_run",
    "workflow_exceptions",
  ],
  "Field execution migration",
);

requireIncludes(
  service,
  [
    "FieldExecutionRunRow",
    "FieldExecutionStepRow",
    "summarizeExecutionRun",
    "sortExecutionRuns",
    "stepNeedsEvidence",
    "buildStepEvidencePayload",
  ],
  "Field execution service",
);

requireIncludes(
  panel,
  [
    "FieldExecutionPanel",
    "operations_field_execution_queue_v",
    "operations_workflow_run_steps_v",
    "start_workflow_run",
    "save_workflow_step_draft",
    "complete_workflow_step",
    "complete_workflow_run",
    "Mobile Run Console",
  ],
  "Field execution panel",
);

requireIncludes(hub, ["FieldExecutionPanel"], "Operations Hub");

requireIncludes(
  doc,
  [
    "Field Execution UI",
    "mobile-first",
    "save draft",
    "required evidence",
    "workflow exception",
    "operations_field_execution_queue_v",
  ],
  "Field execution doc",
);

requireIncludes(
  roadmap,
  [
    "Build mobile-first run interface.",
    "Support save-draft and resume.",
    "Support required evidence.",
    "Support failed step notes and escalation.",
    "06.04 Field Execution UI",
    "docs/field-execution-ui.md",
  ],
  "Plan 06 roadmap",
);

const phaseFourBlock = roadmap.match(
  /### Phase 4: Field Execution UI[\s\S]*?### Phase 5:/,
)?.[0];

if (!phaseFourBlock || phaseFourBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 4 still has unchecked tasks");
}

requireIncludes(
  dbTest,
  [
    "assigned employee sees one field execution run",
    "employee can start or resume assigned workflow run",
    "employee can save a step draft",
    "required evidence cannot be omitted",
    "failed step creates an exception",
    "completed review-required workflow moves to manager review",
  ],
  "Field execution DB test",
);

requireIncludes(
  report,
  [
    "start_workflow_run",
    "save_workflow_step_draft",
    "complete_workflow_step",
    "FieldExecutionPanel",
    "Phase 06.06",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:field-execution-ui",
    "scripts/check-field-execution-ui-contract.mjs",
    "supabase/tests/phase6_field_execution_ui.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK field execution UI contract\n");
