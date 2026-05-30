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

const signoff = readText("docs/ai-copilot-signoff.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText("docs/roadmap/reports/07-10-ai-copilot-signoff-2026-05-29.md");
const dbTest = readText("supabase/tests/phase7_ai_copilot_signoff.test.sql");
const hardeningMigration = readText(
  "supabase/migrations/20260529001000_phase7_ai_security_hardening.sql",
);
const releaseGates = readText(".github/workflows/release-gates.yml");
const packageJson = readText("package.json");

requireIncludes(
  signoff,
  [
    "AI Copilot Signoff",
    "npm run check:ai-copilot",
    "npm run test:db:ai-copilot",
    "Safety Review Checklist",
    "Direct writes are blocked",
    "Learning feedback is tenant-specific",
    "Budget controls can block or degrade AI calls",
    "Demo Workflow",
  ],
  "AI copilot signoff doc",
);

requireIncludes(
  dbTest,
  [
    "tenant admin can install governance for the copilot signoff demo",
    "manager briefing remains read-only and approval-aware",
    "manager can approve a scheduling suggestion in the signoff demo",
    "learning feedback is recorded for the approved suggestion",
    "AI usage telemetry is recorded for the signoff demo",
    "Tenant B cannot read Tenant A signoff suggestions",
  ],
  "AI copilot signoff DB test",
);

requireIncludes(
  hardeningMigration,
  [
    "Company members can read AI governance policies",
    "AI usage telemetry must be recorded by a trusted server context",
    "trusted_server_context",
    "admin_rpc",
  ],
  "AI security hardening migration",
);

requireIncludes(
  releaseGates,
  [
    "AI copilot contract gates",
    "npm run check:ai-copilot",
    "Database tenant-isolation and storage tests",
  ],
  "release gates workflow",
);

requireIncludes(
  roadmap,
  [
    "Add release gates for AI contract tests.",
    "Add safety review checklist.",
    "Add demo workflow.",
    "Update roadmap status.",
    "07.10 AI Copilot Signoff",
    "docs/ai-copilot-signoff.md",
  ],
  "Plan 07 roadmap",
);

const phaseTenBlock = roadmap.match(/### Phase 10: AI Copilot Signoff[\s\S]*$/)?.[0];

if (!phaseTenBlock || phaseTenBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 10 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [09 Integrations And Migration Tools]",
    "Last completed phase: 09.04, Checklist Platform Migration Path",
    "AI gives useful recommendations with audit trails and user approval.",
    "[x] 7.  AI copilot and automation",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "AI is now a controlled product capability",
    "Plan 08: Mobile App And Offline Mode",
    "npm run check:ai-copilot",
    "npm run test:db:ai-copilot",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-copilot-signoff",
    "check:ai-copilot",
    "test:db:ai-copilot",
    "scripts/check-ai-copilot-signoff-contract.mjs",
    "supabase/tests/phase7_ai_copilot_signoff.test.sql",
  ],
  "package scripts",
);

const governance = await jiti.import(join(root, "src/services/ai/aiGovernance.ts"));
const scheduling = await jiti.import(join(root, "src/services/ai/aiSchedulingAssistant.ts"));
const observability = await jiti.import(join(root, "src/services/ai/aiObservability.ts"));

const suggestedActionPolicy = governance.aiGovernancePolicies.find(
  (policy) => policy.policyKey === "suggested_action",
);

if (!suggestedActionPolicy?.requiresHumanApproval || suggestedActionPolicy.allowsBackgroundAutomation) {
  throw new Error("Suggested action governance is not approval-gated");
}

const fallback = observability.buildSafeAIFallback("signoff check");

if (fallback.writesAllowed !== false || fallback.requiresHumanApproval !== true) {
  throw new Error("AI fallback is not write-safe");
}

const suggestion = scheduling.buildSchedulingSuggestions({
  companyId: "sample-company",
  generatedAt: new Date().toISOString(),
  modules: {
    scheduling: {
      freshness_at: new Date().toISOString(),
      summary: { scheduled_shifts: 0, unassigned_shifts: 1, required_headcount: 3 },
    },
    employees: { freshness_at: new Date().toISOString(), summary: { active_employees: 2 } },
    inventory: { freshness_at: new Date().toISOString(), summary: {} },
    tasks: { freshness_at: new Date().toISOString(), summary: {} },
    forms: { freshness_at: new Date().toISOString(), summary: {} },
    cost: { freshness_at: new Date().toISOString(), summary: { labor_cost: 0 } },
  },
})[0];

if (!suggestion?.requiresHumanApproval || suggestion.writesAllowed !== false) {
  throw new Error("Scheduling suggestion is not approval-gated");
}

process.stdout.write("OK AI copilot signoff contract\n");
