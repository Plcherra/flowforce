import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { estimateAIUsageCostUsd } from "./aiObservability";
import {
  buildGrokChatRequest,
  createGrokChatCompletion,
  DEFAULT_GROK_MODEL,
  parseGrokChatResponse,
  parseModelJson,
  readGrokRuntimeConfig,
  resolveGrokModel,
  resolveGrokReasoningEffort,
  XAI_CHAT_COMPLETIONS_URL,
} from "./grokProvider";
import {
  AI_BUDGET_FALLBACK,
  monthlyCapReached,
  promptKeyForInsightType,
  runMeteredGrokChat,
  type AiUsageClient,
} from "./grokUsage";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

function usageClient(usedTokens: number) {
  const calls: Record<string, unknown>[] = [];
  const client: AiUsageClient = {
    from(table: string) {
      const builder = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        gte() {
          return builder;
        },
        limit() {
          return Promise.resolve({
            data: [{ total_tokens: usedTokens, cost_usd: 0 }],
            error: null,
          });
        },
        maybeSingle() {
          return Promise.resolve({
            data:
              table === "ai_budget_controls"
                ? { enabled: true, monthly_token_limit: 100, monthly_cost_limit_usd: 100 }
                : null,
            error: null,
          });
        },
      };
      return builder;
    },
    rpc(_fn, args) {
      calls.push(args);
      return Promise.resolve({
        data: {
          status: args.p_status,
          should_block: args.p_status === "budget_blocked",
          provider: "xai",
        },
        error: null,
      });
    },
  };
  return { client, calls };
}

