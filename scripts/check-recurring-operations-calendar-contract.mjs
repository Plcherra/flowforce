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

const doc = readText("docs/recurring-operations-calendar.md");
const roadmap = readText(
  "docs/roadmap/06-operations-workflows-and-compliance.md",
);
const report = readText(
  "docs/roadmap/reports/06-03-recurring-operations-calendar-2026-05-28.md",
);
const migration = readText(
  "supabase/migrations/20260528001400_phase6_recurring_operations_calendar.sql",
);
const service = readText(
  "src/services/operations/recurringOperationsCalendar.ts",
);
const panel = readText(
  "src/features/operations/components/RecurringOperationsCalendarPanel.tsx",
);
const hub = readText("src/features/operations/components/OperationsHub.tsx");
const dbTest = readText(
  "supabase/tests/phase6_recurring_operations_calendar.test.sql",
);
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "generate_recurring_workflow_runs",
    "workflow_calendar_due_at",
    "task_workflow_instances_recurring_assignment_day_key",
    "workflow_step_instances",
    "operations_daily_workload_v",
    "current_user_company_ids()",
  ],
  "Recurring operations calendar migration",
);

requireIncludes(
  service,
  [
    "recurringOperationsSchedulePresets",
    "Daily opening",
    "Daily closing",
    "Weekly safety",
    "buildGenerationWindow",
    "summarizeWorkload",
  ],
  "Recurring operations calendar service",
);

requireIncludes(
  panel,
  [
    "RecurringOperationsCalendarPanel",
    "generate_recurring_workflow_runs",
    "operations_daily_workload_v",
    "Generate",
  ],
  "Recurring operations calendar panel",
);

requireIncludes(hub, ["RecurringOperationsCalendarPanel"], "Operations Hub");

requireIncludes(
  doc,
  [
    "Recurring Operations Calendar",
    "Daily operations can be planned automatically",
    "idempotent",
    "operations_daily_workload_v",
  ],
  "Recurring operations calendar doc",
);

requireIncludes(
  roadmap,
  [
    "Schedule recurring workflow runs.",
    "Assign by location, role, or person.",
    "Add due windows and escalation rules.",
    "Show daily manager workload.",
    "06.03 Recurring Operations Calendar",
    "docs/recurring-operations-calendar.md",
  ],
  "Plan 06 roadmap",
);

const phaseThreeBlock = roadmap.match(
  /### Phase 3: Recurring Operations Calendar[\s\S]*?### Phase 4:/,
)?.[0];

if (!phaseThreeBlock || phaseThreeBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 3 still has unchecked tasks");
}

requireIncludes(
  dbTest,
  [
    "generate_recurring_workflow_runs",
    "three daily workflow runs are generated",
    "retry does not create duplicate workflow runs",
    "daily workload view exposes generated runs",
    "Tenant A cannot generate recurring runs for Tenant B",
  ],
  "Recurring operations calendar DB test",
);

requireIncludes(
  report,
  [
    "generate_recurring_workflow_runs",
    "RecurringOperationsCalendarPanel",
    "Phase 06.04",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:recurring-operations-calendar",
    "scripts/check-recurring-operations-calendar-contract.mjs",
    "supabase/tests/phase6_recurring_operations_calendar.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK recurring operations calendar contract\n");
