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

const doc = readText("docs/ai-compliance-workflow-assistant.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/07-07-compliance-and-workflow-assistant-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260529000700_phase7_compliance_workflow_assistant.sql",
);
const dbTest = readText(
  "supabase/tests/phase7_compliance_workflow_assistant.test.sql",
);
const service = readText("src/services/ai/aiComplianceWorkflowAssistant.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "buildComplianceWorkflowSuggestions",
    "buildValidatedComplianceWorkflowAssistant",
    "buildComplianceWorkflowAssistantDraft",
    "isComplianceWorkflowSuggestionSafe",
    "compliance_assistant",
    "overdue_workflow",
    "failed_checklist_pattern",
    "corrective_task",
    "training_followup",
    "writesAllowed: false",
  ],
  "AI compliance/workflow assistant service",
);

requireIncludes(
  doc,
  [
    "refresh_ai_compliance_workflow_suggestions(company_id)",
    "review_ai_compliance_workflow_suggestion(suggestion_id, decision, comments)",
    "ai_compliance_workflow_suggestions",
    "never creates tasks or training assignments directly",
    "direct_write_executed",
  ],
  "AI compliance/workflow assistant doc",
);

requireIncludes(
  migration,
  [
    "ai_compliance_workflow_suggestions",
    "refresh_ai_compliance_workflow_suggestions",
    "review_ai_compliance_workflow_suggestion",
    "ai_compliance_workflow_suggestions_latest_v",
    "ai_compliance_workflow_assistant_readiness_v",
    "ai.compliance_workflow_suggestion.created",
    "ai.compliance_workflow_suggestion.approved",
    "direct_write_executed",
    "current_user_is_company_admin",
  ],
  "AI compliance/workflow assistant migration",
);

requireIncludes(
  dbTest,
  [
    "tenant member can refresh compliance workflow suggestions",
    "compliance assistant detects overdue workflows",
    "compliance assistant detects failed checklist patterns",
    "compliance workflow suggestions do not execute direct writes",
    "Tenant B cannot refresh Tenant A compliance workflow suggestions",
  ],
  "AI compliance/workflow assistant DB test",
);

requireIncludes(
  auditEvents,
  [
    "aiComplianceWorkflowSuggestionCreated",
    "aiComplianceWorkflowSuggestionApproved",
    "aiComplianceWorkflowSuggestionRejected",
  ],
  "audit events",
);

requireIncludes(
  roadmap,
  [
    "Detect overdue recurring workflows.",
    "Summarize failed checklist patterns.",
    "Suggest corrective tasks.",
    "Suggest training follow-ups.",
    "07.07 Compliance And Workflow Assistant",
    "docs/ai-compliance-workflow-assistant.md",
  ],
  "Plan 07 roadmap",
);

const phaseSevenBlock = roadmap.match(
  /### Phase 7: Compliance And Workflow Assistant[\s\S]*?### Phase 8:/,
)?.[0];

if (!phaseSevenBlock || phaseSevenBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 7 still has unchecked tasks");
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
    "refresh_ai_compliance_workflow_suggestions(company_id)",
    "review_ai_compliance_workflow_suggestion(suggestion_id, decision, comments)",
    "approval-gated compliance and workflow AI suggestions",
    "Phase 07.08: Learning Loop",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-compliance-workflow-assistant",
    "scripts/check-ai-compliance-workflow-assistant-contract.mjs",
    "supabase/tests/phase7_compliance_workflow_assistant.test.sql",
  ],
  "package scripts",
);

const complianceWorkflowAssistant = await jiti.import(
  join(root, "src/services/ai/aiComplianceWorkflowAssistant.ts"),
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
      summary: {},
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
      summary: {
        overdue_tasks: 3,
        high_priority_tasks: 2,
      },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["tasks"],
    },
    forms: {
      summary: {
        expiring_forms_soon: 1,
      },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["forms"],
    },
    employees: {
      summary: {
        active_employees: 4,
      },
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["profiles"],
    },
    cost: {
      summary: {},
      freshness_at: "2026-05-29T12:00:00.000Z",
      redaction: { raw_pii: "blocked", cross_tenant_data: "blocked" },
      source_tables: ["cost_day_location_summary_v"],
    },
  },
};

const result =
  complianceWorkflowAssistant.buildValidatedComplianceWorkflowAssistant(
    sampleSnapshot,
  );

if (!result.validation.ok) {
  throw new Error(
    `Compliance workflow assistant draft failed validation: ${result.validation.issues.join("; ")}`,
  );
}

if (
  !result.suggestions.some(
    (suggestion) => suggestion.type === "overdue_workflow",
  )
) {
  throw new Error(
    "Compliance workflow assistant did not detect overdue workflow pressure",
  );
}

if (
  !result.suggestions.some(
    (suggestion) => suggestion.type === "training_followup",
  )
) {
  throw new Error(
    "Compliance workflow assistant did not detect training follow-up",
  );
}

const safe = complianceWorkflowAssistant.isComplianceWorkflowSuggestionSafe({
  id: "suggestion",
  company_id: "sample-company",
  prompt_key: "compliance_assistant",
  status: "pending_review",
  suggestion_type: "overdue_workflow",
  priority: "medium",
  title: "Review overdue workflow discipline",
  rationale: "Overdue workflow pressure needs review.",
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
  throw new Error("Compliance workflow suggestion safety check failed");
}

process.stdout.write("OK AI compliance/workflow assistant contract\n");