export async function runGrokProviderTests() {
  assert.equal(resolveGrokModel(undefined), DEFAULT_GROK_MODEL);
  assert.equal(resolveGrokModel("  Grok-4.7  "), "grok-4.7");
  assert.equal(resolveGrokReasoningEffort("grok-4.3", undefined), "low");
  assert.equal(resolveGrokReasoningEffort("grok-4.3", "none"), "none");
  assert.equal(resolveGrokReasoningEffort("grok-4.7", "low"), undefined);

  const config = readGrokRuntimeConfig((name) =>
    name === "XAI_API_KEY" ? "secret" : name === "XAI_MODEL" ? "grok-4.3" : undefined,
  );
  assert.equal(config.model, "grok-4.3");
  assert.equal(config.reasoningEffort, "low");
  assert.equal(config.apiKey, "secret");

  const request = buildGrokChatRequest({
    model: "grok-4.3",
    messages: [{ role: "user", content: "Return JSON" }],
    maxCompletionTokens: 500,
    reasoningEffort: "low",
    responseFormat: { type: "json_object" },
    tools: [
      {
        type: "function",
        function: { name: "draft_task", parameters: { type: "object" } },
      },
    ],
  }) as {
    search_parameters: { mode: string };
    response_format: { type: string };
    tools: unknown[];
    reasoning_effort: string;
    max_completion_tokens: number;
    max_tokens?: number;
  };
  assert.equal(request.search_parameters.mode, "off");
  assert.equal(request.response_format.type, "json_object");
  assert.equal(request.tools.length, 1);
  assert.equal(request.reasoning_effort, "low");
  assert.equal(request.max_completion_tokens, 500);
  assert.equal(request.max_tokens, undefined);
  assert.equal(
    (buildGrokChatRequest({
      model: "grok-4.7",
      messages: [{ role: "user", content: "Hi" }],
    }) as { reasoning_effort?: string }).reasoning_effort,
    undefined,
  );

  const parsed = parseGrokChatResponse(
    {
      model: "grok-4.3",
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "draft_task", arguments: "{\"title\":\"Count stock\"}" },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 20, completion_tokens: 8 },
    },
    "grok-4.3",
  );
  assert.equal(parsed.provider, "xai");
  assert.equal(parsed.toolCalls[0]?.name, "draft_task");
  assert.equal(JSON.parse(parsed.toolCalls[0]?.arguments ?? "{}").title, "Count stock");
  assert.deepEqual(parseModelJson("```json\n{\"ok\":true}\n```"), { ok: true });

  assert.equal(estimateAIUsageCostUsd("grok-4.3", 1_000_000, 1_000_000), 7.5);
  assert.equal(estimateAIUsageCostUsd("grok-4.3", 1_000, 1_000), 0.00375);
  assert.equal(estimateAIUsageCostUsd("grok-4.7", 1_000_000, 0), 4);
  assert.equal(estimateAIUsageCostUsd("gpt-4o-mini", 1_000, 1_000), 0.00075);
  assert.equal(promptKeyForInsightType("scheduler"), "scheduling_assistant");
  assert.equal(promptKeyForInsightType("dashboard"), "manager_briefing");
  assert.equal(
    monthlyCapReached({
      enabled: true,
      usedTokens: 1_000_000,
      usedCostUsd: 1,
      monthlyTokenLimit: 1_000_000,
      monthlyCostLimitUsd: 100,
    }),
    true,
  );

  const blocked = usageClient(100);
  let fetched = false;
  const blockedResult = await runMeteredGrokChat({
    client: blocked.client,
    companyId: "company-1",
    promptKey: "manager_briefing",
    surface: "ai-insights",
    apiKey: "test-key",
    model: "grok-4.3",
    messages: [{ role: "user", content: "Hello" }],
    fetchImpl: async () => {
      fetched = true;
      return new Response("{}", { status: 500 });
    },
  });
  assert.equal(blockedResult.blocked, true);
  assert.equal(blockedResult.content, AI_BUDGET_FALLBACK);
  assert.equal(blocked.calls[0]?.p_status, "budget_blocked");
  assert.equal((blocked.calls[0]?.p_metadata as { provider: string }).provider, "xai");
  assert.equal(fetched, false);

  const open = usageClient(0);
  const completion = await createGrokChatCompletion({
    apiKey: "test-key",
    model: "grok-4.3",
    reasoningEffort: "low",
    messages: [{ role: "user", content: "Hello" }],
    fetchImpl: async (url, init) => {
      fetched = true;
      assert.equal(String(url), XAI_CHAT_COMPLETIONS_URL);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Authorization"), "Bearer test-key");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "grok-4.3");
      assert.equal(body.search_parameters.mode, "off");
      return new Response(
        JSON.stringify({
          model: "grok-4.3",
          choices: [{ message: { content: "Coverage is short on Friday." } }],
          usage: { prompt_tokens: 12, completion_tokens: 6 },
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(fetched, true);
  assert.equal(completion.content, "Coverage is short on Friday.");
  assert.equal(completion.inputTokens, 12);

  const metered = await runMeteredGrokChat({
    client: open.client,
    companyId: "company-1",
    userId: "8b100000-0000-4000-8000-000000000001",
    promptKey: "scheduling_assistant",
    surface: "ai-insights",
    metadata: { insight_type: "scheduler" },
    apiKey: "test-key",
    model: "grok-4.3",
    reasoningEffort: "low",
    messages: [{ role: "user", content: "Hello" }],
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          model: "grok-4.3",
          choices: [{ message: { content: "Coverage is short on Friday." } }],
          usage: { prompt_tokens: 12, completion_tokens: 6 },
        }),
        { status: 200 },
      ),
  });
  assert.equal(metered.blocked, false);
  assert.equal(metered.content, "Coverage is short on Friday.");
  assert.equal(open.calls[0]?.p_model, "grok-4.3");
  assert.equal(open.calls[0]?.p_prompt_key, "scheduling_assistant");
  assert.equal(open.calls[0]?.p_cost_usd, estimateAIUsageCostUsd("grok-4.3", 12, 6));

  let attempts = 0;
  const retried = await createGrokChatCompletion({
    apiKey: "test-key",
    model: "grok-4.3",
    messages: [{ role: "user", content: "Hello" }],
    maxRetries: 1,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response(JSON.stringify({ error: { message: "busy" } }), { status: 503 });
      }
      return new Response(
        JSON.stringify({
          model: "grok-4.3",
          choices: [{ message: { content: "Recovered." } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(attempts, 2);
  assert.equal(retried.retryCount, 1);
  assert.equal(retried.content, "Recovered.");

  const insights = read("supabase/functions/ai-insights/index.ts");
  const engagement = read("supabase/functions/ai-analyze-updates/index.ts");
  const automation = read("src/server/ops/suggestions/generateAutomationSuggestion.ts");
  for (const source of [insights, engagement, automation]) {
    assert.equal(source.includes("api.openai.com"), false);
    assert.equal(source.includes("gpt-4o-mini"), false);
  }
  assert.equal(insights.includes("runMeteredGrokChat"), true);
  assert.equal(engagement.includes("runMeteredGrokChat"), true);
  assert.equal(automation.includes("responseFormat: { type: \"json_object\" }"), true);
  assert.equal(read("supabase/functions/_shared/grokProvider.ts").includes(XAI_CHAT_COMPLETIONS_URL), true);
  for (const path of [
    "supabase/functions/ai-scheduling-assistant/index.ts",
    "supabase/functions/copilot-dispatcher/index.ts",
    "supabase/functions/copilot-service/index.ts",
    "supabase/functions/copilot-evaluate-employee/index.ts",
  ]) {
    assert.equal(read(path).includes("api.openai.com"), false);
    assert.equal(read(path).includes("gpt-4o-mini"), false);
  }
  assert.equal(
    read("docs/features/languages.md").includes("OPENAI_API_KEY`, and `gpt-4o-mini`"),
    true,
  );
}
