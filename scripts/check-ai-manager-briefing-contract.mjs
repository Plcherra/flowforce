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

const doc = readText("docs/ai-manager-briefing.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/07-04-manager-briefing-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260529000400_phase7_manager_briefing.sql",
);
const dbTest = readText("supabase/tests/phase7_manager_briefing.test.sql");
const service = readText("src/services/ai/aiManagerBriefing.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "buildManagerBriefingDraft",
    "buildValidatedManagerBriefing",
    "buildManagerBriefingEvidence",
    "buildManagerBriefingRisks",
    "manager_briefing",
    "writes_allowed: false",
    "/app/enhanced-scheduling",
    "/app/operations",
  ],
  "AI manager briefing service",
);

requireIncludes(
  doc,
  [
    "refresh_ai_manager_briefing(company_id)",
    "ai_manager_briefing_runs",
    "ai.manager_briefing.generated",
    "Staffing risks",
    "Workflow exceptions",
    "writes_allowed",
  ],
  "AI manager briefing doc",
);

requireIncludes(
  migration,
  [
    "ai_manager_briefing_runs",
    "refresh_ai_manager_briefing",
    "ai_manager_briefing_latest_v",
    "ai_manager_briefing_readiness_v",
    "get_ai_context_snapshot",
    "ai.manager_briefing.generated",
    "/app/enhanced-scheduling",
    "/app/operations",
    "workflow_exceptions",
  ],
  "AI manager briefing migration",
);

requireIncludes(
  dbTest,
  [
    "tenant member can refresh the manager briefing",
    "manager briefing latest view exposes the current tenant run",
    "manager briefing output is read-only",
    "manager briefing includes evidence links",
    "manager briefing refresh writes an audit log entry",
    "Tenant B cannot refresh Tenant A manager briefing",
  ],
  "AI manager briefing DB test",
);

requireIncludes(
  auditEvents,
  ["aiManagerBriefingGenerated", "ai.manager_briefing.generated"],
  "audit events",
);

requireIncludes(
  roadmap,
  [
    'Build "today\'s operations briefing."',
    "Include staffing risks, inventory risks, overdue tasks, workflow exceptions, and cost anomalies.",
    "Add evidence links.",
    "Add refresh/logging behavior.",
    "07.04 Manager Briefing",
    "docs/ai-manager-briefing.md",
  ],
  "Plan 07 roadmap",
);

const phaseFourBlock = roadmap.match(
  /### Phase 4: Manager Briefing[\s\S]*?### Phase 5:/,
)?.[0];

if (!phaseFourBlock || phaseFourBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 4 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [10 Production Infrastructure And Launch]",
    "Last completed phase: 10.08, CI/CD Release Gates",
    "[x] 7.  AI copilot and automation",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "refresh_ai_manager_briefing(company_id)",
    "ai_manager_briefing_runs",
    "read-only manager briefing",
    "Phase 07.05: Scheduling Assistant",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-manager-briefing",
    "scripts/check-ai-manager-briefing-contract.mjs",
    "supabase/tests/phase7_manager_briefing.test.sql",
  ],
  "package scripts",
);

const managerBriefing = await jiti.import(
  join(root, "src/services/ai/aiManagerBriefing.ts"),
);

const sampleSnapshot = {
  company_id: "sample-company",
  generated_at: "2026-05-29T12:00:00.000Z",
  module_count: 6,
  redaction: {
    raw_pii: "blocked",
    cross_tenant_data: "blocked",
  },
  modules: {
    scheduling: {
      summary: { scheduled_shifts: 2, unassigned_shifts: 1 },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["schedules"],
    },
    inventory: {
      summary: { active_items: 2, items_with_minimums: 0 },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["inv_items"],
    },
    tasks: {
      summary: { overdue_tasks: 3 },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["tasks"],
    },
    forms: {
      summary: { expiring_forms_soon: 1 },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["forms"],
    },
    employees: {
      summary: { active_employees: 4 },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["profiles"],
    },
    cost: {
      summary: { total_operating_cost: 1000, waste_cost: 120 },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["cost_day_location_summary_v"],
    },
  },
};

const result = managerBriefing.buildValidatedManagerBriefing(sampleSnapshot);

if (!result.validation.ok) {
  throw new Error(
    `Manager briefing draft failed validation: ${result.validation.issues.join("; ")}`,
  );
}

if (
  !result.evidence.some((item) => item.route === "/app/enhanced-scheduling")
) {
  throw new Error("Manager briefing evidence is missing scheduling route");
}

const safe = managerBriefing.isManagerBriefingRunSafe({
  id: "run",
  company_id: "sample-company",
  briefing_date: "2026-05-29",
  prompt_key: "manager_briefing",
  status: "generated",
  context_generated_at: "2026-05-29T12:00:00.000Z",
  output: result.validation.data,
  evidence: result.evidence,
  fallback_reason: null,
  generated_by: "user",
  created_at: "2026-05-29T12:00:00.000Z",
});

if (!safe) {
  throw new Error("Manager briefing run safety check failed");
}

process.stdout.write("OK AI manager briefing contract\n");
