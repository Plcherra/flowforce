export interface AutomationScript {
  version: "1.0";
  meta: {
    name: string;
    description?: string;
  };
  steps: AutomationStep[];
}

export type AutomationStep =
  | QueryStep
  | CreateTaskStep
  | NotifyStep
  | BranchStep
  | DbInsertStep;

export interface QueryStep {
  key: string;
  type: "query";
  resource: string;
  params?: Record<string, unknown>;
  save_as?: string;
}

export interface CreateTaskStep {
  key: string;
  type: "create_task";
  payload: {
    title: string;
    description?: string;
    assignee_role?: string;
    due?: string;
  };
}

export interface NotifyStep {
  key: string;
  type: "notify";
  channel: string;
  message: string;
}

export interface BranchStep {
  key: string;
  type: "branch";
  condition: string;
  then: string[];
  else: string[];
}

export interface DbInsertStep {
  key: string;
  type: "db_insert";
  target: string;
  values: Record<string, unknown>;
}

export function validateAutomationScript(
  payload: unknown,
): payload is AutomationScript {
  if (typeof payload !== "object" || payload === null) return false;
  const script = payload as AutomationScript;
  if (script.version !== "1.0") return false;
  if (!script.meta || typeof script.meta.name !== "string") return false;
  if (!Array.isArray(script.steps) || script.steps.length === 0) return false;
  return script.steps.every(validateStep);
}

function validateStep(step: AutomationStep): boolean {
  switch (step.type) {
    case "query":
      return typeof step.resource === "string";
    case "create_task":
      return Boolean(step.payload?.title);
    case "notify":
      return (
        typeof step.channel === "string" && typeof step.message === "string"
      );
    case "branch":
      return (
        Boolean(step.condition) &&
        Array.isArray(step.then) &&
        Array.isArray(step.else)
      );
    case "db_insert":
      return typeof step.target === "string" && typeof step.values === "object";
    default:
      return false;
  }
}
