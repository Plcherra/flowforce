import {
  createGrokChatCompletion,
  DEFAULT_GROK_MAX_RETRIES,
  DEFAULT_GROK_TIMEOUT_MS,
  estimateGrokCostUsd,
  type GrokChatSuccess,
  type GrokMessage,
  type GrokReasoningEffort,
  type GrokResponseFormat,
  type GrokTool,
} from "./grokProvider";

export const AI_BUDGET_FALLBACK =
  "The monthly AI limit is reached, so this was not generated. A person can still review the underlying records.";

export const DEFAULT_MONTHLY_TOKEN_LIMIT = 1_000_000;
export const DEFAULT_MONTHLY_COST_LIMIT_USD = 100;

export type AiUsagePromptKey =
  | "scheduling_assistant"
  | "inventory_assistant"
  | "waste_assistant"
  | "compliance_assistant"
  | "manager_briefing";

type UsageRow = {
  total_tokens?: number | null;
  cost_usd?: number | string | null;
};

type BudgetRow = {
  enabled?: boolean | null;
  monthly_token_limit?: number | null;
  monthly_cost_limit_usd?: number | string | null;
};

export type AiUsageClient = {
  from: (table: string) => any;
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export function promptKeyForInsightType(type: string): AiUsagePromptKey {
  if (type === "scheduler") return "scheduling_assistant";
  return "manager_briefing";
}

export function monthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function monthlyCapReached(input: {
  enabled: boolean;
  usedTokens: number;
  usedCostUsd: number;
  monthlyTokenLimit: number;
  monthlyCostLimitUsd: number;
}) {
  if (!input.enabled) return true;
  return (
    input.usedTokens >= input.monthlyTokenLimit || input.usedCostUsd >= input.monthlyCostLimitUsd
  );
}

export async function loadMonthlyAiCap(client: AiUsageClient, companyId: string, model: string) {
  const normalizedModel = model.trim().toLowerCase();
  const budgetQuery = client
    .from("ai_budget_controls")
    .select("enabled, monthly_token_limit, monthly_cost_limit_usd")
    .eq("company_id", companyId)
    .eq("model", normalizedModel);
  const usageQuery = client
    .from("ai_usage_events")
    .select("total_tokens, cost_usd")
    .eq("company_id", companyId)
    .eq("model", normalizedModel)
    .gte("created_at", monthStartIso());

  const [budgetResult, usageResult] = await Promise.all([
    budgetQuery.maybeSingle(),
    usageQuery.limit(10_000),
  ]);

  if (budgetResult.error) {
    throw new Error(`Failed to read AI budget: ${budgetResult.error.message}`);
  }
  if (usageResult.error) {
    throw new Error(`Failed to read AI usage: ${usageResult.error.message}`);
  }

  const usedTokens = (usageResult.data ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.total_tokens) || 0),
    0,
  );
  const usedCostUsd = (usageResult.data ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.cost_usd) || 0),
    0,
  );
  const monthlyTokenLimit = budgetResult.data?.monthly_token_limit ?? DEFAULT_MONTHLY_TOKEN_LIMIT;
  const monthlyCostLimitUsd =
    Number(budgetResult.data?.monthly_cost_limit_usd ?? DEFAULT_MONTHLY_COST_LIMIT_USD) ||
    DEFAULT_MONTHLY_COST_LIMIT_USD;
  const enabled = budgetResult.data?.enabled ?? true;

  return {
    shouldBlock: monthlyCapReached({
      enabled,
      usedTokens,
      usedCostUsd,
      monthlyTokenLimit,
      monthlyCostLimitUsd,
    }),
    usedTokens,
    usedCostUsd,
    monthlyTokenLimit,
    monthlyCostLimitUsd,
  };
}

