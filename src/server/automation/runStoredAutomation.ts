import { planAutomationScript, type PlannedEffect, type PlannedStep } from "./automationScriptPlan";

export type AutomationRunCode =
  | "ran"
  | "already_active"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unsupported"
  | "storage_unavailable"
  | "run_failed";

export type AutomationRunResult = {
  code: AutomationRunCode;
  runId?: string;
  taskIds?: string[];
};

type SuggestionRow = {
  id: string;
  status: string | null;
  script: unknown;
  suggestion_title: string | null;
};

export type AutomationAdmin = {
  from: (table: string) => any;
};

type DbError = { message?: string; code?: string } | null;

function missingRelation(error: DbError): boolean {
  if (!error) return false;
  const message = `${error.code ?? ""} ${error.message ?? ""}`;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|schema cache|Could not find the table/i.test(message)
  );
}

async function claimSuggestion(
  admin: AutomationAdmin,
  suggestionId: string,
  companyId: string,
  statuses: Array<string | null>,
): Promise<{ data: SuggestionRow | null; error: DbError }> {
  let query = admin
    .from("ops_automation_suggestions")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .eq("company_id", companyId);
  const concrete = statuses.filter((status): status is string => status != null);
  if (statuses.includes(null) && concrete.length === 0) {
    query = query.is("status", null);
  } else {
    query = query.in("status", concrete);
  }
  return query
    .select("id, status, script, suggestion_title")
    .maybeSingle();
}

async function loadSuggestion(
  admin: AutomationAdmin,
  suggestionId: string,
  companyId: string,
): Promise<{ data: SuggestionRow | null; error: DbError }> {
  return admin
    .from("ops_automation_suggestions")
    .select("id, status, script, suggestion_title")
    .eq("id", suggestionId)
    .eq("company_id", companyId)
    .maybeSingle();
}

async function setSuggestionStatus(
  admin: AutomationAdmin,
  suggestionId: string,
  companyId: string,
  status: string,
) {
  const result = await admin
    .from("ops_automation_suggestions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .eq("company_id", companyId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (result.error || !result.data?.id) {
    throw new Error(result.error?.message ?? "status_update_failed");
  }
}

export async function runStoredAutomation(
  admin: AutomationAdmin,
  input: { suggestionId: string; companyId: string; actorId: string },
): Promise<AutomationRunResult> {
  const claimed = await claimSuggestion(admin, input.suggestionId, input.companyId, [
    "pending",
    "proposed",
  ]);
  let suggestion = claimed.data;
  if (!suggestion) {
    const nullClaim = await claimSuggestion(admin, input.suggestionId, input.companyId, [
      null,
    ]);
    suggestion = nullClaim.data;
  }
  if (!suggestion) {
    const existing = await loadSuggestion(admin, input.suggestionId, input.companyId);
    if (existing.error && missingRelation(existing.error)) {
      return { code: "storage_unavailable" };
    }
    if (!existing.data) return { code: "not_found" };
    if (existing.data.status === "active" || existing.data.status === "applied") {
      return { code: "already_active" };
    }
    if (existing.data.status === "running") return { code: "conflict" };
    return { code: "conflict" };
  }

  const plan = planAutomationScript(suggestion.script);
  const planError = plan.error;
  const runInsert = await admin
    .from("ops_automation_runs")
    .insert({
      company_id: input.companyId,
      suggestion_id: input.suggestionId,
      actor_id: input.actorId,
      status: plan.ok ? "running" : "rejected",
      error: planError,
      finished_at: plan.ok ? null : new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (runInsert.error || !runInsert.data?.id) {
    await setSuggestionStatus(admin, input.suggestionId, input.companyId, "pending");
    return { code: "storage_unavailable" };
  }

  const runId = String(runInsert.data.id);
  if (!plan.ok) {
    await writeSteps(admin, input.companyId, runId, plan.steps);
    await setSuggestionStatus(admin, input.suggestionId, input.companyId, "pending");
    return { code: "unsupported", runId };
  }

  const taskIds: string[] = [];
  const notificationIds: string[] = [];
  try {
    for (const effect of plan.effects) {
      if (effect.kind === "create_task") {
        const created = await admin
          .from("tasks")
          .insert({
            company_id: input.companyId,
            created_by: input.actorId,
            title: effect.title,
            description: effect.description,
            due_date: effect.dueDate,
            status: "todo",
            priority: "medium",
            source: "operations_automation",
          })
          .select("id")
          .single();
        if (created.error || !created.data?.id) {
          throw new Error(created.error?.message ?? "task_insert_failed");
        }
        taskIds.push(String(created.data.id));
      }
      if (effect.kind === "notify") {
        const noted = await admin
          .from("task_notifications")
          .insert({
            company_id: input.companyId,
            user_id: input.actorId,
            task_id: taskIds[0] ?? null,
            title: effect.title,
            message: effect.message,
            type: "operations_automation",
            metadata: { suggestion_id: input.suggestionId, run_id: runId },
          })
          .select("id")
          .maybeSingle();
        if (noted.error || !noted.data?.id) {
          throw new Error(noted.error?.message ?? "notify_failed");
        }
        notificationIds.push(String(noted.data.id));
      }
      if (effect.kind === "db_insert") {
        const inserted = await admin.from(effect.table).insert({
          ...effect.values,
          company_id: input.companyId,
        });
        if (inserted.error) throw new Error(inserted.error.message ?? "insert_failed");
      }
    }
    await finish(admin, runId, input.companyId, "succeeded", null);
    await writeSteps(admin, input.companyId, runId, plan.steps);
    await setSuggestionStatus(admin, input.suggestionId, input.companyId, "active");
    return { code: "ran", runId, taskIds };
  } catch (error) {
    await compensate(admin, input.companyId, taskIds, notificationIds);
    await finish(
      admin,
      runId,
      input.companyId,
      "failed",
      error instanceof Error ? error.message : "run_failed",
    );
    await writeSteps(admin, input.companyId, runId, failedSteps(plan.effects, plan.steps));
    try {
      await setSuggestionStatus(admin, input.suggestionId, input.companyId, "pending");
    } catch {
      // The failed run row remains for the company to read.
    }
    return { code: "run_failed", runId };
  }
}

function failedSteps(effects: PlannedEffect[], steps: PlannedStep[]): PlannedStep[] {
  const failedKey = effects[0]?.key;
  return steps.map((step) =>
    step.key === failedKey ? { ...step, status: "rejected", message: "run_failed" } : step,
  );
}

async function finish(
  admin: AutomationAdmin,
  runId: string,
  companyId: string,
  status: string,
  error: string | null,
) {
  await admin
    .from("ops_automation_runs")
    .update({
      status,
      error,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("company_id", companyId);
}

async function writeSteps(
  admin: AutomationAdmin,
  companyId: string,
  runId: string,
  steps: PlannedStep[],
) {
  if (steps.length === 0) return;
  await admin.from("ops_automation_run_steps").insert(
    steps.map((step) => ({
      company_id: companyId,
      run_id: runId,
      step_key: step.key,
      step_type: step.type,
      status: step.status === "ready" ? "succeeded" : "rejected",
      message: step.message,
    })),
  );
}

async function compensate(
  admin: AutomationAdmin,
  companyId: string,
  taskIds: string[],
  notificationIds: string[],
) {
  for (const notificationId of notificationIds) {
    await admin
      .from("task_notifications")
      .delete()
      .eq("id", notificationId)
      .eq("company_id", companyId);
  }
  for (const taskId of taskIds) {
    await admin.from("tasks").delete().eq("id", taskId).eq("company_id", companyId);
  }
}
