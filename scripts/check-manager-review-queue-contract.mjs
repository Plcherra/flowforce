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

const doc = readText("docs/manager-review-queue.md");
const roadmap = readText(
  "docs/roadmap/06-operations-workflows-and-compliance.md",
);
const report = readText(
  "docs/roadmap/reports/06-05-manager-review-queue-2026-05-28.md",
);
const migration = readText(
  "supabase/migrations/20260528001500_phase6_manager_review_queue.sql",
);
const service = readText("src/services/operations/managerReviewQueue.ts");
const panel = readText(
  "src/features/operations/components/ManagerReviewQueuePanel.tsx",
);
const hub = readText("src/features/operations/components/OperationsHub.tsx");
const dbTest = readText("supabase/tests/phase6_manager_review_queue.test.sql");
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "current_user_can_review_workflows",
    "operations_manager_review_queue_v",
    "review_workflow_run",
    "workflow_reviews",
    "audit_log",
    "workflow.review.",
  ],
  "Manager review queue migration",
);

requireIncludes(
  service,
  [
    "ManagerReviewQueueRow",
    "WorkflowReviewStatus",
    "reviewPriorityRank",
    "summarizeReviewQueue",
  ],
  "Manager review queue service",
);

requireIncludes(
  panel,
  [
    "ManagerReviewQueuePanel",
    "operations_manager_review_queue_v",
    "review_workflow_run",
    "Approve",
    "Reject",
  ],
  "Manager review queue panel",
);

requireIncludes(hub, ["ManagerReviewQueuePanel"], "Operations Hub");

requireIncludes(
  doc,
  [
    "Manager Review Queue",
    "approve/reject/needs-changes",
    "audit_log",
    "operations_manager_review_queue_v",
  ],
  "Manager review queue doc",
);

requireIncludes(
  roadmap,
  [
    "Add review states.",
    "Add approve/reject/comment actions.",
    "Add exception prioritization.",
    "Add audit trail.",
    "06.05 Manager Review Queue",
    "docs/manager-review-queue.md",
  ],
  "Plan 06 roadmap",
);

const phaseFiveBlock = roadmap.match(
  /### Phase 5: Manager Review Queue[\s\S]*?### Phase 6:/,
)?.[0];

if (!phaseFiveBlock || phaseFiveBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 5 still has unchecked tasks");
}

requireIncludes(
  dbTest,
  [
    "current_user_can_review_workflows",
    "review queue prioritizes severe exceptions",
    "workflow review action is audited",
    "employee role cannot review workflow runs",
  ],
  "Manager review queue DB test",
);

requireIncludes(
  report,
  [
    "review_workflow_run",
    "ManagerReviewQueuePanel",
    "Phase 06.04 Field Execution UI was completed and remains complete.",
    "Phase 06.06",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:manager-review-queue",
    "scripts/check-manager-review-queue-contract.mjs",
    "supabase/tests/phase6_manager_review_queue.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK manager review queue contract\n");