export async function recordGrokUsage(
  client: AiUsageClient,
  input: {
    companyId: string;
    promptKey: AiUsagePromptKey;
    model: string;
    status: "succeeded" | "failed" | "timeout" | "budget_blocked" | "fallback";
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    retryCount?: number;
    timeoutMs?: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    userId?: string | null;
    surface: string;
    metadata?: Record<string, unknown>;
  },
) {
  const inputTokens = Math.max(0, Math.floor(input.inputTokens ?? 0));
  const outputTokens = Math.max(0, Math.floor(input.outputTokens ?? 0));
  const costUsd = estimateGrokCostUsd(input.model, inputTokens, outputTokens) ?? 0;
  const { data, error } = await client.rpc("record_ai_usage_event", {
    p_company_id: input.companyId,
    p_prompt_key: input.promptKey,
    p_model: input.model.trim().toLowerCase(),
    p_status: input.status,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_latency_ms: Math.max(0, Math.floor(input.latencyMs ?? 0)),
    p_retry_count: Math.max(0, Math.floor(input.retryCount ?? 0)),
    p_timeout_ms: Math.max(1, Math.floor(input.timeoutMs ?? DEFAULT_GROK_TIMEOUT_MS)),
    p_error_code: input.errorCode ?? null,
    p_error_message: input.errorMessage ?? null,
    p_cost_usd: costUsd,
    p_metadata: {
      provider: "xai",
      surface: input.surface,
      ...(input.userId ? { user_id: input.userId } : {}),
      ...(input.metadata ?? {}),
    },
  });

  if (error) {
    throw new Error(`Failed to record AI usage: ${error.message}`);
  }

  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    status: typeof record.status === "string" ? record.status : input.status,
    shouldBlock: record.should_block === true || record.status === "budget_blocked",
    costUsd,
  };
}

export async function runMeteredGrokChat(input: {
  client: AiUsageClient;
  companyId: string;
  userId?: string | null;
  promptKey: AiUsagePromptKey;
  surface: string;
  metadata?: Record<string, unknown>;
  apiKey: string;
  model: string;
  reasoningEffort?: GrokReasoningEffort;
  messages: GrokMessage[];
  temperature?: number;
  maxCompletionTokens?: number;
  responseFormat?: GrokResponseFormat;
  tools?: GrokTool[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  fetchImpl?: typeof fetch;
}): Promise<GrokChatSuccess & { blocked: boolean }> {
  const started = Date.now();
  const cap = await loadMonthlyAiCap(input.client, input.companyId, input.model);
  if (cap.shouldBlock) {
    await recordGrokUsage(input.client, {
      companyId: input.companyId,
      promptKey: input.promptKey,
      model: input.model,
      status: "budget_blocked",
      latencyMs: Date.now() - started,
      errorCode: "budget_exceeded",
      errorMessage: "AI budget limit reached; safe fallback returned.",
      userId: input.userId,
      surface: input.surface,
      metadata: input.metadata,
    });
    return {
      content: AI_BUDGET_FALLBACK,
      model: input.model,
      provider: "xai",
      inputTokens: 0,
      outputTokens: 0,
      retryCount: 0,
      toolCalls: [],
      blocked: true,
    };
  }

  try {
    const completion = await createGrokChatCompletion({
      apiKey: input.apiKey,
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      messages: input.messages,
      temperature: input.temperature,
      maxCompletionTokens: input.maxCompletionTokens,
      responseFormat: input.responseFormat,
      tools: input.tools,
      toolChoice: input.toolChoice,
      fetchImpl: input.fetchImpl,
      maxRetries: DEFAULT_GROK_MAX_RETRIES,
      timeoutMs: DEFAULT_GROK_TIMEOUT_MS,
    });
    const recorded = await recordGrokUsage(input.client, {
      companyId: input.companyId,
      promptKey: input.promptKey,
      model: completion.model,
      status: "succeeded",
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      latencyMs: Date.now() - started,
      retryCount: completion.retryCount,
      userId: input.userId,
      surface: input.surface,
      metadata: input.metadata,
    });
    if (recorded.shouldBlock) {
      return { ...completion, content: AI_BUDGET_FALLBACK, blocked: true };
    }
    return { ...completion, blocked: false };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : "provider_error";
    const message = error instanceof Error ? error.message : "Grok request failed.";
    await recordGrokUsage(input.client, {
      companyId: input.companyId,
      promptKey: input.promptKey,
      model: input.model,
      status: code === "provider_timeout" ? "timeout" : "failed",
      latencyMs: Date.now() - started,
      errorCode: code,
      errorMessage: message,
      userId: input.userId,
      surface: input.surface,
      metadata: input.metadata,
    }).catch(() => undefined);
    throw error;
  }
}
