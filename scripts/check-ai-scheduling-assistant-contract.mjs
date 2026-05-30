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

const doc = readText("docs/ai-scheduling-assistant.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/07-05-scheduling-assistant-2026-05-29.md",
);
const migration = readText("supabase/migrations/20260529000500_phase7_scheduling_assistant.sql");
const dbTest = readText("supabase/tests/phase7_scheduling_assistant.test.sql");
const service = readText("src/services/ai/aiSchedulingAssistant.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "buildSchedulingSuggestions",
    "buildValidatedSchedulingAssistant",
    "buildSchedulingAssistantDraft",
    "isSchedulingSuggestionSafe",
    "scheduling_assistant",
    "coverage_gap",
    "understaffing",
    "overstaffing",
    "replacement_review",
    "writesAllowed: false",
  ],
  "AI scheduling assistant service",
);

requireIncludes(
  doc,
  [
    "refresh_ai_scheduling_suggestions(company_id)",
    "review_ai_scheduling_suggestion(suggestion_id, decision, comments)",
    "ai_scheduling_suggestions",
    "It does not publish or mutate schedule rows",
    "direct_write_executed",
  ],
  "AI scheduling assistant doc",
);

requireIncludes(
  migration,
  [
    "ai_scheduling_suggestions",
    "refresh_ai_scheduling_suggestions",
    "review_ai_scheduling_suggestion",
    "ai_scheduling_suggestions_latest_v",
    "ai_scheduling_assistant_readiness_v",
    "ai.scheduling_suggestion.created",
    "ai.scheduling_suggestion.approved",
    "direct_write_executed",
    "current_user_is_company_admin",
  ],
  "AI scheduling assistant migration",
);

requireIncludes(
  dbTest,
  [
    "tenant member can refresh scheduling suggestions",
    "scheduling suggestions are pending manager review",
    "scheduling suggestions do not execute direct writes",
    "manager can approve scheduling suggestion without publishing schedules",
    "Tenant B cannot refresh Tenant A scheduling suggestions",
  ],
  "AI scheduling assistant DB test",
);

requireIncludes(
  auditEvents,
  [
    "aiSchedulingSuggestionCreated",
    "aiSchedulingSuggestionApproved",
    "aiSchedulingSuggestionRejected",
  ],
  "audit events",
);

requireIncludes(
  roadmap,
  [
    "Suggest shifts based on demand, availability, roles, and labor cost.",
    "Detect understaffing/overstaffing.",
    "Suggest replacements for absence or conflicts.",
    "Require manager approval before writes.",
    "07.05 Scheduling Assistant",
    "docs/ai-scheduling-assistant.md",
  ],
  "Plan 07 roadmap",
);

const phaseFiveBlock = roadmap.match(
  /### Phase 5: Scheduling Assistant[\s\S]*?### Phase 6:/,
)?.[0];

if (!phaseFiveBlock || phaseFiveBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 5 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [09 Integrations And Migration Tools]",
    "Last completed phase: 09.04, Checklist Platform Migration Path",
    "[x] 7.  AI copilot and automation",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "refresh_ai_scheduling_suggestions(company_id)",
    "review_ai_scheduling_suggestion(suggestion_id, decision, comments)",
    "approval-gated scheduling suggestions",
    "Phase 07.06: Inventory And Waste Assistant",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-scheduling-assistant",
    "scripts/check-ai-scheduling-assistant-contract.mjs",
    "supabase/tests/phase7_scheduling_assistant.test.sql",
  ],
  "package scripts",
);

const schedulingAssistant = await jiti.import(join(root, "src/services/ai/aiSchedulingAssistant.ts"));

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
      summary: {
        scheduled_shifts: 1,
        unassigned_shifts: 1,
        required_headcount: 4,
      },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["schedules"],
    },
    inventory: {
      summary: {},
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["inv_items"],
    },
    tasks: {
      summary: {},
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["tasks"],
    },
    forms: {
      summary: {},
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["forms"],
    },
    employees: {
      summary: { active_employees: 0 },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["profiles"],
    },
    cost: {
      summary: { labor_cost: 400 },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["cost_day_location_summary_v"],
    },
  },
};

const result = schedulingAssistant.buildValidatedSchedulingAssistant(sampleSnapshot);

if (!result.validation.ok) {
  throw new Error(`Scheduling assistant draft failed validation: ${result.validation.issues.join("; ")}`);
}

if (!result.suggestions.some((suggestion) => suggestion.type === "understaffing")) {
  throw new Error("Scheduling assistant did not detect understaffing");
}

const safe = schedulingAssistant.isSchedulingSuggestionSafe({
  id: "suggestion",
  company_id: "sample-company",
  prompt_key: "scheduling_assistant",
  status: "pending_review",
  suggestion_type: "understaffing",
  priority: "medium",
  title: "Review possible understaffing",
  rationale: "Required headcount is higher than scheduled shifts.",
  suggested_action: {
    writes_allowed: false,
    requires_human_approval: true,
  },
  evidence: result.evidence,
  context_generated_at: "2026-05-29T12:00:00.000Z",
  approval_required: true,
  direct_write_executed: false,
  approved_by: null,
  approved_at: null,
  rejected_by: null,
  rejected_at: null,
  created_by: "user",
  created_at: "2026-05-29T12:00:00.000Z",
});

if (!safe) {
  throw new Error("Scheduling suggestion safety check failed");
}

process.stdout.write("OK AI scheduling assistant contract\n");
