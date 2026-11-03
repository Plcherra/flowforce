import {
  validateAutomationScript,
  type AutomationScript,
  type AutomationStep,
} from "./validateScript";

export const AUTOMATION_INSERT_ALLOWLIST: Record<string, readonly string[]> =
  {};

export const AUTOMATION_QUERY_RESOURCES = ["operations_hub"] as const;

export const AUTOMATION_NOTIFY_CHANNELS = ["operations"] as const;

const MAX_STEPS = 12;
const MAX_TITLE = 180;
const MAX_TEXT = 2000;
const BLOCKED_COLUMNS = new Set([
  "company_id",
  "org_id",
  "id",
  "user_id",
  "actor_id",
]);

export type PlannedEffect =
  | { kind: "context"; key: string; resource: string }
  | {
      kind: "create_task";
      key: string;
      title: string;
      description: string | null;
      dueDate: string | null;
    }
  | { kind: "notify"; key: string; message: string; title: string }
  | {
      kind: "db_insert";
      key: string;
      table: string;
      values: Record<string, string | number | boolean | null>;
    };

export type PlannedStep = {
  key: string;
  type: string;
  status: "ready" | "rejected";
  message: string;
};

export type AutomationPlanResult = {
  ok: boolean;
  effects: PlannedEffect[];
  steps: PlannedStep[];
  error: string | null;
};

function clip(value: string, max: number): string {
  const text = value.trim();
  return text.length > max ? text.slice(0, max) : text;
}

function dueDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})$/.exec(value.trim().slice(0, 10));
  return match?.[1] ?? null;
}

function scalar(
  value: unknown,
): string | number | boolean | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  return undefined;
}

function planStep(
  step: AutomationStep,
  script: AutomationScript,
  allowlist: Record<string, readonly string[]>,
): { ok: true; effect: PlannedEffect | null; message: string } | { ok: false; message: string } {
  const key = typeof step.key === "string" && step.key.trim() ? step.key : step.type;

  if (step.type === "query") {
    if (
      !AUTOMATION_QUERY_RESOURCES.includes(
        step.resource as (typeof AUTOMATION_QUERY_RESOURCES)[number],
      )
    ) {
      return { ok: false, message: "query_not_allowlisted" };
    }
    return {
      ok: true,
      message: "recorded",
      effect: { kind: "context", key, resource: step.resource },
    };
  }

  if (step.type === "create_task") {
    const title = clip(step.payload?.title ?? "", MAX_TITLE);
    if (!title) return { ok: false, message: "task_title_required" };
    const description = step.payload?.description
      ? clip(step.payload.description, MAX_TEXT)
      : null;
    return {
      ok: true,
      message: "task",
      effect: {
        kind: "create_task",
        key,
        title,
        description,
        dueDate: dueDate(step.payload?.due),
      },
    };
  }

  if (step.type === "notify") {
    if (
      !AUTOMATION_NOTIFY_CHANNELS.includes(
        step.channel as (typeof AUTOMATION_NOTIFY_CHANNELS)[number],
      )
    ) {
      return { ok: false, message: "notify_channel_rejected" };
    }
    const message = clip(step.message ?? "", MAX_TEXT);
    if (!message) return { ok: false, message: "notify_message_required" };
    return {
      ok: true,
      message: "notify",
      effect: {
        kind: "notify",
        key,
        message,
        title: clip(script.meta.name || "Operations automation", MAX_TITLE),
      },
    };
  }

  if (step.type === "branch") {
    return { ok: false, message: "branch_not_supported" };
  }

  if (step.type === "db_insert") {
    const columns = allowlist[step.target];
    if (!columns || columns.length === 0) {
      return { ok: false, message: "insert_not_allowlisted" };
    }
    const values: Record<string, string | number | boolean | null> = {};
    for (const column of columns) {
      if (BLOCKED_COLUMNS.has(column)) continue;
      if (!(column in step.values)) continue;
      const next = scalar(step.values[column]);
      if (next === undefined) return { ok: false, message: "insert_value_rejected" };
      values[column] = next;
    }
    return {
      ok: true,
      message: "insert",
      effect: { kind: "db_insert", key, table: step.target, values },
    };
  }

  return { ok: false, message: "step_not_supported" };
}

export function planAutomationScript(
  payload: unknown,
  allowlist: Record<string, readonly string[]> = AUTOMATION_INSERT_ALLOWLIST,
): AutomationPlanResult {
  if (!validateAutomationScript(payload)) {
    return { ok: false, error: "invalid_script", effects: [], steps: [] };
  }
  const script = payload;
  if (script.steps.length > MAX_STEPS) {
    return { ok: false, error: "too_many_steps", effects: [], steps: [] };
  }

  const effects: PlannedEffect[] = [];
  const steps: PlannedStep[] = [];
  for (const step of script.steps) {
    const planned = planStep(step, script, allowlist);
    steps.push({
      key: typeof step.key === "string" ? step.key : step.type,
      type: step.type,
      status: planned.ok ? "ready" : "rejected",
      message: planned.message,
    });
    if (!planned.ok) {
      return { ok: false, error: planned.message, effects, steps };
    }
    if (planned.effect) effects.push(planned.effect);
  }

  return { ok: true, effects, steps, error: null };
}
