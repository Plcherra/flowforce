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

const doc = readText("docs/ai-observability-and-cost-controls.md");
const roadmap = readText("docs/roadmap/07-ai-copilot-and-automation.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const report = readText(
  "docs/roadmap/reports/07-09-ai-observability-and-cost-controls-2026-05-29.md",
);
const migration = readText(
  "supabase/migrations/20260529000900_phase7_ai_observability_cost_controls.sql",
);
const hardeningMigration = readText(
  "supabase/migrations/20260529001000_phase7_ai_security_hardening.sql",
);
const dbTest = readText("supabase/tests/phase7_ai_observability.test.sql");
const service = readText("src/services/ai/aiObservability.ts");
const auditEvents = readText("src/services/audit/auditEvents.ts");
const packageJson = readText("package.json");

requireIncludes(
  service,
  [
    "buildAIUsageEvent",
    "estimateAIUsageCostUsd",
    "shouldRetryAIUsage",
    "evaluateAIBudgetStatus",
    "buildSafeAIFallback",
    "isAIUsageEventSafe",
    "ai_usage_events",
    "ai_budget_controls",
    "defaultAIRetryPolicy",
  ],
  "AI observability service",
);

requireIncludes(
  doc,
  [
    "record_ai_usage_event(company_id, prompt_key, model, status, input_tokens, output_tokens, latency_ms, retry_count, timeout_ms, error_code, error_message, cost_usd, metadata)",
    "upsert_ai_budget_control(company_id, model, monthly_token_limit, monthly_cost_limit_usd, max_retries, timeout_ms, enabled)",
    "ai_usage_admin_dashboard_v",
    "budget-blocked calls should return a fallback result",
    "maxRetries = 2",
  ],
  "AI observability doc",
);

requireIncludes(
  migration,
  [
    "ai_usage_events",
    "ai_budget_controls",
    "record_ai_usage_event",
    "upsert_ai_budget_control",
    "ai_usage_monthly_summary_v",
    "ai_budget_status_v",
    "ai_usage_admin_dashboard_v",
    "ai_observability_readiness_v",
    "ai.usage_event.recorded",
    "ai.usage_event.degraded",
    "ai.budget_control.updated",
    "current_user_is_company_admin",
  ],
  "AI observability migration",
);

requireIncludes(
  hardeningMigration,
  [
    "AI usage telemetry must be recorded by a trusted server context",
    "revoke execute on function public.record_ai_usage_event",
    "grant execute on function public.record_ai_usage_event",
    "to service_role",
    "trusted_server_context",
  ],
  "AI observability hardening migration",
);

requireIncludes(
  dbTest,
  [
    "tenant admin can configure AI budget controls",
    "authenticated tenant members cannot directly record AI usage telemetry",
    "trusted server context can record successful AI usage",
    "trusted server context can record degraded AI usage",
    "usage recording blocks calls that exceed budget",
    "Tenant B cannot read Tenant A AI usage",
  ],
  "AI observability DB test",
);

requireIncludes(
  auditEvents,
  [
    "aiUsageEventRecorded",
    "aiUsageEventDegraded",
    "aiBudgetControlUpdated",
    "ai.usage_event.recorded",
    "ai.usage_event.degraded",
    "ai.budget_control.updated",
  ],
  "audit events",
);

requireIncludes(
  roadmap,
  [
    "Log model, tokens, latency, errors, and user.",
    "Add tenant/model budget controls.",
    "Add retry and timeout behavior.",
    "Add admin AI usage dashboard.",
    "07.09 AI Observability And Cost Controls",
    "docs/ai-observability-and-cost-controls.md",
  ],
  "Plan 07 roadmap",
);

const phaseNineBlock = roadmap.match(
  /### Phase 9: AI Observability And Cost Controls[\s\S]*?### Phase 10:/,
)?.[0];

if (!phaseNineBlock || phaseNineBlock.includes("- [ ]")) {
  throw new Error("Plan 07 phase 9 still has unchecked tasks");
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
    "record_ai_usage_event(company_id, prompt_key, model, status, input_tokens, output_tokens, latency_ms, retry_count, timeout_ms, error_code, error_message, cost_usd, metadata)",
    "upsert_ai_budget_control(company_id, model, monthly_token_limit, monthly_cost_limit_usd, max_retries, timeout_ms, enabled)",
    "AI cost and reliability are visible",
    "Phase 07.10: AI Copilot Signoff",
  ],
  "Plan 07 phase report",
);

requireIncludes(
  packageJson,
  [
    "check:ai-observability",
    "scripts/check-ai-observability-contract.mjs",
    "supabase/tests/phase7_ai_observability.test.sql",
  ],
  "package scripts",
);

const observability = await jiti.import(
  join(root, "src/services/ai/aiObservability.ts"),
);

const usageEvent = observability.buildAIUsageEvent({
  companyId: "sample-company",
  promptKey: "manager_briefing",
  model: "gpt-4o-mini",
  status: "succeeded",
  inputTokens: 1000,
  outputTokens: 500,
  latencyMs: 450,
  retryCount: 0,
  timeoutMs: 15000,
});

if (usageEvent.total_tokens !== 1500) {
  throw new Error("AI usage event did not calculate total tokens");
}

if (usageEvent.cost_usd <= 0) {
  throw new Error("AI usage event did not estimate cost");
}

const failedEvent = observability.buildAIUsageEvent({
  companyId: "sample-company",
  promptKey: "manager_briefing",
  model: "gpt-4o-mini",
  status: "timeout",
  inputTokens: 20,
  outputTokens: 0,
  errorCode: "provider_timeout",
  errorMessage: "Provider timed out.",
  retryCount: 2,
});

if (!observability.isAIUsageEventSafe(failedEvent)) {
  throw new Error("AI degraded usage event safety check failed");
}

if (observability.shouldRetryAIUsage("timeout", 2)) {
  throw new Error("AI retry policy exceeded max retry count");
}

const budgetStatus = observability.evaluateAIBudgetStatus({
  companyId: "sample-company",
  model: "gpt-4o-mini",
  usedTokens: 900,
  usedCostUsd: 10,
  monthlyTokenLimit: 1000,
  monthlyCostLimitUsd: 100,
  tokenUsageRatio: 0,
  costUsageRatio: 0,
  shouldBlock: false,
  shouldAlert: false,
});

if (!budgetStatus.shouldAlert || budgetStatus.shouldBlock) {
  throw new Error("AI budget status did not alert before blocking");
}

const fallback = observability.buildSafeAIFallback("budget reached");

if (
  fallback.writesAllowed !== false ||
  fallback.requiresHumanApproval !== true
) {
  throw new Error("AI fallback is not safe");
}

process.stdout.write("OK AI observability contract\n");
