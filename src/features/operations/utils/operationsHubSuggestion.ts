import {
  validateAutomationScript,
  type AutomationScript,
} from "@/server/automation/validateScript";
import type { HubKpiKey } from "./operationsHubMetrics";

export const OPS_SUGGESTIONS_CHANGED = "flowforce:ops-suggestions-changed";

export function notifyOperationsSuggestionsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPS_SUGGESTIONS_CHANGED));
}

export type OperationsSuggestionDraft = {
  suggestion_title: string;
  suggestion_summary: string;
  status: "pending";
  script: AutomationScript;
};

export function buildOperationsSuggestion(input: {
  kpiKey: HubKpiKey;
  title: string;
  summary: string;
  valueLabel: string;
}): OperationsSuggestionDraft {
  const script: AutomationScript = {
    version: "1.0",
    meta: {
      name: input.title,
      description: input.summary,
    },
    steps: [
      {
        key: "context",
        type: "query",
        resource: "operations_hub",
        params: {
          kpiKey: input.kpiKey,
          value: input.valueLabel,
        },
      },
      {
        key: "review",
        type: "create_task",
        payload: {
          title: input.title,
          description: input.summary,
          assignee_role: "manager",
        },
      },
      {
        key: "notify",
        type: "notify",
        channel: "operations",
        message: input.summary,
      },
    ],
  };

  if (!validateAutomationScript(script)) {
    throw new Error("Operations suggestion script is invalid");
  }

  return {
    suggestion_title: input.title,
    suggestion_summary: input.summary,
    status: "pending",
    script,
  };
}
