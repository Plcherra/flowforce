import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { PolicyEngine } from "../../../src/server/copilot/PolicyEngine.ts";
import type {
  CopilotContext,
  CopilotActionPayload,
  CopilotEvaluationResult,
  CopilotQueueResponse,
  CopilotSignal,
  CopilotMetricSnapshot,
} from "../../../src/server/copilot/CopilotDTO.ts";

type SupabaseClient = ReturnType<typeof createClient>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, api_key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[copilot-service] Missing Supabase environment configuration.");
}

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { persistSession: false },
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { error: "Method not allowed" },
        405,
      );
    }

    const requestId = crypto.randomUUID();
    const now = new Date();
    const body = await req.json();
    const {
      companyId,
      actorUserId,
      timeframe,
      source = "system",
      policyOverrides,
      mode = "enqueue",
      actions: requestedActionsInput,
    } = body ?? {};

    if (!companyId || !actorUserId) {
      return jsonResponse(
        { error: "companyId and actorUserId are required", requestId },
        400,
      );
    }

    const actor = await loadActorContext(supabase, companyId, actorUserId);

    const requestedActions = Array.isArray(requestedActionsInput)
      ? normalizeRequestedActions(requestedActionsInput, {
        companyId,
        actorUserId,
        source,
        defaultQueuedAt: now.toISOString(),
      })
      : [];

    const metrics = sanitizeMetrics(body?.metrics);
    const signals = sanitizeSignals(body?.signals, metrics);

    const context: CopilotContext = {
      companyId,
      source,
      timeframe: normalizeTimeframe(timeframe),
      actor,
      forecast: [],
      metrics,
      signals,
      policyOverrides,
      metadata: {
        requestId,
        receivedAt: now.toISOString(),
      },
    };

    const evaluation = await evaluateCopilotContext(context, actor.userId);
    const candidateActions =
      requestedActions.length > 0 ? requestedActions : evaluation.recommendedActions ?? [];

    if (requestedActions.length > 0) {
      evaluation.recommendedActions = requestedActions;
    }

    const policyEngine = new PolicyEngine();
    const { permitted, denied } = await policyEngine.filterPermitted(context, candidateActions);

    const shouldEnqueue = mode !== "preview";
    const upsertRows = shouldEnqueue ? buildCopilotRows(permitted, now.toISOString()) : [];

    let insertedIds: string[] = [];
    if (shouldEnqueue && upsertRows.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("copilot_actions")
        .upsert(upsertRows, {
          onConflict: "company_id,dedupe_key",
          ignoreDuplicates: true,
        })
        .select("id, dedupe_key");

      if (insertError) {
        console.error("[copilot-service] Failed to upsert actions", insertError);
        throw insertError;
      }

      insertedIds = inserted?.map((row) => row.id) ?? [];

      if (insertedIds.length > 0) {
        const queuedEvents = await buildQueuedEvents(inserted, permitted, context, now.toISOString());
        const { error: eventError } = await supabase
          .from("copilot_action_events")
          .insert(queuedEvents);
        if (eventError) {
          console.error("[copilot-service] Failed to log queued events", eventError);
        }
      }
    }

    const queuedCount = insertedIds.length;
    const duplicateCount = permitted.length - queuedCount;
    const response: CopilotQueueResponse & { requestId: string } = {
      queued: shouldEnqueue ? queuedCount : 0,
      skipped: shouldEnqueue ? duplicateCount + denied.length : 0,
      actionIds: shouldEnqueue ? insertedIds : undefined,
      denied: shouldEnqueue
        ? denied.map(({ action, decision }) => ({
          action,
          reason: decision.reasons?.join("; ") ?? "Policy denied",
          missingRoles: decision.missingRoles,
        }))
        : undefined,
      evaluation,
      mode,
      requestId,
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[copilot-service] Unexpected error", error);
    return jsonResponse(
      { error: error?.message ?? "Internal error" },
      500,
    );
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeRequestedActions(
  actions: unknown[],
  context: { companyId: string; actorUserId: string; source: string; defaultQueuedAt: string },
): CopilotActionPayload[] {
  const normalized: CopilotActionPayload[] = [];

  for (const action of actions) {
    if (!action || typeof action !== "object") continue;

    const raw = action as Partial<CopilotActionPayload> & Record<string, unknown>;
    const dedupeKey = typeof raw.dedupeKey === "string" && raw.dedupeKey.length > 0
      ? raw.dedupeKey
      : crypto.randomUUID();

    normalized.push({
      companyId: context.companyId,
      actorUserId: context.actorUserId,
      source: typeof raw.source === "string" ? raw.source : context.source,
      dedupeKey,
      actionType: typeof raw.actionType === "string" ? raw.actionType : "coverage.gap",
      status: raw.status === "executing" || raw.status === "completed" || raw.status === "failed" || raw.status === "skipped"
        ? raw.status
        : "queued",
      target: raw.target as CopilotActionPayload["target"],
      payload: (raw.payload ?? {}) as Record<string, unknown>,
      evaluation: (raw.evaluation ?? {}) as Record<string, unknown>,
      metadata: {
        ...(raw.metadata as Record<string, unknown> | undefined),
        origin: (raw.metadata as Record<string, unknown> | undefined)?.origin ?? "copilot-service",
      },
      impacts: Array.isArray(raw.impacts) ? raw.impacts : [],
      notes: Array.isArray(raw.notes) ? (raw.notes as string[]) : [],
      confidence: typeof raw.confidence === "number" ? raw.confidence : 0.5,
      queuedAt: typeof raw.queuedAt === "string" ? raw.queuedAt : context.defaultQueuedAt,
    });
  }

  return normalized;
}

async function loadActorContext(client: SupabaseClient, companyId: string, actorUserId: string) {
  const { data: profile, error } = await client
    .from("profiles")
    .select("id, company_id, first_name, last_name, email, role")
    .eq("id", actorUserId)
    .single();

  if (error) {
    console.error("[copilot-service] Failed to load actor profile", error);
    throw new Error("Unable to load actor profile");
  }

  if (!profile || profile.company_id !== companyId) {
    throw new Error("Actor not found in company scope");
  }

  const { data: roleRows, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", actorUserId);

  if (roleError) {
    console.error("[copilot-service] Failed to load actor roles", roleError);
    throw new Error("Unable to load actor roles");
  }

  const roles = [
    ...(profile.role ? [profile.role] : []),
    ...(roleRows?.map((row) => row.role) ?? []),
  ].filter(Boolean);

  return {
    userId: actorUserId,
    companyId,
    roles,
    email: profile.email ?? undefined,
    displayName: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || undefined,
  };
}

function normalizeTimeframe(input?: CopilotContext["timeframe"]): CopilotContext["timeframe"] {
  if (input?.start && input?.end) {
    return {
      start: input.start,
      end: input.end,
      timezone: input.timezone,
      label: input.label ?? "custom",
    };
  }

  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: "last_7_days",
  };
}

async function evaluateCopilotContext(
  context: CopilotContext,
  actorUserId?: string,
): Promise<CopilotEvaluationResult> {
  const generatedAt = new Date().toISOString();
  const metrics = context.metrics ?? [];
  const normalizedSignals = context.signals && context.signals.length > 0
    ? context.signals
    : deriveSignalsFromMetrics(metrics);
  const recommendedActions = deriveRecommendedActions(metrics, context, actorUserId);
  const summary = buildSummary(normalizedSignals, context.timeframe);

  return {
    context: {
      ...context,
      signals: normalizedSignals,
    },
    summary,
    insights: normalizedSignals,
    recommendedActions,
    skippedActions: [],
    diagnostics: recommendedActions.length === 0
      ? [
        {
          level: "info",
          message: "No actionable recommendations were generated for this timeframe.",
        },
      ]
      : [],
    generatedAt,
  };
}

function buildCopilotRows(actions: CopilotActionPayload[], queuedAt: string) {
  return actions.map((action) => ({
    company_id: action.companyId,
    dedupe_key: action.dedupeKey,
    source: action.source,
    action_type: action.actionType,
    actor_user_id: action.actorUserId,
    actor_role: action.metadata?.actorRole ?? null,
    target_type: action.target?.type ?? null,
    target_ref: action.target?.id ?? action.target?.path ?? null,
    payload: action.payload ?? {},
    evaluation: action.evaluation ?? {},
    recommendation: {
      impacts: action.impacts ?? [],
      notes: action.notes ?? [],
    },
    status: action.status ?? "queued",
    priority: action.metadata?.priority ?? 5,
    queued_at: action.queuedAt ?? queuedAt,
    metadata: action.metadata ?? {},
    metrics: {
      impacts: action.impacts ?? [],
      confidence: action.confidence,
    },
  }));
}

async function buildQueuedEvents(
  inserted: Array<{ id: string; dedupe_key: string }>,
  actions: CopilotActionPayload[],
  context: CopilotContext,
  occurredAt: string,
) {
  const events = [];
  for (const row of inserted) {
    const action = actions.find((candidate) => candidate.dedupeKey === row.dedupe_key);
    if (!action) continue;

    events.push({
      company_id: context.companyId,
      copilot_action_id: row.id,
      dedupe_key: `${row.dedupe_key}::queued`,
      event_type: "queued",
      status: "info",
      payload: action,
      payload_hash: await hashPayload(action),
      actor_user_id: action.actorUserId,
      notes: "Action enqueued via copilot-service",
      occurred_at: occurredAt,
    });
  }
  return events;
}

async function hashPayload(payload: unknown) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload ?? {}));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeMetrics(raw: unknown): CopilotMetricSnapshot[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const metric =
        typeof (entry as Record<string, unknown>).metric === "string"
          ? (entry as Record<string, unknown>).metric as string
          : typeof (entry as Record<string, unknown>).label === "string"
            ? (entry as Record<string, unknown>).label as string
            : null;

      if (!metric) {
        return null;
      }

      const valueRaw = (entry as Record<string, unknown>).value;
      const changeRaw = (entry as Record<string, unknown>).change;
      const trendRaw = (entry as Record<string, unknown>).trend;
      const unitRaw = (entry as Record<string, unknown>).unit;
      const observedRaw = (entry as Record<string, unknown>).observedAt;

      const value = typeof valueRaw === "number" ? valueRaw : Number(valueRaw ?? 0);
      const change = typeof changeRaw === "number" ? changeRaw : Number(changeRaw ?? 0);
      const trend = trendRaw === "up" || trendRaw === "down" || trendRaw === "flat"
        ? trendRaw
        : change > 0
          ? "up"
          : change < 0
            ? "down"
            : "flat";
      const unit = typeof unitRaw === "string" ? unitRaw : undefined;
      const observedAt = typeof observedRaw === "string" ? observedRaw : new Date().toISOString();
      const metadata = typeof (entry as Record<string, unknown>).metadata === "object"
        ? (entry as Record<string, unknown>).metadata as Record<string, unknown>
        : undefined;

      return {
        metric,
        value,
        change,
        trend,
        unit,
        observedAt,
        metadata,
      };
    })
    .filter((value): value is CopilotMetricSnapshot => Boolean(value));
}

