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

const doc = readText("docs/ai-governance-model.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const report = readText(
  "docs/roadmap/reports/07-01-ai-governance-model-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260529000100_phase7_ai_governance_model.sql",
);
const hardeningMigration = readText(
  "supabase/migrations/20260529001000_phase7_ai_security_hardening.sql",
);
const service = readText("src/services/ai/aiGovernance.ts");
const dbTest = readText("supabase/tests/phase7_ai_governance_model.test.sql");
const security = readText("docs/security-review-pass.md");
const roles = readText("docs/roles-and-permissions.md");
const registry = readText("src/lib/permissions/registry.ts");
const roleContract = readText(
  "src/features/roles/constants/productRoleContract.json",
);
const auditEvents = readText("src/services/audit/auditEvents.ts");
const packageJson = readText("package.json");

requireIncludes(
  doc,
  [
    "read_only_insight",
    "suggested_action",
    "approved_action",
    "automated_action",
    "raw PII",
    "payroll detail",
    "secret material",
    "cross-tenant data",
    "install_ai_governance_baseline(company_id)",
    "ai_governance_readiness_v",
  ],
  "AI governance doc",
);

requireIncludes(
  migration,
  [
    "ai_governance_policies",
    "install_ai_governance_baseline",
    "ai_governance_readiness_v",
    "read_only_insight",
    "suggested_action",
    "approved_action",
    "automated_action",
    "current_user_company_ids",
    "raw_pii",
    "payroll_detail",
    "secret_material",
    "cross_tenant_data",
  ],
  "AI governance migration",
);

requireIncludes(
  hardeningMigration,
  [
    "Company members can read AI governance policies",
    "revoke insert, update, delete on public.ai_governance_policies from authenticated",
    "Company admin permission is required to install AI governance",
    "ai.governance.updated",
    "mutation_path",
    "admin_rpc",
  ],
  "AI governance hardening migration",
);

requireIncludes(
  service,
  [
    "AIGovernanceActionLevel",
    "AIGovernanceReadinessRow",
    "aiGovernancePolicies",
    "aiGovernanceChecks",
    "isAIGovernanceReady",
    "ai.actions.approve",
    "ai.governance.manage",
  ],
  "AI governance service",
);

requireIncludes(
  dbTest,
  [
    "tenant admin can install AI governance baseline",
    "readiness view counts four AI governance policies",
    "approved actions require human approval",
    "read-only insights cannot run background automation",
    "tenant users cannot directly weaken AI governance policies",
    "Tenant B cannot install Tenant A AI governance baseline",
  ],
  "AI governance DB test",
);

requireIncludes(
  registry,
  [
    "ai.insights.view",
    "ai.actions.suggest",
    "ai.actions.approve",
    "ai.actions.automate",
    "ai.audit.view",
    "ai.governance.manage",
  ],
  "permission registry",
);

requireIncludes(
  roleContract,
  [
    "ai.insights.view",
    "ai.actions.suggest",
    "ai.actions.approve",
    "ai.audit.view",
    "ai.governance.manage",
  ],
  "role contract",
);

requireIncludes(
  auditEvents,
  [
    "aiInsightGenerated",
    "aiSuggestionCreated",
    "aiActionApproved",
    "aiAutomationExecuted",
    "aiGovernanceUpdated",
  ],
  "audit events",
);

requireIncludes(
  security,
  [
    "AI Governance Baseline",
    "AI cannot become an uncontrolled side door",
    "raw PII, payroll detail, secret material, or cross-tenant data",
  ],
  "security docs",
);

requireIncludes(
  roles,
  [
    "AI Governance Permissions",
    "ai.insights.view",
    "ai.actions.approve",
    "ai.governance.manage",
  ],
  "roles docs",
);

requireIncludes(
  roadmap,
  [
    "Define read-only insight, suggested action, approved action, and automated action.",
    "Define AI permissions.",
    "Define audit log requirements.",
    "Define data that AI may and may not access.",
    "07.01 AI Governance Model",
    "docs/ai-governance-model.md",
  ],
  "Plan 07 roadmap",
);

const phaseOneBlock = roadmap.match(
  /### Phase 1: AI Governance Model[\s\S]*?### Phase 2:/,
)?.[0];

if (!phaseOneBlock || phaseOneBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 1 still has unchecked tasks");
}

requireIncludes(
  report,
  [
    "AI governance baseline",
    "install_ai_governance_baseline(company_id)",
    "ai_governance_readiness_v",
    "Phase 07.02: AI Context Layer",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-governance",
    "scripts/check-ai-governance-contract.mjs",
    "supabase/tests/phase7_ai_governance_model.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK AI governance contract\n");
