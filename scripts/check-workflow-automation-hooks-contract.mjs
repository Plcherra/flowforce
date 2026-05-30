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

const doc = readText("docs/workflow-automation-hooks.md");
const roadmap = readText(
  "docs/roadmap/06-operations-workflows-and-compliance.md",
);
const report = readText(
  "docs/roadmap/reports/06-08-workflow-automation-hooks-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260528001900_phase6_workflow_automation_hooks.sql",
);
const service = readText("src/services/operations/workflowAutomationHooks.ts");
const panel = readText(
  "src/features/operations/components/WorkflowAutomationHooksPanel.tsx",
);
const hub = readText("src/features/operations/components/OperationsHub.tsx");
const dbTest = readText(
  "supabase/tests/phase6_workflow_automation_hooks.test.sql",
);
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "workflow_automation_runs",
    "workflow_is_inventory_or_waste",
    "apply_workflow_exception_automation",
    "run_workflow_exception_automation",
    "run_workflow_exception_automation_after_insert",
    "run_overdue_critical_workflow_notifications",
    "operations_workflow_automation_hooks_v",
    "workflow.automation.failed_step_task.created",
    "workflow.automation.inventory_review.created",
    "workflow.automation.overdue_critical.notified",
  ],
  "Workflow automation hooks migration",
);

requireIncludes(
  service,
  [
    "WorkflowAutomationHookRow",
    "WorkflowAutomationRpcResult",
    "workflowAutomationHookLabels",
    "summarizeWorkflowAutomationHooks",
    "sortWorkflowAutomationHooks",
  ],
  "Workflow automation hooks service",
);

requireIncludes(
  panel,
  [
    "WorkflowAutomationHooksPanel",
    "operations_workflow_automation_hooks_v",
    "run_overdue_critical_workflow_notifications",
    "Check overdue critical runs",
  ],
  "Workflow automation hooks panel",
);

requireIncludes(hub, ["WorkflowAutomationHooksPanel"], "Operations Hub");

requireIncludes(
  doc,
  [
    "Workflow Automation Hooks",
    "Failed checklist steps",
    "Inventory count or waste workflow exceptions",
    "Overdue workflow runs with critical exceptions",
    "workflow_automation_runs",
  ],
  "Workflow automation hooks doc",
);

requireIncludes(
  roadmap,
  [
    "Trigger tasks from failed checklist steps.",
    "Trigger inventory adjustments or reviews from count/waste workflows.",
    "Trigger notifications for overdue critical runs.",
    "Log every automated action.",
    "06.08 Workflow Automation Hooks",
    "docs/workflow-automation-hooks.md",
  ],
  "Plan 06 roadmap",
);

const phaseEightBlock = roadmap.match(
  /### Phase 8: Workflow Automation Hooks[\s\S]*?### Phase 9:/,
)?.[0];

if (!phaseEightBlock || phaseEightBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 8 still has unchecked tasks");
}

requireIncludes(
  dbTest,
  [
    "failed step exception creates an automation run",
    "inventory workflow exception creates review issue",
    "manual exception automation rerun is idempotent",
    "overdue critical workflow creates notification hook",
    "Tenant B cannot run Tenant A workflow automation hooks",
  ],
  "Workflow automation hooks DB test",
);

requireIncludes(
  report,
  [
    "workflow_automation_runs",
    "operations_workflow_automation_hooks_v",
    "WorkflowAutomationHooksPanel",
    "Phase 06.09",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:workflow-automation-hooks",
    "scripts/check-workflow-automation-hooks-contract.mjs",
    "supabase/tests/phase6_workflow_automation_hooks.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK workflow automation hooks contract\n");