function sanitizeSignals(raw: unknown, metrics: CopilotMetricSnapshot[]): CopilotSignal[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return deriveSignalsFromMetrics(metrics);
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const severityRaw = (entry as Record<string, unknown>).severity;
      const severity: CopilotSignal["severity"] =
        severityRaw === "critical" || severityRaw === "warning" || severityRaw === "info"
          ? severityRaw
          : "info";
      const message =
        typeof (entry as Record<string, unknown>).message === "string"
          ? (entry as Record<string, unknown>).message as string
          : "Operational signal detected";
      const metric =
        typeof (entry as Record<string, unknown>).metric === "string"
          ? (entry as Record<string, unknown>).metric as string
          : undefined;
      const observedAt =
        typeof (entry as Record<string, unknown>).observedAt === "string"
          ? (entry as Record<string, unknown>).observedAt as string
          : undefined;
      const metadata = typeof (entry as Record<string, unknown>).metadata === "object"
        ? (entry as Record<string, unknown>).metadata as Record<string, unknown>
        : undefined;

      return {
        type: typeof (entry as Record<string, unknown>).type === "string"
          ? (entry as Record<string, unknown>).type as string
          : "kpi",
        severity,
        message,
        metric,
        observedAt,
        metadata,
      };
    })
    .filter((value): value is CopilotSignal => Boolean(value));
}

