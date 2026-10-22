import { supabase } from "@/integrations/supabase/client";
import { OPERATIONS_AUTOMATION_SYSTEM_PROMPT } from "@/server/automation/prompts/operations";
import { serializeAutomationContext } from "@/server/automation/prompts/automationCommon";
import {
  validateAutomationScript,
  type AutomationScript,
} from "@/server/automation/validateScript";
import { serverEnv } from "@/lib/env";
import {
  createGrokChatCompletion,
  parseModelJson,
  readGrokRuntimeConfig,
} from "@/services/ai/grokProvider";
import { logger } from "@/utils/logger";

const grok = readGrokRuntimeConfig((name) =>
  name === "XAI_API_KEY" ? serverEnv.XAI_API_KEY : process.env[name],
);

type SupabaseLikeClient = {
  from: (table: string) => any;
};

export interface GenerateAutomationSuggestionInput {
  issueId: string;
  orgId: string;
  client?: SupabaseLikeClient;
}

export async function generateAutomationSuggestion({
  issueId,
  orgId,
  client = supabase,
}: GenerateAutomationSuggestionInput) {
  if (!grok.apiKey) {
    throw new Error("xAI key missing");
  }

  const { data: issue, error } = await client
    .from("ops_issues")
    .select("*")
    .eq("id", issueId)
    .eq("org_id", orgId)
    .single();

  if (error || !issue) {
    throw new Error("Issue not found");
  }

  const context = serializeAutomationContext({
    issueTitle: issue.title,
    issueDescription: issue.description,
    severity: issue.severity,
    kpiKey: issue.kpi_key,
  });

  const completion = await createGrokChatCompletion({
    apiKey: grok.apiKey,
    model: grok.model,
    reasoningEffort: grok.reasoningEffort,
    temperature: 0.2,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: OPERATIONS_AUTOMATION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Design an automation for the following context and return JSON only.\n${context}`,
      },
    ],
  });

  const text = completion.content || "{}";
  let parsed: AutomationScript | null = null;
  try {
    parsed = parseModelJson(text) as AutomationScript;
  } catch (parseError) {
    logger.error("[generateAutomationSuggestion] invalid JSON", {
      error: parseError,
      context: { text },
      tags: ["error"],
    });
    throw new Error("Automation generator returned invalid JSON");
  }

  if (!validateAutomationScript(parsed)) {
    throw new Error("Generated script failed schema validation");
  }

  const { data: suggestion, error: insertError } = await client
    .from("ops_automation_suggestions")
    .insert({
      org_id: orgId,
      issueid: issueId,
      suggestion_title: issue.title,
      suggestion_summary: `Automation for ${issue.issue_type ?? "ops"} (${issue.severity ?? "normal"})`,
      script: parsed,
      status: "pending",
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    suggestionId: suggestion.id,
    status: suggestion.status,
    script: parsed as AutomationScript,
  };
}
