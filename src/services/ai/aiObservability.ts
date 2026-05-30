import type { AIPromptContractKey } from "./aiPromptContracts";

export type AIUsageStatus = "succeeded" | "failed" | "timeout" | "budget_blocked" | "fallback";

export interface AIUsageEventInput {
  companyId: string;
  promptKey: AIPromptContractKey;
  model: string;
  provider?: "openai" | "other";
  status: AIUsageStatus;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  retryCount?: number;
  timeoutMs?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  costUsd?: number;
  fallbackUsed?: boolean;
}

export interface AIBudgetControl {
  companyId: string;
  model: string;
  monthlyTokenLimit: number;
  monthlyCostLimitUsd: number;
  maxRetries: number;
  timeoutMs: number;
  alertThresholdRatio: number;
  enabled: boolean;
}

export interface AIBudgetStatus {
  companyId: string;
  model: string;
  usedTokens: number;
  usedCostUsd: number;
  monthlyTokenLimit: number;
  monthlyCostLimitUsd: number;
  tokenUsageRatio: number;
  costUsageRatio: number;
  shouldBlock: boolean;
  shouldAlert: boolean;
}

export const aiUsageEventTable = "ai_usage_events" as const;
export const aiBudgetControlTable = "ai_budget_controls" as const;

export const defaultAIRetryPolicy = {
  maxRetries: 2,
  timeoutMs: 15000,
  retryableStatuses: ["failed", "timeout"] as AIUsageStatus[],
};

export const aiModelCostPer1KTokensUsd: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
};

const finiteNumber = (value: number | undefined, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;

export function estimateAIUsageCostUsd(model: string, inputTokens = 0, outputTokens = 0) {
  const pricing = aiModelCostPer1KTokensUsd[model] ?? aiModelCostPer1KTokensUsd["gpt-4o-mini"];
  return Number(
    (
      (finiteNumber(inputTokens) / 1000) * pricing.input +
      (finiteNumber(outputTokens) / 1000) * pricing.output
    ).toFixed(6),
  );
}

export function buildAIUsageEvent(input: AIUsageEventInput) {
  const inputTokens = Math.floor(finiteNumber(input.inputTokens));
  const outputTokens = Math.floor(finiteNumber(input.outputTokens));
  const costUsd =
    typeof input.costUsd === "number"
      ? Number(Math.max(0, input.costUsd).toFixed(6))
      : estimateAIUsageCostUsd(input.model, inputTokens, outputTokens);

  return {
    company_id: input.companyId,
    prompt_key: input.promptKey,
    provider: input.provider ?? "openai",
    model: input.model,
    status: input.status,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    latency_ms: Math.floor(finiteNumber(input.latencyMs)),
    retry_count: Math.floor(finiteNumber(input.retryCount)),
    timeout_ms: Math.floor(finiteNumber(input.timeoutMs, defaultAIRetryPolicy.timeoutMs)),
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ? input.errorMessage.slice(0, 500) : null,
    cost_usd: costUsd,
    fallback_used: input.fallbackUsed ?? input.status === "fallback",
  };
}

export function shouldRetryAIUsage(status: AIUsageStatus, retryCount: number, maxRetries = defaultAIRetryPolicy.maxRetries) {
  return defaultAIRetryPolicy.retryableStatuses.includes(status) && retryCount < maxRetries;
}

export function evaluateAIBudgetStatus(status: AIBudgetStatus) {
  const tokenUsageRatio =
    status.monthlyTokenLimit > 0 ? status.usedTokens / status.monthlyTokenLimit : status.tokenUsageRatio;
  const costUsageRatio =
    status.monthlyCostLimitUsd > 0 ? status.usedCostUsd / status.monthlyCostLimitUsd : status.costUsageRatio;
  const shouldBlock = tokenUsageRatio >= 1 || costUsageRatio >= 1 || status.shouldBlock;
  const shouldAlert = shouldBlock || tokenUsageRatio >= 0.8 || costUsageRatio >= 0.8 || status.shouldAlert;

  return {
    ...status,
    tokenUsageRatio,
    costUsageRatio,
    shouldBlock,
    shouldAlert,
  };
}

export function buildSafeAIFallback(reason: string) {
  return {
    status: "fallback" as const,
    retry: false,
    writesAllowed: false as const,
    requiresHumanApproval: true as const,
    reason: reason.slice(0, 240),
  };
}

export function isAIUsageEventSafe(event: ReturnType<typeof buildAIUsageEvent>) {
  const hasErrorForFailures =
    !["failed", "timeout", "budget_blocked"].includes(event.status) ||
    Boolean(event.error_code || event.error_message);

  return (
    event.total_tokens === event.input_tokens + event.output_tokens &&
    event.cost_usd >= 0 &&
    event.timeout_ms > 0 &&
    event.retry_count >= 0 &&
    hasErrorForFailures
  );
}