function deriveSignalsFromMetrics(metrics: CopilotMetricSnapshot[]): CopilotSignal[] {
  return metrics
    .filter((metric) => Math.abs(metric.change ?? 0) > 0)
    .slice(0, 8)
    .map((metric) => {
      const severity = Math.abs(metric.change ?? 0) >= 10
        ? "critical"
        : Math.abs(metric.change ?? 0) >= 5
          ? "warning"
          : "info";

      const direction = metric.change && metric.change < 0 ? "decreased" : "increased";
      const amount = Math.abs(metric.change ?? 0).toFixed(1);

      return {
        type: "kpi",
        severity,
        message: `${metric.metric} ${direction} by ${amount}${metric.unit ?? ""}`,
        metric: metric.metric,
        observedAt: metric.observedAt,
        metadata: {
          delta: metric.change ?? 0,
          value: metric.value,
          unit: metric.unit,
          confidence: severity === "critical" ? 0.9 : severity === "warning" ? 0.7 : 0.5,
        },
      };
    });
}

function deriveRecommendedActions(
  metrics: CopilotMetricSnapshot[],
  context: CopilotContext,
  actorUserId?: string,
): CopilotActionPayload[] {
  if (!actorUserId) {
    return [];
  }

  return metrics
    .filter((metric) => Math.abs(metric.change ?? 0) >= 1)
    .slice(0, 5)
    .map((metric, index) => {
      const change = metric.change ?? 0;
      const actionType = change < 0 ? "idea.action.correct" : "idea.action.amplify";
      const confidence =
        typeof metric.metadata?.confidence === "number"
          ? (metric.metadata.confidence as number)
          : change < 0
            ? 0.6
            : 0.55;
      return {
        companyId: context.companyId,
        actorUserId,
        source: context.source,
        dedupeKey: `${metric.metric}-${index}-${metric.observedAt}`,
        actionType,
        payload: {
          metric: metric.metric,
          observedAt: metric.observedAt,
          unit: metric.unit,
          change,
        },
        evaluation: {
          rationale: change < 0 ? "Metric trending downward" : "Metric trending upward",
        },
        metadata: {
          origin: "copilot-service",
        },
        impacts: [
          {
            metric: metric.metric,
            delta: change,
            unit: metric.unit,
            confidence,
          },
        ],
        confidence,
      };
    });
}

function buildSummary(signals: CopilotSignal[], timeframe: CopilotContext["timeframe"]) {
  if (signals.length === 0) {
    return `No major KPI shifts detected for ${timeframe.label ?? timeframe.end}.`;
  }

  const highlights = signals
    .slice(0, 2)
    .map((signal) => signal.message)
    .join("; ");

  return `${signals.length} KPI shifts detected for ${timeframe.label ?? timeframe.end}: ${highlights}.`;
}
