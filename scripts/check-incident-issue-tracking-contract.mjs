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

const doc = readText("docs/incident-issue-tracking.md");
const roadmap = readText(
  "docs/roadmap/06-operations-workflows-and-compliance.md",
);
const report = readText(
  "docs/roadmap/reports/06-06-incident-and-issue-tracking-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260528001700_phase6_incident_issue_tracking.sql",
);
const service = readText("src/services/operations/incidentIssueTracking.ts");
const issuesPanel = readText(
  "src/features/operations/components/IssuesStream.tsx",
);
const dbTest = readText(
  "supabase/tests/phase6_incident_issue_tracking.test.sql",
);
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "operations_incident_issue_queue_v",
    "operations_issue_reporting_v",
    "current_user_can_manage_ops_issue",
    "create_operational_issue",
    "update_operational_issue_status",
    "workflow_exception_id",
    "ai_suggestion_id",
    "ops.issue.created",
    "ops.issue.status.updated",
  ],
  "Incident issue migration",
);

requireIncludes(
  service,
  [
    "IncidentIssueQueueRow",
    "IncidentIssueReportRow",
    "incidentIssueStatusLabels",
    "incidentIssueSlaLabels",
    "summarizeIncidentIssues",
    "sortIncidentIssues",
  ],
  "Incident issue service",
);

requireIncludes(
  issuesPanel,
  [
    "operations_incident_issue_queue_v",
    "update_operational_issue_status",
    "incidentIssueSlaLabels",
    "openAutomationDrawer",
    "Resolve",
  ],
  "Operations issue panel",
);

requireIncludes(
  doc,
  [
    "Incident And Issue Tracking",
    "owned work",
    "operations_incident_issue_queue_v",
    "operations_issue_reporting_v",
    "create_operational_issue",
    "update_operational_issue_status",
  ],
  "Incident issue doc",
);

requireIncludes(
  roadmap,
  [
    "Model incidents, issues, severity, owner, due date, and resolution.",
    "Connect issues to tasks, workflows, inventory, and AI suggestions.",
    "Add status and SLA indicators.",
    "Add reporting.",
    "06.06 Incident And Issue Tracking",
    "docs/incident-issue-tracking.md",
  ],
  "Plan 06 roadmap",
);

const phaseSixBlock = roadmap.match(
  /### Phase 6: Incident And Issue Tracking[\s\S]*?### Phase 7:/,
)?.[0];

if (!phaseSixBlock || phaseSixBlock.includes("- [ ]")) {
  throw new Error("Plan 06 phase 6 still has unchecked tasks");
}

requireIncludes(
  dbTest,
  [
    "manager can create a linked operational issue",
    "issue creates follow-up task",
    "workflow exception links to issue and task",
    "issue queue marks overdue SLA",
    "manager can resolve issue with notes",
    "Tenant B cannot update Tenant A issue",
  ],
  "Incident issue DB test",
);

requireIncludes(
  report,
  [
    "operations_incident_issue_queue_v",
    "operations_issue_reporting_v",
    "IssuesStream",
    "Phase 06.07",
  ],
  "Plan 06 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:incident-issue-tracking",
    "scripts/check-incident-issue-tracking-contract.mjs",
    "supabase/tests/phase6_incident_issue_tracking.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK incident issue tracking contract\n");
