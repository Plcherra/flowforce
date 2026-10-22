export const XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";
export const DEFAULT_GROK_MODEL = "grok-4.3";
export const GROK_PROVIDER = "xai" as const;
export const DEFAULT_GROK_REASONING_EFFORT = "low" as const;
export const DEFAULT_GROK_TIMEOUT_MS = 15_000;
export const DEFAULT_GROK_MAX_RETRIES = 2;

export type GrokProvider = typeof GROK_PROVIDER;
export type GrokReasoningEffort = "none" | "low" | "medium" | "high";
export type GrokMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GrokTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type GrokResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        schema: Record<string, unknown>;
        strict?: boolean;
      };
    };

export type GrokToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type GrokChatSuccess = {
  content: string;
  model: string;
  provider: GrokProvider;
  inputTokens: number;
  outputTokens: number;
  retryCount: number;
  toolCalls: GrokToolCall[];
};

type GrokRuntimeConfig = {
  apiKey: string;
  model: string;
  reasoningEffort?: GrokReasoningEffort;
};

const REASONING_EFFORTS = new Set<GrokReasoningEffort>(["none", "low", "medium", "high"]);
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

const finiteTokens = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

export function resolveGrokModel(configured?: string | null) {
  const model = configured?.trim().toLowerCase();
  return model || DEFAULT_GROK_MODEL;
}

export function grokSupportsReasoningEffort(model: string) {
  return model === "grok-4.3" || model.startsWith("grok-4.3-");
}

export function resolveGrokReasoningEffort(
  model: string,
  configured?: string | null,
): GrokReasoningEffort | undefined {
  if (!grokSupportsReasoningEffort(model)) return undefined;
  const effort = configured?.trim().toLowerCase();
  if (effort && REASONING_EFFORTS.has(effort as GrokReasoningEffort)) {
    return effort as GrokReasoningEffort;
  }
  return DEFAULT_GROK_REASONING_EFFORT;
}

export function readGrokRuntimeConfig(
  readEnv: (name: string) => string | undefined,
): GrokRuntimeConfig {
  const model = resolveGrokModel(readEnv("XAI_MODEL"));
  return {
    apiKey: readEnv("XAI_API_KEY")?.trim() ?? "",
    model,
    reasoningEffort: resolveGrokReasoningEffort(model, readEnv("XAI_REASONING_EFFORT")),
  };
}

type TokenRates = { input: number; output: number };

const shortContextRates: Record<string, TokenRates> = {
  "grok-4.3": { input: 0.00000125, output: 0.0000025 },
  "grok-4.5": { input: 0.000002, output: 0.000006 },
  "grok-4.6": { input: 0.000002, output: 0.000006 },
  "grok-4.7": { input: 0.000002, output: 0.000006 },
};

const longContextRates: Record<string, TokenRates> = {
  "grok-4.3": { input: 0.0000025, output: 0.000005 },
  "grok-4.5": { input: 0.000004, output: 0.000012 },
  "grok-4.6": { input: 0.000004, output: 0.000012 },
  "grok-4.7": { input: 0.000004, output: 0.000012 },
};

function grokRateFamily(model: string) {
  if (model.startsWith("grok-4.7")) return "grok-4.7";
  if (model.startsWith("grok-4.6")) return "grok-4.6";
  if (model.startsWith("grok-4.5")) return "grok-4.5";
  if (model.startsWith("grok")) return "grok-4.3";
  return null;
}

export function estimateGrokCostUsd(model: string, inputTokens = 0, outputTokens = 0) {
  const family = grokRateFamily(model.trim().toLowerCase());
  if (!family) return null;
  const input = finiteTokens(inputTokens);
  const output = finiteTokens(outputTokens);
  const table = input >= 200_000 ? longContextRates : shortContextRates;
  const rates = table[family];
  return Number((input * rates.input + output * rates.output).toFixed(6));
}

