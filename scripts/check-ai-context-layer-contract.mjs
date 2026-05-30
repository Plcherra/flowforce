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

const doc = readText("docs/ai-context-layer.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/07-02-ai-context-layer-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260529000200_phase7_ai_context_layer.sql",
);
const service = readText("src/services/ai/aiContextLayer.ts");
const dbTest = readText("supabase/tests/phase7_ai_context_layer.test.sql");
const packageJson = readText("package.json");

requireIncludes(
  migration,
  [
    "ai_context_module_summaries_v",
    "ai_context_readiness_v",
    "get_ai_context_snapshot",
    "scheduling",
    "inventory",
    "tasks",
    "forms",
    "employees",
    "cost",
    "current_user_company_ids",
    "AI governance baseline is required before context fetch",
    "raw_pii",
    "cross_tenant_data",
    "freshness_at",
  ],
  "AI context migration",
);

requireIncludes(
  service,
  [
    "AIContextModuleKey",
    "AIContextReadinessRow",
    "AIContextSnapshot",
    "aiContextModuleKeys",
    "aiContextRedactionRules",
    "isAIContextReady",
    "hasCompleteAIContextSnapshot",
  ],
  "AI context service",
);

requireIncludes(
  doc,
  [
    "ai_context_module_summaries_v",
    "get_ai_context_snapshot(company_id)",
    "ai_context_readiness_v",
    "Raw PII is blocked",
    "Cross-tenant data is blocked",
    "ready_for_prompt_contracts",
  ],
  "AI context doc",
);

requireIncludes(
  dbTest,
  [
    "AI context exposes six module summaries for the current tenant",
    "AI context view is scoped to one tenant",
    "task summary counts tenant tasks without exposing titles",
    "Tenant B cannot fetch Tenant A AI context snapshot",
    "AI context snapshot requires governance baseline for the current tenant",
  ],
  "AI context DB test",
);

requireIncludes(
  roadmap,
  [
    "Build tenant-scoped context fetchers.",
    "Add module summaries for scheduling, inventory, tasks, forms, employees, and cost.",
    "Redact sensitive data where possible.",
    "Add freshness timestamps.",
    "07.02 AI Context Layer",
    "docs/ai-context-layer.md",
  ],
  "Plan 07 roadmap",
);

const phaseTwoBlock = roadmap.match(
  /### Phase 2: AI Context Layer[\s\S]*?### Phase 3:/,
)?.[0];

if (!phaseTwoBlock || phaseTwoBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 2 still has unchecked tasks");
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
    "ai_context_module_summaries_v",
    "get_ai_context_snapshot(company_id)",
    "ready_for_prompt_contracts",
    "Phase 07.03: Prompt Contracts",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-context",
    "scripts/check-ai-context-layer-contract.mjs",
    "supabase/tests/phase7_ai_context_layer.test.sql",
  ],
  "package scripts",
);

process.stdout.write("OK AI context layer contract\n");
