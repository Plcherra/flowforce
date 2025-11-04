import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[copilot-dispatcher] Missing Supabase environment configuration.");
}

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { persistSession: false },
});
type CopilotActionRow = {
  id: string;
  company_id: string;
  dedupe_key: string;
  source: string;
  action_type: string;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
  evaluation: Record<string, unknown>;
  metadata: Record<string, unknown>;
  metrics: Record<string, unknown>;
  priority: number;
  queued_at: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const scanStartedAt = performance.now();
  const requestId = crypto.randomUUID();

  try {
    const { data: queued, error: loadError } = await supabase
      .from("copilot_actions")
      .select("id, company_id, dedupe_key, source, action_type, actor_user_id, payload, evaluation, metadata, metrics, priority, queued_at")
      .eq("status", "queued")
      .order("priority", { ascending: true })
      .order("queued_at", { ascending: true })
      .limit(20);

    if (loadError) {
      console.error("[copilot-dispatcher] Failed to fetch queued actions", loadError);
      throw loadError;
    }

    const actions: CopilotActionRow[] = queued ?? [];
    const summary = { scanned: actions.length, executing: 0, completed: 0, failed: 0, skipped: 0 };

    for (const action of actions) {
      const lockResult = await supabase
        .from("copilot_actions")
        .update({
          status: "executing",
          dispatch_started_at: new Date().toISOString(),
        })
        .eq("id", action.id)
        .eq("status", "queued")
        .select("id")
        .single();

      if (lockResult.error) {
        summary.skipped += 1;
        continue;
      }

      summary.executing += 1;

      await logEvent(action.company_id, action.id, action.dedupe_key, "dispatch_started", "info", {
        source: action.source,
        actionType: action.action_type,
      }, action.actor_user_id);

      const startedAt = performance.now();

      try {
        const executionResult = await executeAction(action);
        const durationMs = Math.round(performance.now() - startedAt);

        await supabase
          .from("copilot_actions")
          .update({
            status: executionResult.status ?? "completed",
            completed_at: new Date().toISOString(),
            metrics: {
              ...(action.metrics ?? {}),
              lastExecution: executionResult.metrics ?? {},
              durationMs,
            },
            metadata: {
              ...(action.metadata ?? {}),
              lastRun: executionResult.metadata ?? {},
            },
          })
          .eq("id", action.id);

        summary.completed += 1;

        await logEvent(
          action.company_id,
          action.id,
          action.dedupe_key,
          "dispatch_completed",
          "success",
          {
            durationMs,
            outcome: executionResult,
          },
          action.actor_user_id,
        );
      } catch (error) {
        const durationMs = Math.round(performance.now() - startedAt);

        await supabase
          .from("copilot_actions")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            failure_reason: error?.message ?? "Dispatch failed",
            metrics: {
              ...(action.metrics ?? {}),
              durationMs,
            },
            metadata: {
              ...(action.metadata ?? {}),
              lastError: error?.message ?? "Dispatch failed",
            },
          })
          .eq("id", action.id);

        summary.failed += 1;

        await logEvent(
          action.company_id,
          action.id,
          action.dedupe_key,
          "dispatch_failed",
          "error",
          {
            durationMs,
            error: error?.message ?? "Dispatch failed",
          },
          action.actor_user_id,
        );
      }
    }

  return jsonResponse({
      requestId,
      scanDurationMs: Math.round(performance.now() - scanStartedAt),
      ...summary,
    });
  } catch (error) {
    console.error("[copilot-dispatcher] Unexpected error", error);
    return jsonResponse(
      {
        requestId,
        error: error?.message ?? "Internal error",
      },
      500,
    );
  }
});

const noopResult = (notes: string) => ({
  status: "completed" as const,
  metadata: { executedBy: "copilot-dispatcher" },
  metrics: { mode: "noop" },
  notes,
});

async function executeAction(action: CopilotActionRow) {
  switch (action.action_type) {
    case "task.create":
      return noopResult("Task creation handler not yet implemented; recorded as completed.");
    case "webhook.dispatch":
      return noopResult("Webhook dispatch handler not yet implemented; recorded as completed.");
    default:
      return noopResult(`No executor registered for ${action.action_type}; marked as completed.`);
  }
}

async function logEvent(
  companyId: string,
  actionId: string,
  dedupeKey: string,
  eventType: string,
  status: "info" | "success" | "warning" | "error",
  payload: Record<string, unknown>,
  actorUserId: string | null,
) {
  const occurredAt = new Date().toISOString();
  const payloadHash = await hashPayload(payload);

  const { error } = await supabase
    .from("copilot_action_events")
    .insert({
      company_id: companyId,
      copilot_action_id: actionId,
      dedupe_key: `${dedupeKey}::${eventType}`,
      event_type: eventType,
      status,
      payload,
      payload_hash: payloadHash,
      actor_user_id: actorUserId,
      occurred_at: occurredAt,
      notes: `Dispatcher recorded ${eventType}`,
    });

  if (error) {
    console.error("[copilot-dispatcher] Failed to log action event", { eventType, error });
  }
}

async function hashPayload(payload: unknown) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload ?? {}));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