export function buildGrokChatRequest(input: {
  model: string;
  messages: GrokMessage[];
  temperature?: number;
  maxCompletionTokens?: number;
  reasoningEffort?: GrokReasoningEffort;
  responseFormat?: GrokResponseFormat;
  tools?: GrokTool[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
}) {
  const body: Record<string, unknown> = {
    model: resolveGrokModel(input.model),
    messages: input.messages,
    temperature: input.temperature ?? 0.7,
  };

  if (typeof input.maxCompletionTokens === "number") {
    body.max_completion_tokens = input.maxCompletionTokens;
  }
  if (input.reasoningEffort) {
    body.reasoning_effort = input.reasoningEffort;
  }
  if (input.responseFormat && input.responseFormat.type !== "text") {
    body.response_format = input.responseFormat;
  }
  if (input.tools && input.tools.length > 0) {
    body.tools = input.tools;
    body.tool_choice = input.toolChoice ?? "auto";
  }

  return body;
}

function readToolCalls(message: Record<string, unknown> | undefined): GrokToolCall[] {
  const calls = message?.tool_calls;
  if (!Array.isArray(calls)) return [];

  return calls.flatMap((call) => {
    if (!call || typeof call !== "object") return [];
    const record = call as Record<string, unknown>;
    const fn = record.function;
    if (!fn || typeof fn !== "object") return [];
    const functionRecord = fn as Record<string, unknown>;
    const name = typeof functionRecord.name === "string" ? functionRecord.name : "";
    if (!name) return [];
    const args = functionRecord.arguments;
    return [
      {
        id: typeof record.id === "string" ? record.id : "",
        name,
        arguments: typeof args === "string" ? args : JSON.stringify(args ?? {}),
      },
    ];
  });
}

export function parseGrokChatResponse(payload: unknown, fallbackModel: string): GrokChatSuccess {
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const choices = Array.isArray(body.choices) ? body.choices : [];
  const first = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>) : {};
  const message =
    first.message && typeof first.message === "object"
      ? (first.message as Record<string, unknown>)
      : undefined;
  const usage =
    body.usage && typeof body.usage === "object" ? (body.usage as Record<string, unknown>) : {};
  const content = typeof message?.content === "string" ? message.content : "";

  return {
    content,
    model: typeof body.model === "string" && body.model.trim() ? body.model.trim().toLowerCase() : fallbackModel,
    provider: GROK_PROVIDER,
    inputTokens: finiteTokens(usage.prompt_tokens),
    outputTokens: finiteTokens(usage.completion_tokens),
    retryCount: 0,
    toolCalls: readToolCalls(message),
  };
}

export function parseModelJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(body.slice(start, end + 1)) as unknown;
    }
    throw new Error("Model returned invalid JSON");
  }
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const nested = payload.error;
    const message =
      typeof nested === "string"
        ? nested.trim()
        : nested?.message?.trim() || payload.message?.trim();
    if (message) return message.slice(0, 300);
  } catch {
    // The provider returned a non-JSON error body.
  }
  return `Grok request failed (${response.status})`;
}

export async function createGrokChatCompletion(
  input: {
    apiKey: string;
    model: string;
    messages: GrokMessage[];
    temperature?: number;
    maxCompletionTokens?: number;
    reasoningEffort?: GrokReasoningEffort;
    responseFormat?: GrokResponseFormat;
    tools?: GrokTool[];
    toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
    timeoutMs?: number;
    maxRetries?: number;
    fetchImpl?: typeof fetch;
  },
): Promise<GrokChatSuccess> {
  if (!input.apiKey.trim()) {
    throw Object.assign(new Error("AI provider is not configured."), { code: "missing_api_key" });
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const timeoutMs = input.timeoutMs ?? DEFAULT_GROK_TIMEOUT_MS;
  const maxRetries = input.maxRetries ?? DEFAULT_GROK_MAX_RETRIES;
  const model = resolveGrokModel(input.model);
  const body = JSON.stringify(
    buildGrokChatRequest({
      model,
      messages: input.messages,
      temperature: input.temperature,
      maxCompletionTokens: input.maxCompletionTokens,
      reasoningEffort: input.reasoningEffort,
      responseFormat: input.responseFormat,
      tools: input.tools,
      toolChoice: input.toolChoice,
    }),
  );

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(XAI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        const error = Object.assign(new Error(message), {
          code: response.status === 408 ? "provider_timeout" : "provider_error",
          status: response.status,
        });
        if (!RETRYABLE_STATUS.has(response.status) || attempt === maxRetries) {
          throw error;
        }
        lastError = error;
        attempt += 1;
        continue;
      }

      const parsed = parseGrokChatResponse(await response.json(), model);
      return { ...parsed, retryCount: attempt };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      const wrapped = aborted
        ? Object.assign(new Error("Grok request timed out."), { code: "provider_timeout" })
        : error instanceof Error
          ? error
          : new Error("Grok request failed.");
      const status = (wrapped as { status?: number }).status;
      const retryable =
        aborted ||
        wrapped instanceof TypeError ||
        (typeof status === "number" && RETRYABLE_STATUS.has(status));
      if (!retryable || attempt === maxRetries) {
        throw wrapped;
      }
      lastError = wrapped;
      attempt += 1;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Grok request failed.");
}
