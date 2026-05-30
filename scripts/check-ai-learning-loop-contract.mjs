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

const doc = readText("docs/ai-learning-loop.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/07-08-learning-loop-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260529000800_phase7_learning_loop.sql",
);
const dbTest = readText("supabase/tests/phase7_learning_loop.test.sql");
const service = readText("src/services/ai/aiLearningLoop.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "normalizeAILearningReasonCode",
    "buildAILearningSignal",
    "summarizeAILearningSignals",
    "buildAILearningAdjustment",
    "isAILearningFeedbackSafe",
    "no_cross_tenant_training",
    'feedbackScope: "tenant"',
    "ai_recommendation_feedback",
  ],
  "AI learning loop service",
);

requireIncludes(
  doc,
  [
    "record_ai_recommendation_feedback(source_table, source_id, outcome, reason_code, notes)",
    "get_ai_learning_adjustment(company_id, prompt_key, suggestion_type)",
    "ai_recommendation_feedback",
    "feedback_scope = 'tenant'",
    "no_cross_tenant_training = true",
  ],
  "AI learning loop doc",
);

requireIncludes(
  migration,
  [
    "ai_recommendation_feedback",
    "record_ai_recommendation_feedback",
    "get_ai_learning_adjustment",
    "ai_learning_loop_summary_v",
    "ai_learning_loop_readiness_v",
    "ai.recommendation_feedback.recorded",
    "feedback_scope = 'tenant'",
    "no_cross_tenant_training = true",
    "current_user_is_company_admin",
  ],
  "AI learning loop migration",
);

requireIncludes(
  dbTest,
  [
    "tenant admin can record accepted scheduling feedback",
    "tenant admin can record rejected compliance feedback",
    "learning adjustment deprioritizes repeatedly rejected suggestions",
    "Tenant B cannot record Tenant A learning feedback",
  ],
  "AI learning loop DB test",
);

requireIncludes(
  auditEvents,
  ["aiRecommendationFeedbackRecorded", "ai.recommendation_feedback.recorded"],
  "audit events",
);

requireIncludes(
  roadmap,
  [
    "Track accepted/rejected recommendations.",
    "Capture reason codes.",
    "Improve future suggestions from user feedback.",
    "Keep tenant-specific learning separated.",
    "07.08 Learning Loop",
    "docs/ai-learning-loop.md",
  ],
  "Plan 07 roadmap",
);

const phaseEightBlock = roadmap.match(
  /### Phase 8: Learning Loop[\s\S]*?### Phase 9:/,
)?.[0];

if (!phaseEightBlock || phaseEightBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 8 still has unchecked tasks");
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
    "record_ai_recommendation_feedback(source_table, source_id, outcome, reason_code, notes)",
    "get_ai_learning_adjustment(company_id, prompt_key, suggestion_type)",
    "tenant-scoped AI learning feedback",
    "Phase 07.09: AI Observability And Cost Controls",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-learning-loop",
    "scripts/check-ai-learning-loop-contract.mjs",
    "supabase/tests/phase7_learning_loop.test.sql",
  ],
  "package scripts",
);

const learningLoop = await jiti.import(
  join(root, "src/services/ai/aiLearningLoop.ts"),
);

const acceptedSignal = learningLoop.buildAILearningSignal({
  companyId: "sample-company",
  sourceTable: "ai_scheduling_suggestions",
  sourceId: "suggestion-1",
  promptKey: "scheduling_assistant",
  suggestionType: "coverage_gap",
  outcome: "accepted",
  reasonCode: "Useful",
  sourceStatus: "approved",
  sourcePriority: "medium",
  sourceTitle: "Review open shift coverage",
});

if (acceptedSignal.reason_code !== "useful") {
  throw new Error("Learning loop did not normalize accepted reason code");
}

if (
  !acceptedSignal.no_cross_tenant_training ||
  acceptedSignal.feedback_scope !== "tenant"
) {
  throw new Error("Learning loop signal is not tenant-only");
}

const summaries = learningLoop.summarizeAILearningSignals([
  {
    companyId: "sample-company",
    sourceTable: "ai_compliance_workflow_suggestions",
    sourceId: "suggestion-2",
    promptKey: "compliance_assistant",
    suggestionType: "failed_checklist_pattern",
    outcome: "rejected",
    reasonCode: "wrong_context",
  },
  {
    companyId: "sample-company",
    sourceTable: "ai_compliance_workflow_suggestions",
    sourceId: "suggestion-3",
    promptKey: "compliance_assistant",
    suggestionType: "failed_checklist_pattern",
    outcome: "rejected",
    reasonCode: "wrong_context",
  },
  {
    companyId: "sample-company",
    sourceTable: "ai_compliance_workflow_suggestions",
    sourceId: "suggestion-4",
    promptKey: "compliance_assistant",
    suggestionType: "failed_checklist_pattern",
    outcome: "rejected",
    reasonCode: "wrong_context",
  },
]);

const rejectedSummary = summaries[0];
const adjustment = learningLoop.buildAILearningAdjustment(rejectedSummary);

if (adjustment.recommendation !== "deprioritize") {
  throw new Error(
    "Learning loop did not deprioritize repeatedly rejected suggestions",
  );
}

const safe = learningLoop.isAILearningFeedbackSafe({
  id: "feedback",
  company_id: "sample-company",
  source_table: "ai_compliance_workflow_suggestions",
  source_id: "suggestion-4",
  prompt_key: "compliance_assistant",
  suggestion_type: "failed_checklist_pattern",
  outcome: "rejected",
  reason_code: "wrong_context",
  feedback_scope: "tenant",
  learning_fingerprint:
    "sample-company:ai_compliance_workflow_suggestions:suggestion-4:compliance_assistant:failed_checklist_pattern",
  no_cross_tenant_training: true,
  source_status: "rejected",
  source_priority: "medium",
  source_title: "Review failed checklist pattern",
  created_by: "user",
  created_at: "2026-05-29T12:00:00.000Z",
});

if (!safe) {
  throw new Error("Learning loop safety check failed");
}

process.stdout.write("OK AI learning loop contract\n");
